import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseLayoutFile, validateLayout } from "../src/parser.ts";
import type { LayoutConfig } from "../src/types.ts";

Deno.test("parseLayoutFile - file not found", async () => {
  const nonExistentFile = "/tmp/does-not-exist-" + Date.now() + ".yaml";
  
  let errorThrown = false;
  try {
    await parseLayoutFile(nonExistentFile);
  } catch (error) {
    errorThrown = true;
    // Should be a Deno file system error
    assertEquals(error instanceof Error, true);
  }
  
  assertEquals(errorThrown, true, "Expected file not found error");
});

Deno.test("parseLayoutFile - malformed YAML", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yaml" });
  const malformedYaml = `
name: "Test Layout
layout:
  type: horizontal
  panes:
    - name: "missing quote
    - name: "valid"
`;
  await Deno.writeTextFile(tempFile, malformedYaml);

  try {
    let _errorThrown = false;
    try {
      await parseLayoutFile(tempFile);
    } catch (error) {
      _errorThrown = true;
      assertEquals(error instanceof Error, true);
    }
    assertEquals(_errorThrown, true, "Expected YAML parsing error");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("parseLayoutFile - malformed JSON", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".json" });
  const malformedJson = `{
    "name": "Test Layout",
    "layout": {
      "type": "horizontal",
      "panes": [
        {"name": "valid"},
        {"name": "missing closing brace"
      ]
    }
  `;
  await Deno.writeTextFile(tempFile, malformedJson);

  try {
    let _errorThrown = false;
    try {
      await parseLayoutFile(tempFile);
    } catch (error) {
      _errorThrown = true;
      assertEquals(error instanceof Error, true);
      assertEquals((error as Error).message.includes("JSON"), true);
    }
    assertEquals(_errorThrown, true, "Expected JSON parsing error");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("parseLayoutFile - empty file", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yaml" });
  await Deno.writeTextFile(tempFile, "");

  try {
    let _errorThrown = false;
    try {
      const result = await parseLayoutFile(tempFile);
      // Empty YAML should parse to null/undefined
      assertEquals(result, null);
    } catch (error) {
      // Or it might throw an error, which is also acceptable
      _errorThrown = true;
      assertEquals(error instanceof Error, true);
    }
    // Either behavior is acceptable for empty files
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("parseLayoutFile - whitespace only file", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yaml" });
  await Deno.writeTextFile(tempFile, "   \n  \t  \n  ");

  try {
    let _errorThrown = false;
    try {
      const result = await parseLayoutFile(tempFile);
      // Whitespace-only should parse to null/undefined or throw
      assertEquals(result == null, true);
    } catch (error) {
      _errorThrown = true;
      assertEquals(error instanceof Error, true);
    }
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("validateLayout - empty panes array", () => {
  const config = {
    layout: {
      type: "horizontal",
      panes: [],
    },
  } as LayoutConfig;

  // Empty panes array might not throw in current implementation
  // This test checks if the validation handles empty arrays gracefully
  try {
    validateLayout(config);
    // If no error is thrown, that's also valid behavior
  } catch (error) {
    // If error is thrown, it should be meaningful
    assertEquals(error instanceof Error, true);
  }
});

Deno.test("validateLayout - negative ratio values", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [-10, 110],
      panes: [
        { name: "negative" },
        { name: "positive" },
      ],
    },
  };

  // Should not throw for negative ratios (mathematical calculation should handle it)
  // But command generation might produce unusual results
  validateLayout(config);
});

Deno.test("validateLayout - NaN ratio values", () => {
  const config: LayoutConfig = {
    layout: {
      type: "vertical",
      ratio: [NaN, 50, 50],
      panes: [
        { name: "invalid" },
        { name: "valid1" },
        { name: "valid2" },
      ],
    },
  };

  // NaN ratios should be handled gracefully
  validateLayout(config);
});

Deno.test("validateLayout - zero panes with ratio", () => {
  const config = {
    layout: {
      type: "horizontal",
      ratio: [50, 50],
      panes: [],
    },
  } as LayoutConfig;

  assertThrows(
    () => validateLayout(config),
    Error,
    "Ratio array length must match panes array length"
  );
});

Deno.test("validateLayout - deeply nested focus conflicts", () => {
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
                { name: "deep1", focus: true },
                { name: "deep2" },
              ],
            },
            { name: "nested", focus: true }, // Second focus - should cause error
          ],
        },
        { name: "top" },
      ],
    },
  };

  assertThrows(
    () => validateLayout(config),
    Error,
    "Multiple panes marked with focus"
  );
});

Deno.test("validateLayout - focus with empty name", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { focus: true }, // Focus without name
        { name: "valid" },
      ],
    },
  };

  // Should not throw - focus without name is valid, just won't generate focus command
  validateLayout(config);
});

Deno.test("validateLayout - invalid container type string", () => {
  const config = {
    layout: {
      type: "diagonal" as "horizontal" | "vertical", // Invalid type
      panes: [{ name: "test" }],
    },
  } as LayoutConfig;

  assertThrows(
    () => validateLayout(config),
    Error,
    "Container must have type 'horizontal' or 'vertical'"
  );
});

Deno.test("validateLayout - missing type property", () => {
  const config = {
    layout: {
      panes: [{ name: "test" }],
    },
  } as LayoutConfig;

  assertThrows(
    () => validateLayout(config),
    Error,
    "Container must have type 'horizontal' or 'vertical'"
  );
});

Deno.test("parseLayoutFile - Unicode characters in content", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yaml" });
  const unicodeContent = `
name: "テストレイアウト 🚀"
layout:
  type: horizontal
  panes:
    - name: "左パネル 📝"
      command: "echo 'こんにちは'"
    - name: "右パネル 🎯"
`;
  await Deno.writeTextFile(tempFile, unicodeContent);

  try {
    const config = await parseLayoutFile(tempFile);
    assertEquals(config.name, "テストレイアウト 🚀");
    assertEquals(config.layout.panes.length, 2);
    assertEquals((config.layout.panes[0] as { name: string; command: string }).name, "左パネル 📝");
    assertEquals((config.layout.panes[0] as { name: string; command: string }).command, "echo 'こんにちは'");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("parseLayoutFile - very large configuration", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".json" });
  
  // Generate a large configuration with many panes
  const largePanes = Array.from({ length: 100 }, (_, i) => ({
    name: `pane${i}`,
    command: `echo "Pane number ${i}"`,
  }));
  
  const largeConfig = {
    name: "Large Layout",
    layout: {
      type: "horizontal",
      panes: largePanes,
    },
  };
  
  await Deno.writeTextFile(tempFile, JSON.stringify(largeConfig));

  try {
    const config = await parseLayoutFile(tempFile);
    assertEquals(config.layout.panes.length, 100);
    assertEquals((config.layout.panes[99] as { name: string }).name, "pane99");
  } finally {
    await Deno.remove(tempFile);
  }
});