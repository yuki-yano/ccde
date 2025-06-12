import { $ } from "@david/dax";
import type { ClaudeSession, TmuxWindow } from "../tui-types.ts";
import type { LayoutConfig } from "../types.ts";

export const getTmuxWindows = async (): Promise<TmuxWindow[]> => {
  try {
    // Check if we're in a tmux session
    const sessionResult = await $`tmux display-message -p "#{session_name}"`
      .text()
      .catch(() => "");
    if (!sessionResult.trim()) {
      return [];
    }

    const result =
      await $`tmux list-windows -F "#{window_id}|#{window_name}|#{window_active}|#{window_panes}"`.text();
    const windows: TmuxWindow[] = [];

    for (const line of result.split("\n").filter(Boolean)) {
      const [id, name, active, paneCount] = line.split("|");
      windows.push({
        id: id.trim(),
        name: name.trim(),
        active: active === "1",
        paneCount: parseInt(paneCount, 10) || 1,
      });
    }

    return windows;
  } catch {
    // Not in tmux session or tmux not available
    return [];
  }
};

export const getClaudeSessions = async (): Promise<ClaudeSession[]> => {
  try {
    // Look for claude processes
    const result = await $`pgrep -f claude`.text().catch(() => "");
    const pids = result.split("\n").filter(Boolean);

    const sessions: ClaudeSession[] = [];

    for (const pid of pids) {
      // Try to find which tmux window this process belongs to
      try {
        const windowResult =
          await $`tmux list-panes -a -F "#{pane_pid}|#{window_id}" | grep ${pid}`
            .text()
            .catch(() => "");
        const [, windowId] = windowResult.split("|");

        if (windowId) {
          sessions.push({
            id: `claude-${pid}`,
            windowId: windowId.trim(),
            status: "running",
            pid: parseInt(pid, 10),
          });
        }
      } catch {
        // Process might not be in tmux
      }
    }

    return sessions;
  } catch (error) {
    console.error("Failed to get claude sessions:", error);
    return [];
  }
};

export const createTmuxWindow = async (name: string): Promise<boolean> => {
  try {
    await $`tmux new-window -n "${name}"`;
    return true;
  } catch (error) {
    console.error("Failed to create tmux window:", error);
    return false;
  }
};

export const closeTmuxWindow = async (windowId: string): Promise<boolean> => {
  try {
    await $`tmux kill-window -t ${windowId}`;
    return true;
  } catch (error) {
    console.error("Failed to close tmux window:", error);
    return false;
  }
};

export const startClaudeSession = async (
  windowId: string,
): Promise<boolean> => {
  try {
    await $`tmux send-keys -t ${windowId} "claude" Enter`;
    return true;
  } catch (error) {
    console.error("Failed to start claude session:", error);
    return false;
  }
};

export const createOrSwitchToWorktreeWindow = async (
  worktreePath: string,
  branchName: string,
): Promise<boolean> => {
  try {
    // Check if we're in a tmux session
    const sessionResult = await $`tmux display-message -p "#{session_name}"`
      .stdout("piped")
      .stderr("piped")
      .noThrow();

    if (sessionResult.code !== 0 || !sessionResult.stdout.trim()) {
      console.error("Not in a tmux session");
      return false;
    }

    // Check if window with this branch name already exists
    const windows = await getTmuxWindows();
    const existingWindow = windows.find((w) => w.name === branchName);

    if (existingWindow) {
      // Window exists, switch to it
      const switchResult = await $`tmux select-window -t ${existingWindow.id}`
        .stdout("piped")
        .stderr("piped")
        .noThrow();
      return switchResult.code === 0;
    }

    // Try to load configuration for this worktree
    const { getWorktreeConfig } = await import("./config.ts");
    const config = await getWorktreeConfig(branchName);

    if (config) {
      // Create window with layout configuration
      return await createWindowWithLayout(worktreePath, branchName, config);
    } else {
      // Create simple window with branch name in the worktree directory
      // Use absolute path directly with -c option (similar to tmux config: new-window -c "#{pane_current_path}")
      const createResult =
        await $`tmux new-window -n ${branchName} -c ${worktreePath}`
          .stdout("piped")
          .stderr("piped")
          .noThrow();
      return createResult.code === 0;
    }
  } catch (error) {
    console.error("Failed to create or switch to worktree window:", error);
    return false;
  }
};

const createWindowWithLayout = async (
  worktreePath: string,
  branchName: string,
  config: LayoutConfig,
): Promise<boolean> => {
  try {
    const { generateTmuxCommands } = await import("../tmux.ts");

    // Generate and execute tmux commands for the layout
    const commands = generateTmuxCommands(config, worktreePath, branchName);

    // Execute all commands as a batch using tmux's semicolon syntax
    const batchCommand = commands
      .map((cmd) => {
        let processedCommand = cmd.command.replace("tmux ", "");

        // Handle send-keys commands to add pane target dynamically
        if (cmd.command.includes("send-keys")) {
          // Find the corresponding pane based on the command and context
          let targetPaneNumber = "1"; // Default fallback

          // Look for the command in pane configurations to find the correct target
          const currentCommandIndex = commands.indexOf(cmd);

          // Search backwards from current command to find the most recent select-pane -t command
          for (let i = currentCommandIndex - 1; i >= 0; i--) {
            const prevCmd = commands[i];
            if (
              prevCmd.command.includes("select-pane -t") &&
              !prevCmd.command.includes("-T")
            ) {
              const paneMatch = prevCmd.command.match(/select-pane -t (\d+)/);
              if (paneMatch) {
                targetPaneNumber = paneMatch[1];
                break;
              }
            }
          }

          processedCommand = processedCommand.replace(
            "send-keys",
            `send-keys -t ${targetPaneNumber}`,
          );
        }

        return processedCommand;
      })
      .join(" \\; ");

    try {
      // Execute the batch command using shell
      const shellCommand = `tmux ${batchCommand}`;
      const result = await $`sh -c ${shellCommand}`
        .stdout("piped")
        .stderr("piped")
        .noThrow();
      if (result.code !== 0) {
        console.error(
          `Failed to execute batch tmux command, stderr: ${result.stderr}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(`Error executing batch tmux command:`, error);
      return false;
    }
  } catch (error) {
    console.error("Failed to create window with layout:", error);
    return false;
  }
};
