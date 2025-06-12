import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { commandsToString, generateTmuxCommands } from "../src/tmux.ts";
import type { LayoutConfig } from "../src/types.ts";

Deno.test("generateTmuxCommands - special characters in pane names", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "pane with spaces" },
        { name: "pane-with-dashes" },
        { name: "pane_with_underscores" },
        { name: "pane/with/slashes" },
        { name: "pane$with$dollars" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  
  // Should generate commands for all panes
  const titleCommands = commands.filter(cmd => cmd.command.includes('select-pane -T'));
  assertEquals(titleCommands.length, 5);
  
  // Should properly quote pane names
  assertEquals(titleCommands.some(cmd => cmd.command.includes('"pane with spaces"')), true);
  assertEquals(titleCommands.some(cmd => cmd.command.includes('"pane-with-dashes"')), true);
  assertEquals(titleCommands.some(cmd => cmd.command.includes('"pane/with/slashes"')), true);
  assertEquals(titleCommands.some(cmd => cmd.command.includes('"pane$with$dollars"')), true);
});

Deno.test("generateTmuxCommands - special characters in commands", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "shell", command: "echo 'Hello World!'" },
        { name: "quotes", command: 'echo "Double quotes"' },
        { name: "complex", command: "grep -r 'pattern' /path/to/files | wc -l" },
        { name: "variables", command: "echo $HOME && ls -la" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  
  // Should generate send-keys commands for all panes with commands
  const sendKeysCommands = commands.filter(cmd => cmd.command.includes('send-keys'));
  assertEquals(sendKeysCommands.length, 4);
  
  // Should properly quote complex commands
  assertEquals(sendKeysCommands.some(cmd => cmd.command.includes("'Hello World!'")), true);
  assertEquals(sendKeysCommands.some(cmd => cmd.command.includes('Double quotes')), true);
  assertEquals(sendKeysCommands.some(cmd => cmd.command.includes('grep -r')), true);
  assertEquals(sendKeysCommands.some(cmd => cmd.command.includes('$HOME')), true);
});

Deno.test("generateTmuxCommands - very long commands", () => {
  const longCommand = "echo " + "very-long-text-".repeat(100);
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "long", command: longCommand },
        { name: "normal", command: "echo short" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  
  // Should still generate valid commands even with very long command text
  const sendKeysCommands = commands.filter(cmd => cmd.command.includes('send-keys'));
  assertEquals(sendKeysCommands.length, 2);
  
  // Long command should be included
  assertEquals(sendKeysCommands.some(cmd => cmd.command.length > 1000), true);
});

Deno.test("generateTmuxCommands - empty command strings", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "empty", command: "" },
        { name: "whitespace", command: "   " },
        { name: "normal", command: "echo test" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  
  // Should generate send-keys commands for whitespace and normal (but not empty string)
  const sendKeysCommands = commands.filter(cmd => cmd.command.includes('send-keys'));
  assertEquals(sendKeysCommands.length, 2);
});

Deno.test("generateTmuxCommands - Unicode in names and commands", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "日本語", command: "echo 'こんにちは'" },
        { name: "Émojis 🚀", command: "echo '🎯 Target!'" },
        { name: "Ñoño", command: "echo 'Niño español'" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  
  // Should handle Unicode characters properly
  const titleCommands = commands.filter(cmd => cmd.command.includes('select-pane -T'));
  assertEquals(titleCommands.length, 3);
  
  const sendKeysCommands = commands.filter(cmd => cmd.command.includes('send-keys'));
  assertEquals(sendKeysCommands.length, 3);
  
  // Should include Unicode characters
  assertEquals(titleCommands.some(cmd => cmd.command.includes('日本語')), true);
  assertEquals(titleCommands.some(cmd => cmd.command.includes('🚀')), true);
  assertEquals(sendKeysCommands.some(cmd => cmd.command.includes('こんにちは')), true);
});

