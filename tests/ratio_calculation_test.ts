import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateTmuxCommands } from "../src/tmux.ts";
import type { LayoutConfig } from "../src/types.ts";

Deno.test("ratio calculation - decimal ratios", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [33.33, 33.33, 33.34],
      panes: [{ name: "pane1" }, { name: "pane2" }, { name: "pane3" }],
    },
  };

  const commands = generateTmuxCommands(config);
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));

  // Should have 2 split commands for 3 panes
  assertEquals(splitCommands.length, 2);

  // First split should use percentage for remaining space
  assertEquals(splitCommands[0].command.includes("-p"), true);

  // Second split should also use percentage
  assertEquals(splitCommands[1].command.includes("-p"), true);
});

Deno.test("ratio calculation - non-100 sum ratios", () => {
  const config: LayoutConfig = {
    layout: {
      type: "vertical",
      ratio: [1, 2, 3], // Sum = 6, not 100
      panes: [{ name: "small" }, { name: "medium" }, { name: "large" }],
    },
  };

  const commands = generateTmuxCommands(config);
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));

  // Should still generate valid commands
  assertEquals(splitCommands.length, 2);

  // Should calculate percentages based on total ratio sum
  // First split: remaining ratio (2+3=5) / total (6) = ~83%
  // Second split: remaining ratio (3) / current space (2+3=5) = 60%
  assertEquals(
    splitCommands.some((cmd) => cmd.command.includes("-p 83")),
    true,
  );
  assertEquals(
    splitCommands.some((cmd) => cmd.command.includes("-p 60")),
    true,
  );
});

Deno.test("ratio calculation - single pane with ratio", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [100],
      panes: [{ name: "only" }],
    },
  };

  const commands = generateTmuxCommands(config);

  // Should not generate any split commands for single pane
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));
  assertEquals(splitCommands.length, 0);

  // Should still set pane title
  assertEquals(
    commands.some((cmd) => cmd.command.includes('select-pane -T "only"')),
    true,
  );
});

Deno.test("ratio calculation - very small ratios", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [0.1, 0.1, 99.8],
      panes: [{ name: "tiny1" }, { name: "tiny2" }, { name: "large" }],
    },
  };

  const commands = generateTmuxCommands(config);
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));

  assertEquals(splitCommands.length, 2);

  // Should handle very small percentages correctly
  assertEquals(
    splitCommands.some((cmd) => cmd.command.includes("-p 100")),
    true,
  );
});

Deno.test("ratio calculation - large number of panes", () => {
  const config: LayoutConfig = {
    layout: {
      type: "vertical",
      ratio: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // 10 equal panes
      panes: Array.from({ length: 10 }, (_, i) => ({ name: `pane${i + 1}` })),
    },
  };

  const commands = generateTmuxCommands(config);
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));

  // Should have 9 split commands for 10 panes
  assertEquals(splitCommands.length, 9);

  // Each split should calculate correct percentage for remaining space
  assertEquals(
    splitCommands.every((cmd) => cmd.command.includes("-p")),
    true,
  );
});

Deno.test("ratio calculation - zero ratio values", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [0, 50, 50],
      panes: [{ name: "invisible" }, { name: "half1" }, { name: "half2" }],
    },
  };

  const commands = generateTmuxCommands(config);
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));

  // Should still work with zero ratios
  assertEquals(splitCommands.length, 2);

  // Should calculate percentages correctly even with zero values
  assertEquals(
    splitCommands.some((cmd) => cmd.command.includes("-p 100")),
    true,
  );
  assertEquals(
    splitCommands.some((cmd) => cmd.command.includes("-p 50")),
    true,
  );
});

Deno.test("ratio calculation - nested containers with ratios", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [70, 30],
      panes: [
        {
          type: "vertical",
          ratio: [80, 20],
          panes: [{ name: "main" }, { name: "bottom" }],
        },
        { name: "sidebar" },
      ],
    },
  };

  const commands = generateTmuxCommands(config);

  // Should generate commands for both main container and nested container
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));

  // Main horizontal split + nested vertical split
  assertEquals(splitCommands.length >= 2, true);

  // Should have both horizontal and vertical splits
  assertEquals(
    splitCommands.some((cmd) => cmd.command.includes("-h")),
    true,
  );
  assertEquals(
    splitCommands.some((cmd) => cmd.command.includes("-v")),
    true,
  );
});

Deno.test("ratio calculation - empty ratio array edge case", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "pane1" }, { name: "pane2" }],
    },
  };

  // Without ratio, should use equal distribution
  const commands = generateTmuxCommands(config);
  const splitCommands = commands.filter((cmd) => cmd.command.includes("split-window"));

  assertEquals(splitCommands.length, 1);

  // Should use 50% for equal distribution of 2 panes
  assertEquals(splitCommands[0].command.includes("-p 50"), true);
});

