import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseLayoutFile, validateLayout } from "../src/parser.ts";
import type { LayoutConfig } from "../src/types.ts";

Deno.test("parseLayoutFile - valid YAML", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".yaml" });
  const yamlContent = `
name: "Test Layout"
layout:
  type: horizontal
  panes:
    - name: "left"
    - name: "right"
`;
  await Deno.writeTextFile(tempFile, yamlContent);

  const config = await parseLayoutFile(tempFile);
  assertEquals(config.name, "Test Layout");
  assertEquals(config.layout.type, "horizontal");
  assertEquals(config.layout.panes.length, 2);

  await Deno.remove(tempFile);
});

Deno.test("parseLayoutFile - valid JSON", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".json" });
  const jsonContent = JSON.stringify({
    name: "Test Layout",
    layout: {
      type: "vertical",
      panes: [{ name: "top" }, { name: "bottom" }],
    },
  });
  await Deno.writeTextFile(tempFile, jsonContent);

  const config = await parseLayoutFile(tempFile);
  assertEquals(config.name, "Test Layout");
  assertEquals(config.layout.type, "vertical");

  await Deno.remove(tempFile);
});

Deno.test("validateLayout - valid layout", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [{ name: "left" }, { name: "right" }],
    },
  };

  validateLayout(config);
});

Deno.test("validateLayout - missing layout property", () => {
  const config = {} as LayoutConfig;

  assertThrows(
    () => validateLayout(config),
    Error,
    "Layout configuration must have a 'layout' property",
  );
});

Deno.test("validateLayout - invalid container type", () => {
  const config: LayoutConfig = {
    layout: {
      type: "invalid" as "horizontal" | "vertical",
      panes: [{ name: "test" }],
    },
  };

  assertThrows(
    () => validateLayout(config),
    Error,
    "Container must have type 'horizontal' or 'vertical'",
  );
});

Deno.test("validateLayout - missing panes array", () => {
  const config = {
    layout: {
      type: "horizontal",
    },
  } as LayoutConfig;

  assertThrows(
    () => validateLayout(config),
    Error,
    "Container must have 'panes' array",
  );
});

Deno.test("validateLayout - ratio length mismatch", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      ratio: [50, 30, 20],
      panes: [{ name: "left" }, { name: "right" }],
    },
  };

  assertThrows(
    () => validateLayout(config),
    Error,
    "Ratio array length must match panes array length",
  );
});

Deno.test("validateLayout - multiple focused panes", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        { name: "left", focus: true },
        { name: "right", focus: true },
      ],
    },
  };

  assertThrows(
    () => validateLayout(config),
    Error,
    "Multiple panes marked with focus",
  );
});

Deno.test("validateLayout - nested container validation", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        {
          type: "vertical",
          ratio: [70],
          panes: [{ name: "top" }, { name: "bottom" }],
        },
        { name: "right" },
      ],
    },
  };

  assertThrows(
    () => validateLayout(config),
    Error,
    "Ratio array length must match panes array length",
  );
});

Deno.test("validateLayout - valid nested layout", () => {
  const config: LayoutConfig = {
    layout: {
      type: "horizontal",
      panes: [
        {
          type: "vertical",
          ratio: [70, 30],
          panes: [{ name: "top" }, { name: "bottom", focus: true }],
        },
        { name: "right" },
      ],
    },
  };

  validateLayout(config);
});

Deno.test("parseLayoutFile - unsupported file extension", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".txt" });
  await Deno.writeTextFile(tempFile, "content");

  try {
    let errorThrown = false;
    try {
      await parseLayoutFile(tempFile);
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message, "Unsupported file extension: txt");
    }
    assertEquals(errorThrown, true, "Expected function to throw an error");
  } finally {
    await Deno.remove(tempFile);
  }
});
