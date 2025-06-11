import React, { useState, useEffect } from 'react';
import { Box, useInput, useApp } from 'ink';
import { Header } from './components/Header.tsx';
import { WorktreeList } from './components/WorktreeList.tsx';
import { TmuxWindowList } from './components/TmuxWindowList.tsx';
import { ClaudeSessionList } from './components/ClaudeSessionList.tsx';
import { ActionBar } from './components/ActionBar.tsx';
import { AppState } from './tui-types.ts';
import { getWorktrees, createWorktree, removeWorktree } from './utils/git.ts';
import { getTmuxWindows, getClaudeSessions, createTmuxWindow, closeTmuxWindow, startClaudeSession } from './utils/tmux.ts';

export const TuiApp: React.FC = () => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>({
    worktrees: [],
    tmuxWindows: [],
    claudeSessions: [],
    activePanel: 'worktrees',
    selectedIndex: 0,
  });

  const loadData = async () => {
    const [worktrees, windows, sessions] = await Promise.all([
      getWorktrees(),
      getTmuxWindows(),
      getClaudeSessions(),
    ]);

    setState(prev => ({
      ...prev,
      worktrees,
      tmuxWindows: windows,
      claudeSessions: sessions,
    }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCurrentList = () => {
    switch (state.activePanel) {
      case 'worktrees': return state.worktrees;
      case 'windows': return state.tmuxWindows;
      case 'claude': return state.claudeSessions;
      default: return [];
    }
  };

  const getMaxIndex = () => Math.max(0, getCurrentList().length - 1);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }

    if (key.tab) {
      setState(prev => {
        const panels: Array<AppState['activePanel']> = ['worktrees', 'windows', 'claude'];
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

    if (key.upArrow) {
      setState(prev => ({
        ...prev,
        selectedIndex: Math.max(0, prev.selectedIndex - 1),
      }));
      return;
    }

    if (key.downArrow) {
      setState(prev => ({
        ...prev,
        selectedIndex: Math.min(getMaxIndex(), prev.selectedIndex + 1),
      }));
      return;
    }

    if (input === 'n') {
      handleNewItem();
      return;
    }

    if (input === 'd') {
      handleDeleteItem();
      return;
    }

    if (key.return) {
      handleSelectItem();
      return;
    }
  });

  const handleNewItem = async () => {
    // TODO: In a real implementation, you'd show a form for input
    // For now, just create with default names
    try {
      switch (state.activePanel) {
        case 'worktrees':
          const name = `feature-${Date.now()}`;
          const success = await createWorktree(name);
          if (!success) {
            console.error('Failed to create worktree');
          }
          break;
        case 'windows':
          const windowName = `window-${Date.now()}`;
          await createTmuxWindow(windowName);
          break;
        case 'claude':
          if (state.tmuxWindows.length > 0) {
            const window = state.tmuxWindows[state.selectedIndex] || state.tmuxWindows[0];
            await startClaudeSession(window.id);
          }
          break;
      }
      await loadData();
    } catch (error) {
      console.error('Failed to create new item:', error);
    }
  };

  const handleDeleteItem = async () => {
    const currentList = getCurrentList();
    if (currentList.length === 0) return;

    const selectedItem = currentList[state.selectedIndex];
    if (!selectedItem) return;

    switch (state.activePanel) {
      case 'worktrees':
        await removeWorktree(selectedItem.path);
        break;
      case 'windows':
        await closeTmuxWindow(selectedItem.id);
        break;
    }
    loadData();
  };

  const handleSelectItem = async () => {
    const currentList = getCurrentList();
    if (currentList.length === 0) return;

    const selectedItem = currentList[state.selectedIndex];
    if (!selectedItem) return;

    switch (state.activePanel) {
      case 'worktrees':
        // Switch to worktree directory
        Deno.chdir(selectedItem.path);
        break;
      case 'windows':
        // Focus tmux window
        const { $ } = await import("@david/dax");
        await $`tmux select-window -t ${selectedItem.id}`;
        break;
      case 'claude':
        // Focus claude session pane
        const { $: $2 } = await import("@david/dax");
        await $2`tmux select-window -t ${selectedItem.windowId}`;
        break;
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Header title="CCDE - Worktree Manager" />
      
      <Box flexDirection="row" flexGrow={1}>
        <WorktreeList 
          worktrees={state.worktrees}
          selectedIndex={state.activePanel === 'worktrees' ? state.selectedIndex : -1}
          isActive={state.activePanel === 'worktrees'}
        />
        
        <TmuxWindowList 
          windows={state.tmuxWindows}
          selectedIndex={state.activePanel === 'windows' ? state.selectedIndex : -1}
          isActive={state.activePanel === 'windows'}
        />
      </Box>
      
      <ClaudeSessionList 
        sessions={state.claudeSessions}
        selectedIndex={state.activePanel === 'claude' ? state.selectedIndex : -1}
        isActive={state.activePanel === 'claude'}
      />
      
      <ActionBar activePanel={state.activePanel} />
    </Box>
  );
};