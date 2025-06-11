import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
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

