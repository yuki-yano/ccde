export interface Worktree {
  name: string;
  path: string;
  branch: string;
  active: boolean;
}

export interface TmuxWindow {
  id: string;
  name: string;
  active: boolean;
  paneCount: number;
}

export interface ClaudeSession {
  id: string;
  windowId: string;
  status: 'running' | 'stopped';
  pid?: number;
}

export interface AppState {
  worktrees: Worktree[];
  tmuxWindows: TmuxWindow[];
  claudeSessions: ClaudeSession[];
  activePanel: 'worktrees' | 'windows' | 'claude';
  selectedIndex: number;
}

export type KeyHandler = (input: string, key: any) => void;