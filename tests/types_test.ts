import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { isContainerConfig, isPaneConfig } from "../src/types.ts";
import type { ContainerConfig, PaneConfig } from "../src/types.ts";

Deno.test("isPaneConfig - recognizes pane config", () => {
  const pane: PaneConfig = { name: "test" };
  assertEquals(isPaneConfig(pane), true);
});

Deno.test("isPaneConfig - rejects container config", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [{ name: "test" }],
  };
  assertEquals(isPaneConfig(container), false);
});

Deno.test("isContainerConfig - recognizes container config", () => {
  const container: ContainerConfig = {
    type: "vertical",
    panes: [{ name: "test" }],
  };
  assertEquals(isContainerConfig(container), true);
});

Deno.test("isContainerConfig - rejects pane config", () => {
  const pane: PaneConfig = { name: "test", command: "echo hello" };
  assertEquals(isContainerConfig(pane), false);
});

Deno.test("isPaneConfig - handles empty pane config", () => {
  const pane: PaneConfig = {};
  assertEquals(isPaneConfig(pane), true);
});

Deno.test("isContainerConfig - handles minimal container config", () => {
  const container: ContainerConfig = {
    type: "horizontal",
    panes: [],
  };
  assertEquals(isContainerConfig(container), true);
});

Deno.test("type guards - mutual exclusivity", () => {
  const pane: PaneConfig = { name: "test" };
  const container: ContainerConfig = {
    type: "vertical",
    panes: [{ name: "test" }],
  };

  assertEquals(isPaneConfig(pane) && isContainerConfig(pane), false);
  assertEquals(isPaneConfig(container) && isContainerConfig(container), false);
  assertEquals(isPaneConfig(pane) || isContainerConfig(pane), true);
  assertEquals(isPaneConfig(container) || isContainerConfig(container), true);
});

// Edge case tests for type guards
Deno.test("isPaneConfig - handles objects with additional properties", () => {
  const objectWithType = { type: "horizontal", name: "test", extra: "prop" };
  assertEquals(isPaneConfig(objectWithType), false);
});

Deno.test("isContainerConfig - handles objects with additional properties", () => {
  const objectWithType = { type: "horizontal", name: "test", extra: "prop" };
  assertEquals(isContainerConfig(objectWithType), true);
});

Deno.test("isPaneConfig - handles objects with type undefined", () => {
  const objectWithUndefinedType = { type: undefined, name: "test" };
  assertEquals(isPaneConfig(objectWithUndefinedType), false); // "type" property exists, even if undefined
});

Deno.test("isContainerConfig - handles objects with type undefined", () => {
  const objectWithUndefinedType = { type: undefined, name: "test" };
  assertEquals(isContainerConfig(objectWithUndefinedType), true); // "type" property exists, even if undefined
});

Deno.test("isPaneConfig - handles objects with type null", () => {
  const objectWithNullType = { type: null, name: "test" };
  assertEquals(isPaneConfig(objectWithNullType), false); // "type" property exists, even if null
});

Deno.test("isContainerConfig - handles objects with type null", () => {
  const objectWithNullType = { type: null, name: "test" };
  assertEquals(isContainerConfig(objectWithNullType), true); // "type" property exists, even if null
});

Deno.test("isPaneConfig - handles objects with empty string type", () => {
  const objectWithEmptyType = { type: "", name: "test" };
  assertEquals(isPaneConfig(objectWithEmptyType), false);
});

Deno.test("isContainerConfig - handles objects with empty string type", () => {
  const objectWithEmptyType = { type: "", name: "test" };
  assertEquals(isContainerConfig(objectWithEmptyType), true);
});

Deno.test("isPaneConfig - handles objects with invalid type", () => {
  const objectWithInvalidType = { type: "invalid", name: "test" };
  assertEquals(isPaneConfig(objectWithInvalidType), false);
});

Deno.test("isContainerConfig - handles objects with invalid type", () => {
  const objectWithInvalidType = { type: "invalid", name: "test" };
  assertEquals(isContainerConfig(objectWithInvalidType), true);
});

Deno.test("isPaneConfig - handles pane with all optional properties", () => {
  const fullPane: PaneConfig = {
    name: "test",
    command: "echo hello",
    focus: true,
  };
  assertEquals(isPaneConfig(fullPane), true);
});

Deno.test("isContainerConfig - handles container with all properties", () => {
  const fullContainer: ContainerConfig = {
    type: "horizontal",
    ratio: [50, 50],
    panes: [{ name: "left" }, { name: "right" }],
    focus: true,
  };
  assertEquals(isContainerConfig(fullContainer), true);
});

Deno.test("type guards - handles mixed arrays", () => {
  const mixedArray = [
    { name: "pane1" },
    { type: "horizontal", panes: [] },
    { name: "pane2", command: "test" },
    { type: "vertical", panes: [{ name: "nested" }] },
  ];

  const panes = mixedArray.filter(isPaneConfig);
  const containers = mixedArray.filter(isContainerConfig);

  assertEquals(panes.length, 2);
  assertEquals(containers.length, 2);
  assertEquals(panes[0].name, "pane1");
  assertEquals(panes[1].name, "pane2");
  assertEquals(containers[0].type, "horizontal");
  assertEquals(containers[1].type, "vertical");
});
