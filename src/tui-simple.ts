#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import {
  Canvas,
  EventType,
  handleInput,
  handleKeyboardControls,
  Tui,
} from "tui";
import { crayon } from "crayon";
import { getWorktrees } from './utils/git.ts';
import { getTmuxWindows, getClaudeSessions } from './utils/tmux.ts';
import { AppState, Worktree, TmuxWindow, ClaudeSession } from './tui-types.ts';

class WorktreeManagerTUI {
  private tui: Tui;
  private state: AppState;
  private isRunning = true;

  constructor() {
    this.state = {
      worktrees: [],
      tmuxWindows: [],
      claudeSessions: [],
      activePanel: 'worktrees',
      selectedIndex: 0,
    };

    this.tui = new Tui({
      style: crayon.bgBlack,
      refreshRate: 1000 / 60, // 60fps
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    handleKeyboardControls(this.tui);
    handleInput(this.tui, (event) => {
      if (event.key === "q") {
        this.isRunning = false;
        this.tui.dispatch({ type: EventType.Exit });
        return;
      }

      if (event.key === "tab") {
        this.switchPanel();
        return;
      }

      if (event.key === "up") {
        this.moveSelection(-1);
        return;
      }

      if (event.key === "down") {
        this.moveSelection(1);
        return;
      }

      if (event.key === "n") {
        this.handleNewItem();
        return;
      }

      if (event.key === "d") {
        this.handleDeleteItem();
        return;
      }

      if (event.key === "enter") {
        this.handleSelectItem();
        return;
      }
    });
  }

  private switchPanel() {
    const panels: Array<AppState['activePanel']> = ['worktrees', 'windows', 'claude'];
    const currentIndex = panels.indexOf(this.state.activePanel);
    const nextIndex = (currentIndex + 1) % panels.length;
    this.state.activePanel = panels[nextIndex];
    this.state.selectedIndex = 0;
  }

  private moveSelection(direction: number) {
    const currentList = this.getCurrentList();
    const maxIndex = Math.max(0, currentList.length - 1);
    this.state.selectedIndex = Math.max(0, Math.min(maxIndex, this.state.selectedIndex + direction));
  }

  private getCurrentList() {
    switch (this.state.activePanel) {
      case 'worktrees': return this.state.worktrees;
      case 'windows': return this.state.tmuxWindows;
      case 'claude': return this.state.claudeSessions;
      default: return [];
    }
  }

  private async handleNewItem() {
    // Simplified implementation - in a real app you'd want input forms
    console.log(`Creating new ${this.state.activePanel}...`);
  }

  private async handleDeleteItem() {
    console.log(`Deleting ${this.state.activePanel}...`);
  }

  private async handleSelectItem() {
    console.log(`Selecting ${this.state.activePanel}...`);
  }

  private async loadData() {
    try {
      const [worktrees, windows, sessions] = await Promise.all([
        getWorktrees(),
        getTmuxWindows(),
        getClaudeSessions(),
      ]);

      this.state.worktrees = worktrees;
      this.state.tmuxWindows = windows;
      this.state.claudeSessions = sessions;
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private renderHeader(canvas: Canvas) {
    const title = " CCDE - Worktree Manager ";
    const x = Math.floor((canvas.size.columns - title.length) / 2);
    canvas.draw({
      x,
      y: 0,
      text: crayon.bgBlue.white.bold(title),
    });
  }

  private renderWorktreeList(canvas: Canvas, startY: number) {
    const isActive = this.state.activePanel === 'worktrees';
    const title = isActive ? crayon.bgGreen.black.bold(" Git Worktrees ") : crayon.white.bold(" Git Worktrees ");
    
    canvas.draw({
      x: 2,
      y: startY,
      text: title,
    });

    for (let i = 0; i < this.state.worktrees.length; i++) {
      const worktree = this.state.worktrees[i];
      const isSelected = isActive && this.state.selectedIndex === i;
      const prefix = worktree.active ? "→ " : "  ";
      const text = `${prefix}${worktree.name} (${worktree.branch})`;
      
      canvas.draw({
        x: 4,
        y: startY + 2 + i,
        text: isSelected ? crayon.bgGreen.black(text) : crayon.white(text),
      });
    }

    if (this.state.worktrees.length === 0) {
      canvas.draw({
        x: 4,
        y: startY + 2,
        text: crayon.gray("No worktrees found"),
      });
    }
  }

  private renderTmuxWindowList(canvas: Canvas, startY: number) {
    const isActive = this.state.activePanel === 'windows';
    const title = isActive ? crayon.bgGreen.black.bold(" Tmux Windows ") : crayon.white.bold(" Tmux Windows ");
    
    canvas.draw({
      x: 40,
      y: startY,
      text: title,
    });

    for (let i = 0; i < this.state.tmuxWindows.length; i++) {
      const window = this.state.tmuxWindows[i];
      const isSelected = isActive && this.state.selectedIndex === i;
      const prefix = window.active ? "→ " : "  ";
      const text = `${prefix}${window.name} (${window.paneCount} panes)`;
      
      canvas.draw({
        x: 42,
        y: startY + 2 + i,
        text: isSelected ? crayon.bgGreen.black(text) : crayon.white(text),
      });
    }

    if (this.state.tmuxWindows.length === 0) {
      canvas.draw({
        x: 42,
        y: startY + 2,
        text: crayon.gray("No windows found"),
      });
    }
  }

  private renderClaudeSessionList(canvas: Canvas, startY: number) {
    const isActive = this.state.activePanel === 'claude';
    const title = isActive ? crayon.bgGreen.black.bold(" Claude Sessions ") : crayon.white.bold(" Claude Sessions ");
    
    canvas.draw({
      x: 2,
      y: startY,
      text: title,
    });

    for (let i = 0; i < this.state.claudeSessions.length; i++) {
      const session = this.state.claudeSessions[i];
      const isSelected = isActive && this.state.selectedIndex === i;
      const statusIcon = session.status === 'running' ? "🟢" : "🔴";
      const text = `${statusIcon} Window: ${session.windowId} (PID: ${session.pid || 'N/A'})`;
      
      canvas.draw({
        x: 4,
        y: startY + 2 + i,
        text: isSelected ? crayon.bgGreen.black(text) : crayon.white(text),
      });
    }

    if (this.state.claudeSessions.length === 0) {
      canvas.draw({
        x: 4,
        y: startY + 2,
        text: crayon.gray("No Claude sessions found"),
      });
    }
  }

  private renderActionBar(canvas: Canvas) {
    const actions = this.getActionsForPanel();
    const actionText = actions.join("  ");
    const helpText = "Tab: Switch panel | q: Quit";
    
    canvas.draw({
      x: 2,
      y: canvas.size.rows - 3,
      text: crayon.yellow.bold("Actions: ") + crayon.white(actionText),
    });

    canvas.draw({
      x: 2,
      y: canvas.size.rows - 2,
      text: crayon.gray(helpText),
    });
  }

  private getActionsForPanel(): string[] {
    switch (this.state.activePanel) {
      case 'worktrees':
        return ['n: New worktree', 'd: Delete', 'Enter: Switch'];
      case 'windows':
        return ['n: New window', 'd: Close', 'Enter: Select'];
      case 'claude':
        return ['n: Start Claude', 's: Stop', 'Enter: Focus'];
      default:
        return [];
    }
  }

  private render() {
    this.tui.dispatch({
      type: EventType.Render,
      payload: (canvas: Canvas) => {
        canvas.clear();
        
        this.renderHeader(canvas);
        this.renderWorktreeList(canvas, 3);
        this.renderTmuxWindowList(canvas, 3);
        this.renderClaudeSessionList(canvas, 15);
        this.renderActionBar(canvas);
      },
    });
  }

  async run() {
    await this.loadData();

    // Initial render
    this.render();

    // Start the TUI
    this.tui.run();

    // Refresh data and render loop
    const refreshInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(refreshInterval);
        return;
      }
      
      await this.loadData();
      this.render();
    }, 5000); // Refresh every 5 seconds
  }
}

async function main() {
  const manager = new WorktreeManagerTUI();
  await manager.run();
}

if (import.meta.main) {
  main();
}