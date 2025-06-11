#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

import { parseArgs } from "@std/cli";
import { $ } from "@david/dax";
import { parseLayoutFile, validateLayout } from "./parser.ts";
import { commandsToString, generateTmuxCommands } from "./tmux.ts";

type Args = {
  file?: string;
  execute?: boolean;
  help?: boolean;
  tui?: boolean;
  _: string[];
};

function printHelp() {
  console.log(`
ccde - Tmux Layout Manager

USAGE:
    ccde [OPTIONS] <layout-file>

OPTIONS:
    -e, --execute    Execute the tmux command directly
    -t, --tui        Start TUI mode for worktree management
    -h, --help       Show this help message

EXAMPLES:
    ccde layout.yaml                    # Show generated tmux command
    ccde -e layout.yaml                 # Execute tmux command directly
    ccde --execute examples/dev.yaml    # Execute example layout
    ccde -t                             # Start TUI mode

LAYOUT FILE FORMAT:
    YAML or JSON file with layout configuration
    See examples/ directory for sample layouts
  `);
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["execute", "help", "tui"],
    string: ["file"],
    alias: {
      e: "execute",
      h: "help",
      f: "file",
      t: "tui",
    },
  }) as Args;

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  if (args.tui) {
    // Import and start TUI mode
    const { render } = await import("ink");
    const React = await import("react");
    const { TuiApp } = await import("./TuiApp.tsx");
    
    render(React.createElement(TuiApp));
    return;
  }

  const layoutFile = args.file || args._[0];
  if (!layoutFile) {
    console.error("Error: Layout file is required");
    console.error("Use --help for usage information");
    Deno.exit(1);
  }

  try {
    const config = await parseLayoutFile(layoutFile);
    validateLayout(config);

    const commands = generateTmuxCommands(config);
    const commandString = commandsToString(commands);

    if (args.execute) {
      console.log(`Executing layout: ${config.name || "Unnamed"}`);
      try {
        for (const cmd of commands) {
          // Use sh -c to execute the command with proper environment for history prevention
          await $`sh -c ${cmd.command}`.env({
            ...Deno.env.toObject(),
            HISTCONTROL: "ignorespace:ignoredups",
            HISTFILE: "/dev/null",
          });
        }
      } catch (error) {
        console.error("Failed to execute tmux commands");
        console.error(error instanceof Error ? error.message : String(error));
        Deno.exit(1);
      }
    } else {
      console.log("Generated tmux command:");
      console.log(commandString);
      console.log("\nTo execute this layout, run:");
      console.log(`ccde -e ${layoutFile}`);
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
