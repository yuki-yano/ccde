import { $ } from "@david/dax";
import { TmuxWindow, ClaudeSession } from '../tui-types.ts';

export async function getTmuxWindows(): Promise<TmuxWindow[]> {
  try {
    // Check if we're in a tmux session
    const sessionResult = await $`tmux display-message -p "#{session_name}"`.text().catch(() => '');
    if (!sessionResult.trim()) {
      return [];
    }

    const result = await $`tmux list-windows -F "#{window_id}|#{window_name}|#{window_active}|#{window_panes}"`.text();
    const windows: TmuxWindow[] = [];
    
    for (const line of result.split('\n').filter(Boolean)) {
      const [id, name, active, paneCount] = line.split('|');
      windows.push({
        id: id.trim(),
        name: name.trim(),
        active: active === '1',
        paneCount: parseInt(paneCount, 10) || 1,
      });
    }
    
    return windows;
  } catch (error) {
    // Not in tmux session or tmux not available
    return [];
  }
}

export async function getClaudeSessions(): Promise<ClaudeSession[]> {
  try {
    // Look for claude processes
    const result = await $`pgrep -f claude`.text().catch(() => '');
    const pids = result.split('\n').filter(Boolean);
    
    const sessions: ClaudeSession[] = [];
    
    for (const pid of pids) {
      // Try to find which tmux window this process belongs to
      try {
        const windowResult = await $`tmux list-panes -a -F "#{pane_pid}|#{window_id}" | grep ${pid}`.text().catch(() => '');
        const [, windowId] = windowResult.split('|');
        
        if (windowId) {
          sessions.push({
            id: `claude-${pid}`,
            windowId: windowId.trim(),
            status: 'running',
            pid: parseInt(pid, 10),
          });
        }
      } catch {
        // Process might not be in tmux
      }
    }
    
    return sessions;
  } catch (error) {
    console.error('Failed to get claude sessions:', error);
    return [];
  }
}

export async function createTmuxWindow(name: string): Promise<boolean> {
  try {
    await $`tmux new-window -n "${name}"`;
    return true;
  } catch (error) {
    console.error('Failed to create tmux window:', error);
    return false;
  }
}

export async function closeTmuxWindow(windowId: string): Promise<boolean> {
  try {
    await $`tmux kill-window -t ${windowId}`;
    return true;
  } catch (error) {
    console.error('Failed to close tmux window:', error);
    return false;
  }
}

export async function startClaudeSession(windowId: string): Promise<boolean> {
  try {
    await $`tmux send-keys -t ${windowId} "claude" Enter`;
    return true;
  } catch (error) {
    console.error('Failed to start claude session:', error);
    return false;
  }
}