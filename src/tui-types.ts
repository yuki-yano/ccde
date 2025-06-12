export type Worktree = {
  name: string;
  path: string;
  branch: string;
  active: boolean;
}

export type TmuxWindow = {
  id: string;
  name: string;
  active: boolean;
  paneCount: number;
}

export type ClaudeSession = {
  id: string;
  windowId: string;
  status: "running" | "stopped";
  pid?: number;
}

export type AppState = {
  worktrees: Worktree[];
  tmuxWindows: TmuxWindow[];
  claudeSessions: ClaudeSession[];
  activePanel: "worktrees" | "windows" | "claude";
  selectedIndex: number;
  inputMode: {
    active: boolean;
    type: "worktree" | "window" | "claude" | null;
    title: string;
    placeholder: string;
  };
  branchSelector: {
    active: boolean;
    branches: string[];
    existingWorktreeBranches?: string[];
    title: string;
  };
  showHelp: boolean;
  confirmDialog: {
    active: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
    errorOnly?: boolean;
  };
}

export type KeyHandler = (input: string, key: Record<string, unknown>) => void;
