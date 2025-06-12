# CCDE - Tmux Layout Manager & Git Worktree TUI

CCDE is a powerful dual-mode tool that combines tmux layout management with an interactive terminal user interface for git worktree management. It provides both a CLI for generating complex tmux layouts from configuration files and a comprehensive TUI for managing development workflows with git worktrees, tmux sessions, and Claude Code integration.

## 🚀 Features

### CLI Mode - Tmux Layout Manager
- **Hierarchical Layout Configuration**: Define complex tmux pane layouts using YAML or JSON
- **Flexible Pane Management**: Configure layout, sizing ratios, and auto-focus
- **Direct Execution**: Generate or execute tmux commands immediately

### TUI Mode - Interactive Worktree Manager
- **Git Worktree Management**: Create, delete, and switch between worktrees
- **Tmux Integration**: Manage tmux windows and sessions
- **Claude Code Integration**: Track and control Claude sessions
- **Migration Support**: Automated setup from main repository

## 📦 Installation

### Prerequisites
- [Deno](https://deno.land/) runtime
- [tmux](https://github.com/tmux/tmux) terminal multiplexer
- [git](https://git-scm.com/) version control system

### Install from Source
```bash
# Clone the repository
git clone <repository-url>
cd ccde

# Build the executable
deno task build

# The compiled binary will be available as './ccde'
```

### Development Setup
```bash
# Run in development mode
deno task dev

# Start TUI mode
deno task tui

# Run tests
deno task test

# Format code
deno fmt

# Lint code
deno lint
```

## 🎯 Usage

### CLI Mode - Layout Management

#### Basic Usage
```bash
# Generate tmux commands from layout file
ccde layout.yaml

# Execute layout directly
ccde -e layout.yaml
ccde --execute examples/dev.yaml

# Show help
ccde -h
ccde --help
```

#### Layout Configuration Format

CCDE supports both YAML and JSON configuration files with the following structure:

```yaml
name: "Development Layout"
layout:
  type: horizontal  # or "vertical"
  ratio: [70, 30]   # Optional: pane size ratios
  panes:
    - type: vertical
      ratio: [70, 30]
      panes:
        - name: "editor"
          command: "nvim"
          focus: true        # Auto-focus this pane
        - type: horizontal
          ratio: [1, 1, 1]   # Equal splits
          panes:
            - name: "term1"
              command: "echo 'Terminal 1'"
            - name: "term2"
              command: "htop"
            - name: "term3"
    - name: "claude-code"
      command: "claude"
```

**Configuration Elements:**
- **`name`** (optional): Layout identifier
- **`layout`**: Root container definition
- **`type`**: Container orientation (`horizontal` | `vertical`)
- **`ratio`** (optional): Array of ratios for pane sizing (must match panes count)
- **`panes`**: Array of nested containers or panes
- **`command`** (optional): Command to execute in the pane
- **`focus`** (optional): Auto-focus this pane after creation (only one per layout)

#### Simple Example

```yaml
name: "Editor Split"
layout:
  type: horizontal
  ratio: [75, 25]
  panes:
    - name: "editor"
      command: "nvim ."
      focus: true
    - name: "terminal"
```

### TUI Mode - Interactive Worktree Management

#### Starting TUI Mode
```bash
# Start interactive TUI
ccde -t
ccde --tui
```

#### TUI Interface Overview

The TUI provides three main panels:

1. **Worktrees Panel**: Manage git worktrees
2. **Tmux Windows Panel**: View and control tmux sessions
3. **Claude Sessions Panel**: Monitor Claude Code instances

#### Keyboard Navigation

**Global Navigation:**
- `Tab`: Switch between panels
- `j`/`k` or `↑`/`↓`: Navigate items
- `Ctrl+n`/`Ctrl+p`: Emacs-style navigation
- `g`/`G`: Jump to first/last item
- `r`: Reload data
- `h`/`?`: Show help
- `q`: Quit application

**Panel-specific Actions:**

**Worktrees Panel:**
- `c`: Create new worktree (from existing or new branch)
- `d`: Delete selected worktree
- `Enter`/`Space`: Open tmux window for worktree

**Tmux Windows Panel:**
- `n`: Create new tmux window
- `d`: Close selected window
- `Enter`/`Space`: Switch to window

**Claude Sessions Panel:**
- `n`: Start Claude Code session in selected tmux window
- `s`: Stop Claude session
- `Enter`/`Space`: Focus Claude session

#### Worktree Management Features

**Worktree Structure:**
CCDE organizes worktrees in a `ccde_worktrees/` directory structure with automatic migration support from main repository usage.

## 🏗️ Architecture

CCDE is built with Deno/TypeScript and uses React + Ink for the terminal interface. The CLI mode handles YAML/JSON layout parsing and tmux command generation, while the TUI mode provides an interactive interface for git worktree and tmux session management.

## 🧪 Testing

```bash
# Run all tests
deno task test
```

## 🔧 Development

```bash
# Development mode
deno task dev

# Build executable
deno task build

# Format and lint
deno fmt && deno lint
```

## 📝 Quick Start

1. **CLI**: `ccde -e layout.yaml` to execute a layout
2. **TUI**: `ccde -t` to start interactive mode
3. **Create worktree**: Press `c` in TUI worktrees panel
4. **Switch to worktree**: Press `Enter` to open tmux window

## 🔍 Troubleshooting

- **Layout issues**: Check syntax with `ccde layout.yaml` before executing
- **TUI worktrees**: Ensure you're in a git repository with `ccde_worktrees/` structure
- **Tmux integration**: Verify you're inside a tmux session

## 🤝 Contributing

Contributions welcome! See `CLAUDE.md` for development guidelines.