Deno.test("generateTmuxCommands - extremely deep nesting", () => {
  // Create a deeply nested configuration (5 levels)
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        {
          type: "vertical",
          panes: [
            {
              type: "horizontal",
              panes: [
                {
                  type: "vertical",
                  panes: [
                    {
                      type: "horizontal",
                      panes: [
                        { name: "deep1" },
                        { name: "deep2" },
                      ],
                    },
                    { name: "level4" },
                  ],
                },
                { name: "level3" },
              ],
            },
            { name: "level2" },
          ],
        },
        { name: "level1" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  
  // Should generate commands for all 6 panes
  const titleCommands = commands.filter(cmd => cmd.command.includes('select-pane -T'));
  assertEquals(titleCommands.length, 6);
  
  // Should have multiple split commands for nested structure
  const splitCommands = commands.filter(cmd => cmd.command.includes('split-window'));
  assertEquals(splitCommands.length >= 5, true);
});

Deno.test("generateTmuxCommands - ratio precision edge cases", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [33.333333, 33.333333, 33.333334], // Precise decimals
      panes: [
        { name: "precise1" },
        { name: "precise2" },
        { name: "precise3" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  const splitCommands = commands.filter(cmd => cmd.command.includes('split-window'));
  
  // Should handle high precision decimals
  assertEquals(splitCommands.length, 2);
  
  // Percentages should be rounded to integers
  splitCommands.forEach(cmd => {
    const match = cmd.command.match(/-p (\d+)/);
    if (match) {
      const percentage = parseInt(match[1]);
      assertEquals(Number.isInteger(percentage), true);
      assertEquals(percentage >= 0 && percentage <= 100, true);
    }
  });
});

Deno.test("commandsToString - empty commands array", () => {
  const commandString = commandsToString([]);
  assertEquals(commandString, "");
});

Deno.test("commandsToString - single command", () => {
  const commands = [{ command: "tmux new-window", description: "test" }];
  const commandString = commandsToString(commands);
  assertEquals(commandString, "tmux new-window");
});

Deno.test("commandsToString - commands with semicolons", () => {
  const commands = [
    { command: "tmux new-window" },
    { command: "tmux split-window -h" },
    { command: "tmux select-pane -t 1" },
  ];
  const commandString = commandsToString(commands);
  assertEquals(commandString, "tmux new-window \\; tmux split-window -h \\; tmux select-pane -t 1");
});

Deno.test("generateTmuxCommands - window name with special characters", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "test" }],
    },
  };

  const commands = generateTmuxCommands(config, undefined, "window with spaces & symbols!");
  
  // Should properly quote window name
  const newWindowCommand = commands.find(cmd => cmd.command.includes('new-window'));
  assertEquals(newWindowCommand?.command.includes('"window with spaces & symbols!"'), true);
});

Deno.test("generateTmuxCommands - worktree path with special characters", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "test" }],
    },
  };

  const specialPath = "/path/with spaces/and-symbols_&_more";
  const commands = generateTmuxCommands(config, specialPath);
  
  // Should properly quote paths
  const newWindowCommand = commands.find(cmd => cmd.command.includes('new-window'));
  assertEquals(newWindowCommand?.command.includes(`"${specialPath}"`), true);
});

Deno.test("generateTmuxCommands - configuration validation errors", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [50, 50, 50], // 3 ratios for 2 panes - should throw
      panes: [
        { name: "pane1" },
        { name: "pane2" },
      ],
    },
  };

  assertThrows(
    () => generateTmuxCommands(config),
    Error,
    "Configuration error at root layout"
  );
});

Deno.test("generateTmuxCommands - nested configuration validation errors", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        {
          type: "vertical",
          ratio: [70], // 1 ratio for 2 panes - should throw
          panes: [
            { name: "nested1" },
            { name: "nested2" },
          ],
        },
        { name: "main" },
      ],
    },
  };

  assertThrows(
    () => generateTmuxCommands(config),
    Error,
    "Configuration error at layout.panes[0]"
  );
});

Deno.test("generateTmuxCommands - focus command with special characters", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "special-chars_&_symbols", focus: true },
        { name: "normal" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);
  
  // Should generate focus command with special characters
  const focusCommand = commands.find(cmd => 
    cmd.command.includes('select-pane') && 
    cmd.description?.includes('Focus on pane')
  );
  
  assertEquals(focusCommand !== undefined, true);
  assertEquals(focusCommand?.command.includes('special-chars_&_symbols'), true);
});