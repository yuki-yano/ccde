import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { commandsToString, generateTmuxCommands } from "../src/tmux.ts";
import type { LayoutConfig } from "../src/types.ts";

Deno.test("generateTmuxCommands - simple horizontal split", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "left" }, { name: "right" }],
    },
  };

  const commands = generateTmuxCommands(config);
  assertEquals(commands.length, 2);
  assertEquals(commands[0].command, "tmux new-window");
  assertEquals(commands[1].command, "tmux split-window -h");
});

Deno.test("generateTmuxCommands - vertical split with ratio", () => {
  const config: LayoutConfig = {
    layout: {
      type: "vertical",
      ratio: [70, 30],
      panes: [{ name: "top" }, { name: "bottom" }],
    },
  };

  const commands = generateTmuxCommands(config);
  assertEquals(commands.length, 2);
  assertEquals(commands[1].command, "tmux split-window -v -p 70");
});

Deno.test("commandsToString - joins commands properly", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "left" }, { name: "right" }],
    },
  };

  const commands = generateTmuxCommands(config);
  const commandString = commandsToString(commands);
  assertEquals(commandString, "tmux new-window \\; tmux split-window -h");
});

