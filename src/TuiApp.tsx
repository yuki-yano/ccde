import type React from "react";
import { useEffect, useState } from "react";
import { Box, useApp, useInput, useStdout } from "ink";
import { Header } from "./components/Header.tsx";
import { WorktreeList } from "./components/WorktreeList.tsx";
import { TmuxWindowList } from "./components/TmuxWindowList.tsx";
import { ClaudeSessionList } from "./components/ClaudeSessionList.tsx";
import { ActionBar } from "./components/ActionBar.tsx";
import { InputForm } from "./components/InputForm.tsx";
import { BranchSelector } from "./components/BranchSelector.tsx";
import { HelpModal } from "./components/HelpModal.tsx";
import { ConfirmDialog } from "./components/ConfirmDialog.tsx";
import type { AppState, ClaudeSession, TmuxWindow, Worktree } from "./tui-types.ts";
import {
  createWorktree,
  getBranches,
  getDefaultBranch,
  getWorktrees,
  isDefaultBranch,
  isInMainDirectory,
  migrateToWorktreeStructure,
  removeWorktree,
} from "./utils/git.ts";
import {
  closeTmuxWindow,
  createOrSwitchToWorktreeWindow,
  createTmuxWindow,
  getClaudeSessions,
  getTmuxWindows,
  startClaudeSession,
} from "./utils/tmux.ts";

