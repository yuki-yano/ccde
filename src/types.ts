export type PaneConfig = {
  name?: string;
  command?: string;
  focus?: boolean;
};

export type ContainerConfig = {
  type: "horizontal" | "vertical";
  ratio?: number[];
  panes: (PaneConfig | ContainerConfig)[];
  focus?: boolean;
};

export type LayoutConfig = {
  name?: string;
  layout: ContainerConfig;
};

export type TmuxCommand = {
  command: string;
  description?: string;
};

export const isPaneConfig = (
  config: PaneConfig | ContainerConfig,
): config is PaneConfig => {
  return !("type" in config);
}

export const isContainerConfig = (
  config: PaneConfig | ContainerConfig,
): config is ContainerConfig => {
  return "type" in config;
}
