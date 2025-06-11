import { parse as parseYaml } from "@std/yaml";
import type { ContainerConfig, LayoutConfig, PaneConfig } from "./types.ts";
import { isContainerConfig, isPaneConfig } from "./types.ts";

export async function parseLayoutFile(filePath: string): Promise<LayoutConfig> {
  const content = await Deno.readTextFile(filePath);
  const ext = filePath.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "yaml":
    case "yml":
      return parseYaml(content) as LayoutConfig;
    case "json":
      return JSON.parse(content) as LayoutConfig;
    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}

export function validateLayout(config: LayoutConfig): void {
  if (!config.layout) {
    throw new Error("Layout configuration must have a 'layout' property");
  }

  validateContainer(config.layout);
  validateFocus(config.layout);
}

function validateFocus(container: ContainerConfig | PaneConfig): void {
  const focusedPanes: { node: ContainerConfig | PaneConfig; path: string }[] =
    [];

  function findFocusedPanes(
    node: ContainerConfig | PaneConfig,
    path: string[] = [],
  ): void {
    if (isPaneConfig(node) && node.focus === true) {
      focusedPanes.push({ node, path: path.join(".") });
    }

    if (isContainerConfig(node)) {
      for (let i = 0; i < node.panes.length; i++) {
        const pane = node.panes[i];
        findFocusedPanes(pane, [...path, i.toString()]);
      }
    }
  }

  findFocusedPanes(container);

  if (focusedPanes.length > 1) {
    throw new Error(
      `Multiple panes marked with focus: ${
        focusedPanes
          .map((p) => p.path)
          .join(", ")
      }`,
    );
  }
}

function validateContainer(container: ContainerConfig): void {
  if (!container.type || !["horizontal", "vertical"].includes(container.type)) {
    throw new Error("Container must have type 'horizontal' or 'vertical'");
  }

  if (!container.panes || !Array.isArray(container.panes)) {
    throw new Error("Container must have 'panes' array");
  }

  if (container.ratio && container.ratio.length !== container.panes.length) {
    throw new Error("Ratio array length must match panes array length");
  }

  for (const pane of container.panes) {
    if (isContainerConfig(pane)) {
      validateContainer(pane);
    }
  }
}
