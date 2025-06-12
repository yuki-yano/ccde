import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  commandsToString,
  countTotalPanes,
  findFocusedPane,
  generateFocusCommand,
  generateTmuxCommands,
} from "../src/tmux.ts";
import type { ContainerConfig, LayoutConfig } from "../src/types.ts";

Deno.test("generateTmuxCommands - simple horizontal split", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "left" }, { name: "right" }],
    },
  };

  const commands = generateTmuxCommands(config);
  assertEquals(commands.length >= 4, true);
  assertEquals(commands[0].command.includes("tmux new-window"), true);
  assertEquals(commands.some((cmd) => cmd.command.includes("tmux split-window -h")), true);
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
  assertEquals(commands.length >= 4, true);
  assertEquals(commands.some((cmd) => cmd.command.includes("tmux split-window -v")), true);
  assertEquals(commands.some((cmd) => cmd.command.includes("-p 30")), true);
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
  assertEquals(commandString.includes("tmux new-window"), true);
  assertEquals(commandString.includes("tmux split-window -h"), true);
});

Deno.test("countTotalPanes - simple panes", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [{ name: "left" }, { name: "right" }],
  };

  const count = countTotalPanes(container);
  assertEquals(count, 2);
});

Deno.test("countTotalPanes - nested containers", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [
      {
        type: "vertical",
        panes: [{ name: "top" }, { name: "bottom" }],
      },
      { name: "right" },
    ],
  };

  const count = countTotalPanes(container);
  assertEquals(count, 3);
});

Deno.test("countTotalPanes - deeply nested", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [
      {
        type: "vertical",
        panes: [
          {
            type: "horizontal",
            panes: [{ name: "a" }, { name: "b" }],
          },
          { name: "c" },
        ],
      },
      { name: "d" },
    ],
  };

  const count = countTotalPanes(container);
  assertEquals(count, 4);
});

Deno.test("findFocusedPane - no focused pane", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [{ name: "left" }, { name: "right" }],
  };

  const focused = findFocusedPane(container);
  assertEquals(focused, null);
});

Deno.test("findFocusedPane - simple focused pane", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [{ name: "left", focus: true }, { name: "right" }],
  };

  const focused = findFocusedPane(container);
  assertEquals(focused, "left");
});

Deno.test("findFocusedPane - nested focused pane", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [
      {
        type: "vertical",
        panes: [{ name: "top" }, { name: "bottom", focus: true }],
      },
      { name: "right" },
    ],
  };

  const focused = findFocusedPane(container);
  assertEquals(focused, "bottom");
});

Deno.test("findFocusedPane - focused pane without name", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [{ focus: true }, { name: "right" }],
  };

  const focused = findFocusedPane(container);
  assertEquals(focused, null);
});

Deno.test("generateFocusCommand - creates correct command", () => {
  const command = generateFocusCommand("test-pane");

  assertEquals(command?.description, "Focus on pane with title: test-pane");
  assertEquals(
    command?.command.includes("tmux select-pane"),
    true,
  );
  assertEquals(
    command?.command.includes("test-pane"),
    true,
  );
});

Deno.test("generateTmuxCommands - with focus", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "left", focus: true }, { name: "right" }],
    },
  };

  const commands = generateTmuxCommands(config);
  const hasSelectPane = commands.some((cmd) =>
    cmd.command.includes("tmux select-pane") &&
    cmd.description?.includes("Focus on pane")
  );
  assertEquals(hasSelectPane, true);
});

Deno.test("generateTmuxCommands - with custom window name", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "left" }, { name: "right" }],
    },
  };

  const commands = generateTmuxCommands(config, undefined, "custom-window");
  const newWindowCommand = commands.find((cmd) => cmd.command.includes("tmux new-window"));
  assertEquals(newWindowCommand?.command.includes('-n "custom-window"'), true);
});

Deno.test("generateTmuxCommands - with worktree path", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "left" }, { name: "right" }],
    },
  };

  const commands = generateTmuxCommands(config, "/custom/path");
  const newWindowCommand = commands.find((cmd) => cmd.command.includes("tmux new-window"));
  assertEquals(newWindowCommand?.command.includes('"/custom/path"'), true);
});

Deno.test("generateTmuxCommands - with pane commands", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "left", command: "echo hello" },
        { name: "right", command: "ls -la" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  const sendKeysCommands = commands.filter((cmd) => cmd.command.includes("tmux send-keys"));
  assertEquals(sendKeysCommands.length, 2);
  assertEquals(
    sendKeysCommands.some((cmd) => cmd.command.includes("echo hello")),
    true,
  );
  assertEquals(
    sendKeysCommands.some((cmd) => cmd.command.includes("ls -la")),
    true,
  );
});
