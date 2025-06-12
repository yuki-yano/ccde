# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `deno task dev` - Run the CLI tool with development permissions
- `deno task tui` - Start the interactive TUI mode for worktree management  
- `deno task build` - Compile to standalone executable named `ccde`
- `deno task test` - Run all tests
- `deno test --allow-read --allow-write tests/` - Run tests with explicit permissions
- `deno check src/ tests/` - Type check all TypeScript files
- `deno lint src/ tests/` - Lint source and test files
- `deno fmt` - Format all code files

## Architecture Overview

CCDE is a Tmux layout manager with two primary modes:

### 1. CLI Mode (src/main.ts)
- Parses YAML/JSON layout configuration files
- Generates and executes tmux commands for complex pane layouts
- Uses `src/parser.ts` for config validation and `src/tmux.ts` for command generation
- Layout files define hierarchical containers (horizontal/vertical) with nested panes

### 2. TUI Mode (src/TuiApp.tsx)
- React-based terminal UI using Ink framework
- Manages git worktrees through `ccde_worktrees/` subdirectory structure
- Integrates with tmux for session/window management
- Three main panels: Worktrees, Tmux Windows, Claude Sessions

### Key Components

**Core Logic:**
- `src/types.ts` - Type definitions for layout configurations
- `src/parser.ts` - YAML/JSON parsing and validation
- `src/tmux.ts` - Tmux command generation and execution
- `src/tui-types.ts` - TUI-specific type definitions

**TUI Components:**
- `src/components/WorktreeList.tsx` - Git worktree management
- `src/components/TmuxWindowList.tsx` - Tmux session display
- `src/components/ClaudeSessionList.tsx` - Claude Code session tracking
- Modal components for user input and confirmations

**Utilities:**
- `src/utils/git.ts` - Git worktree operations, branch management
- `src/utils/tmux.ts` - Tmux integration for TUI mode

### Git Worktree Management

The TUI manages worktrees in a `ccde_worktrees/` directory structure. Default branch worktrees use the `ccde_` prefix (e.g., `ccde_main`). The system can migrate from main repository usage to organized worktree structure.

### Technology Stack

- **Runtime**: Deno with TypeScript
- **UI Framework**: React + Ink for terminal interfaces  
- **Dependencies**: @std/yaml, @david/dax for shell operations, @cliffy/ansi for TUI styling
- **Layout Format**: YAML/JSON with hierarchical container definitions

## Testing Strategy

The test suite covers core functionality without system side effects:
- `tests/parser_test.ts` - Configuration parsing and validation logic
- `tests/tmux_test.ts` - Tmux command generation and pure functions
- `tests/types_test.ts` - TypeScript type guard functions
- Tests use temporary files and mock data to avoid external dependencies
- All test functions are focused on pure logic rather than system integration

## Key Architecture Patterns

**Tmux Command Generation**: The system builds tmux commands as structured objects (`TmuxCommand[]`) before serializing them to shell commands. This allows for validation, testing, and complex ratio calculations for pane sizing.

**Configuration Validation**: Multi-layered validation happens at parse time, checking container structure, ratio arrays, and focus constraints before tmux command generation.

**Git Worktree Integration**: The TUI mode expects a specific directory structure (`ccde_worktrees/`) and manages branch-to-worktree mapping with special handling for default branches using `ccde_` prefixed names.