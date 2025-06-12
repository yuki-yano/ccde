import { parse } from "jsr:@std/yaml";
import { join } from "jsr:@std/path";
import type { LayoutConfig } from "../types.ts";

const getConfigPath = (): string => {
  const xdgConfigHome = Deno.env.get("XDG_CONFIG_HOME");
  if (xdgConfigHome) {
    return join(xdgConfigHome, "ccde", "default.yml");
  }

  const homeDir = Deno.env.get("HOME");
  if (!homeDir) {
    throw new Error("HOME environment variable not set");
  }
  return join(homeDir, ".config", "ccde", "default.yml");
}

const loadConfig = async (): Promise<LayoutConfig | null> => {
  try {
    const configPath = getConfigPath();
    const configText = await Deno.readTextFile(configPath);
    const config = parse(configText) as LayoutConfig;
    return config;
  } catch (error) {
    // Config file doesn't exist or can't be read
    console.error("Could not load config file:", (error as Error).message);
    return null;
  }
}

export async function getWorktreeConfig(_branchName: string): Promise<LayoutConfig | null> {
  // For now, just return the default config for all worktrees
  // In the future, this could be extended to support branch-specific configs
  const config = await loadConfig();
  return config;
}