export const TuiApp: React.FC = () => {
  const { exit } = useApp();
  const { write } = useStdout();
  const [state, setState] = useState<AppState>({
    worktrees: [],
    tmuxWindows: [],
    claudeSessions: [],
    activePanel: "worktrees",
    selectedIndex: 0,
    inputMode: {
      active: false,
      type: null,
      title: "",
      placeholder: "",
    },
    branchSelector: {
      active: false,
      branches: [],
      existingWorktreeBranches: [],
      title: "",
    },
    showHelp: false,
    confirmDialog: {
      active: false,
      title: "",
      message: "",
      onConfirm: null,
    },
  });
  const [hasCheckedInitialSetup, setHasCheckedInitialSetup] = useState(false);

  const loadData = async () => {
    try {
      const [worktrees, windows, sessions] = await Promise.all([
        getWorktrees(),
        getTmuxWindows(),
        getClaudeSessions(),
      ]);

      setState((prev) => ({
        ...prev,
        worktrees,
        tmuxWindows: windows,
        claudeSessions: sessions,
      }));

      // Check if we need to show initial setup dialog
      if (!hasCheckedInitialSetup) {
        await checkInitialSetup(worktrees);
        setHasCheckedInitialSetup(true);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const checkInitialSetup = async (worktrees: Worktree[]) => {
    try {
      const defaultBranch = await getDefaultBranch();
      const hasDefaultWorktree = worktrees.some((wt) => isDefaultBranch(wt, defaultBranch));
      const inMainDir = await isInMainDirectory();

      // Check if we should offer migration to worktree structure
      if (inMainDir && !hasDefaultWorktree) {
        // User is in main directory and no default branch worktree - offer migration
        // Clear screen before showing modal
        write("\x1b[2J\x1b[H");

        const message =
          `You're currently in the main repository directory. To avoid git warnings and unify worktree management, would you like to create a worktree for the default branch "${defaultBranch}"?\n\nThis will create a new worktree at ccde_worktrees/ccde_${defaultBranch} where you can continue development.`;

        setState((prev) => ({
          ...prev,
          confirmDialog: {
            active: true,
            title: "Migrate to Worktree Structure",
            message,
            onConfirm: async () => {
              await handleMigration();
              handleCloseConfirmDialog();
            },
            errorOnly: false,
          },
        }));
        return;
      }

      // If not in main directory but no default worktree, show simplified setup dialog
      if (!inMainDir && !hasDefaultWorktree) {
        // Clear screen before showing modal
        write("\x1b[2J\x1b[H");

        setState((prev) => ({
          ...prev,
          confirmDialog: {
            active: true,
            title: "Setup Default Branch Worktree",
            message:
              `No worktree found for the default branch "${defaultBranch}". Would you like to create one at ccde_worktrees/ccde_${defaultBranch}? This will help avoid git warnings when working with worktrees.`,
            onConfirm: async () => {
              await createDefaultBranchWorktree(defaultBranch);
              handleCloseConfirmDialog();
            },
            errorOnly: false,
          },
        }));
      }
    } catch (error) {
      console.error("Failed to check initial setup:", error);
    }
  };

  const handleMigration = async () => {
    try {
      const result = await migrateToWorktreeStructure();

      // Clear screen before showing result
      write("\x1b[2J\x1b[H");

      setState((prev) => ({
        ...prev,
        confirmDialog: {
          active: true,
          title: result.success ? "Migration Successful" : "Migration Failed",
          message: result.message,
          onConfirm: handleCloseConfirmDialog,
          errorOnly: !result.success,
        },
      }));

      if (result.success) {
        await loadData(); // Refresh data
      }
    } catch (error) {
      // Clear screen before showing error
      write("\x1b[2J\x1b[H");

      setState((prev) => ({
        ...prev,
        confirmDialog: {
          active: true,
          title: "Migration Error",
          message: `An error occurred during migration: ${error instanceof Error ? error.message : String(error)}`,
          onConfirm: handleCloseConfirmDialog,
          errorOnly: true,
        },
      }));
    }
  };

  const createDefaultBranchWorktree = async (defaultBranch: string) => {
    try {
      const worktreeName = `ccde_${defaultBranch}`;
      const success = await createWorktree(worktreeName, defaultBranch);
      if (success) {
        await loadData(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to create default branch worktree:", error);
    }
  };

  useEffect(() => {
    // Clear screen on startup
    write("\x1b[2J\x1b[H");
    loadData();

    // Clear screen on cleanup (exit)
    return () => {
      write("\x1b[2J\x1b[H\x1b[3J");
    };
  }, []);

  const getCurrentList = () => {
    switch (state.activePanel) {
      case "worktrees":
        return state.worktrees;
      case "windows":
        return state.tmuxWindows;
      case "claude":
        return state.claudeSessions;
      default:
        return [];
    }
  };

  const getMaxIndex = () => Math.max(0, getCurrentList().length - 1);

  useInput((input, key) => {
    // If input mode, branch selector, or confirm dialog is active, don't handle main navigation
    if (
      state.inputMode.active ||
      state.branchSelector.active ||
      state.confirmDialog.active
    ) {
      return;
    }

    // Handle help modal
    if (state.showHelp) {
      if (key.escape || input === "q" || input === "h" || input === "?") {
        setState((prev) => ({ ...prev, showHelp: false }));
      }
      return;
    }

    // Quit
    if (input === "q") {
      write("\x1b[2J\x1b[H\x1b[3J");
      exit();
      return;
    }

    // Panel switching
    if (key.tab) {
      setState((prev) => {
        const panels: Array<AppState["activePanel"]> = [
          "worktrees",
          "windows",
          "claude",
        ];
        const currentIndex = panels.indexOf(prev.activePanel);
        const nextIndex = (currentIndex + 1) % panels.length;
        return {
          ...prev,
          activePanel: panels[nextIndex],
          selectedIndex: 0,
        };
      });
      return;
    }

    // Movement - Arrow keys
    if (key.upArrow) {
      setState((prev) => ({
        ...prev,
        selectedIndex: Math.max(0, prev.selectedIndex - 1),
      }));
      return;
    }

    if (key.downArrow) {
      setState((prev) => ({
        ...prev,
        selectedIndex: Math.min(getMaxIndex(), prev.selectedIndex + 1),
      }));
      return;
    }

    // Movement - Vim-like keys (j/k)
    if (input === "j") {
      setState((prev) => ({
        ...prev,
        selectedIndex: Math.min(getMaxIndex(), prev.selectedIndex + 1),
      }));
      return;
    }

    if (input === "k") {
      setState((prev) => ({
        ...prev,
        selectedIndex: Math.max(0, prev.selectedIndex - 1),
      }));
      return;
    }

    // Movement - Ctrl+n/Ctrl+p (Emacs-like)
    if (key.ctrl && input === "n") {
      setState((prev) => ({
        ...prev,
        selectedIndex: Math.min(getMaxIndex(), prev.selectedIndex + 1),
      }));
      return;
    }

    if (key.ctrl && input === "p") {
      setState((prev) => ({
        ...prev,
        selectedIndex: Math.max(0, prev.selectedIndex - 1),
      }));
      return;
    }

    // First/Last navigation
    if (input === "g") {
      setState((prev) => ({
        ...prev,
        selectedIndex: 0,
      }));
      return;
    }

    if (input === "G") {
      setState((prev) => ({
        ...prev,
        selectedIndex: getMaxIndex(),
      }));
      return;
    }

    // Actions - Create worktree (new branch or existing)
    if (input === "c") {
      handleCreateItem();
      return;
    }

    if (input === "d") {
      handleDeleteItem();
      return;
    }

    // Select/Enter
    if (key.return || input === " ") {
      handleSelectItem();
      return;
    }

    // Reload
    if (input === "r") {
      loadData();
      return;
    }

    // Help
    if (input === "?" || input === "h") {
      handleShowHelp();
      return;
    }
  });


  const handleCreateItem = async () => {
    // Clear screen before showing modal
    write("\x1b[2J\x1b[H");

    switch (state.activePanel) {
      case "worktrees": {
        // Get all branches and existing worktree branches
        const allBranches = await getBranches();
        const existingWorktreeBranches = new Set(
          state.worktrees.map(wt => {
            // Handle ccde_ prefixed worktrees for default branch
            if (wt.name.startsWith('ccde_')) {
              return wt.name.replace('ccde_', '');
            }
            return wt.name;
          })
        );

        setState((prev) => ({
          ...prev,
          branchSelector: {
            active: true,
            branches: allBranches,
            existingWorktreeBranches: Array.from(existingWorktreeBranches),
            title: "Create Worktree",
          },
        }));
        break;
      }
      case "windows":
        // Same as new for windows
        setState((prev) => ({
          ...prev,
          inputMode: {
            active: true,
            type: "window",
            title: "Create New Window",
            placeholder: "Enter window name",
          },
        }));
        break;
      case "claude": {
        if (state.tmuxWindows.length > 0) {
          const window = state.tmuxWindows[state.selectedIndex] || state.tmuxWindows[0];
          handleStartClaude(window.id);
        }
        break;
      }
    }
  };

  const handleDeleteItem = async () => {
    const currentList = getCurrentList();
    if (currentList.length === 0) return;

    const selectedItem = currentList[state.selectedIndex];
    if (!selectedItem) return;

    let title = "";
    let message = "";
    let onConfirm: () => void;

    switch (state.activePanel) {
      case "worktrees": {
        // Check if this is the default branch worktree
        const defaultBranch = await getDefaultBranch();
        const worktreeItem = selectedItem as Worktree;
        if (isDefaultBranch(worktreeItem, defaultBranch)) {
          // Clear screen before showing modal
          write("\x1b[2J\x1b[H");

          setState((prev) => ({
            ...prev,
            confirmDialog: {
              active: true,
              title: "Cannot Delete Default Branch",
              message:
                `Cannot delete worktree "${worktreeItem.name}" because it contains the default branch "${defaultBranch}".`,
              onConfirm: handleCloseConfirmDialog,
              errorOnly: true,
            },
          }));
          return;
        }

        title = "Delete Worktree";
        message = `Are you sure you want to delete worktree "${worktreeItem.name}"?`;
        onConfirm = async () => {
          const result = await removeWorktree(worktreeItem.path);
          if (!result.success) {
            // Show error dialog with option to force delete
            setState((prev) => ({
              ...prev,
              confirmDialog: {
                active: true,
                title: "Deletion Failed",
                message:
                  `Failed to remove worktree: ${result.error}\n\nThis usually happens when the worktree has uncommitted changes. Force delete?`,
                onConfirm: async () => {
                  const forceResult = await removeWorktree(
                    worktreeItem.path,
                    true,
                  );
                  if (!forceResult.success) {
                    setState((prev) => ({
                      ...prev,
                      confirmDialog: {
                        active: true,
                        title: "Force Deletion Failed",
                        message: `Failed to force remove worktree: ${forceResult.error}`,
                        onConfirm: handleCloseConfirmDialog,
                        errorOnly: true,
                      },
                    }));
                    return;
                  }
                  await loadData();
                  handleCloseConfirmDialog();
                },
                onCancel: handleCloseConfirmDialog,
              },
            }));
            return;
          }
          await loadData();
          handleCloseConfirmDialog();
        };
        break;
      }
      case "windows": {
        const windowItem = selectedItem as TmuxWindow;
        title = "Close Window";
        message = `Are you sure you want to close window "${windowItem.name}"?`;
        onConfirm = async () => {
          await closeTmuxWindow(windowItem.id);
          await loadData();
          handleCloseConfirmDialog();
        };
        break;
      }
      case "claude": {
        const claudeItem = selectedItem as ClaudeSession;
        title = "Stop Claude Session";
        message = `Are you sure you want to stop Claude session in window "${claudeItem.windowId}"?`;
        onConfirm = async () => {
          // TODO: Implement stop Claude session
          await loadData();
          handleCloseConfirmDialog();
        };
        break;
      }
      default:
        return;
    }

    // Clear screen before showing modal
    write("\x1b[2J\x1b[H");

    setState((prev) => ({
      ...prev,
      confirmDialog: {
        active: true,
        title,
        message,
        onConfirm,
        errorOnly: false,
      },
    }));
  };

  const handleSelectItem = async () => {
    const currentList = getCurrentList();
    if (currentList.length === 0) return;

    const selectedItem = currentList[state.selectedIndex];
    if (!selectedItem) return;

    switch (state.activePanel) {
      case "worktrees": {
        // Create or switch to tmux window for worktree
        const worktreeItem = selectedItem as Worktree;
        const branchName = worktreeItem.name;

        try {
          const success = await createOrSwitchToWorktreeWindow(
            worktreeItem.path,
            branchName,
          );
          if (success) {
            // Refresh tmux windows list to show the new window
            await loadData();
          }
        } catch (error) {
          console.error(
            "Failed to create or switch to worktree window:",
            error,
          );
        }
        break;
      }
      case "windows": {
        // Focus tmux window
        const windowItem = selectedItem as TmuxWindow;
        const { $ } = await import("@david/dax");
        await $`tmux select-window -t ${windowItem.id}`;
        break;
      }
      case "claude": {
        // Focus claude session pane
        const claudeItem = selectedItem as ClaudeSession;
        const { $: $2 } = await import("@david/dax");
        await $2`tmux select-window -t ${claudeItem.windowId}`;
        break;
      }
    }
  };

  const handleBranchSelect = async (branch: string | null) => {
    // Clear screen before closing modal
    write("\x1b[2J\x1b[H");

    // Close branch selector
    setState((prev) => ({
      ...prev,
      branchSelector: {
        active: false,
        branches: [],
        title: "",
      },
    }));

    if (branch === null) {
      // User selected "Create new branch" - show input form
      setState((prev) => ({
        ...prev,
        inputMode: {
          active: true,
          type: "worktree",
          title: "Create New Worktree",
          placeholder: "Enter new branch name",
        },
      }));
    } else {
      // User selected existing branch - create worktree directly
      try {
        const defaultBranch = await getDefaultBranch();
        let worktreeName = branch;

        // If this is the default branch, use ccde_ prefix
        if (branch === defaultBranch) {
          worktreeName = `ccde_${defaultBranch}`;
        }

        const success = await createWorktree(worktreeName, branch);
        if (!success) {
          console.error("Failed to create worktree from existing branch");
        }
        await loadData();
      } catch (error) {
        console.error("Failed to create worktree:", error);
      }
    }
  };

  const handleBranchCancel = () => {
    // Clear screen before closing modal
    write("\x1b[2J\x1b[H");

    setState((prev) => ({
      ...prev,
      branchSelector: {
        active: false,
        branches: [],
        title: "",
      },
    }));
  };

  const handleInputSubmit = async (value: string) => {
    try {
      switch (state.inputMode.type) {
        case "worktree": {
          // For new worktree creation, use the branch name as-is (no ccde_ prefix for new branches)
          const success = await createWorktree(value);
          if (!success) {
            console.error("Failed to create worktree");
          }
          break;
        }
        case "window":
          await createTmuxWindow(value);
          break;
      }
      await loadData();
    } catch (error) {
      console.error("Failed to create item:", error);
    }

    // Clear screen before closing modal
    write("\x1b[2J\x1b[H");

    // Close input mode
    setState((prev) => ({
      ...prev,
      inputMode: {
        active: false,
        type: null,
        title: "",
        placeholder: "",
      },
    }));
  };

  const handleInputCancel = () => {
    // Clear screen before closing modal
    write("\x1b[2J\x1b[H");

    setState((prev) => ({
      ...prev,
      inputMode: {
        active: false,
        type: null,
        title: "",
        placeholder: "",
      },
    }));
  };

  const handleStartClaude = async (windowId: string) => {
    try {
      await startClaudeSession(windowId);
      await loadData();
    } catch (error) {
      console.error("Failed to start claude session:", error);
    }
  };

  const handleShowHelp = () => {
    // Clear screen before showing modal
    write("\x1b[2J\x1b[H");

    setState((prev) => ({ ...prev, showHelp: true }));
  };

  const handleCloseHelp = () => {
    // Clear screen before closing modal
    write("\x1b[2J\x1b[H");

    setState((prev) => ({ ...prev, showHelp: false }));
  };

  const handleConfirmDialogConfirm = () => {
    if (state.confirmDialog.onConfirm) {
      state.confirmDialog.onConfirm();
    }
  };

  const handleCloseConfirmDialog = () => {
    // Clear screen before closing modal
    write("\x1b[2J\x1b[H");

    setState((prev) => ({
      ...prev,
      confirmDialog: {
        active: false,
        title: "",
        message: "",
        onConfirm: null,
        errorOnly: false,
      },
    }));
  };

  // Show modal exclusively when active (conditional rendering)
  if (state.branchSelector.active) {
    return (
      <BranchSelector
        title={state.branchSelector.title}
        branches={state.branchSelector.branches}
        existingWorktreeBranches={state.branchSelector.existingWorktreeBranches || []}
        onSelect={handleBranchSelect}
        onCancel={handleBranchCancel}
      />
    );
  }

  if (state.inputMode.active) {
    return (
      <InputForm
        title={state.inputMode.title}
        placeholder={state.inputMode.placeholder}
        onSubmit={handleInputSubmit}
        onCancel={handleInputCancel}
      />
    );
  }

  if (state.showHelp) {
    return <HelpModal onClose={handleCloseHelp} />;
  }

  if (state.confirmDialog.active) {
    return (
      <ConfirmDialog
        title={state.confirmDialog.title}
        message={state.confirmDialog.message}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={handleCloseConfirmDialog}
        errorOnly={state.confirmDialog.errorOnly}
      />
    );
  }

  // Show main content only when no modal is active
  return (
    <Box flexDirection="column" height="100%">
      <Header title="CCDE - Worktree Manager" />

      <Box flexDirection="row" flexGrow={1}>
        <WorktreeList
          worktrees={state.worktrees}
          selectedIndex={state.activePanel === "worktrees" ? state.selectedIndex : -1}
          isActive={state.activePanel === "worktrees"}
        />

        <TmuxWindowList
          windows={state.tmuxWindows}
          selectedIndex={state.activePanel === "windows" ? state.selectedIndex : -1}
          isActive={state.activePanel === "windows"}
        />
      </Box>

      <ClaudeSessionList
        sessions={state.claudeSessions}
        selectedIndex={state.activePanel === "claude" ? state.selectedIndex : -1}
        isActive={state.activePanel === "claude"}
      />

      <ActionBar activePanel={state.activePanel} />
    </Box>
  );
};
