import type {
  ContainerConfig,
  LayoutConfig,
  PaneConfig,
  TmuxCommand,
} from "./types.ts";
import { isContainerConfig, isPaneConfig } from "./types.ts";

function findFocusedPane(container: ContainerConfig): string | null {
  function searchForFocus(node: ContainerConfig | PaneConfig): string | null {
    if (isPaneConfig(node) && node.focus === true && node.name) {
      return node.name;
    }

    if (isContainerConfig(node)) {
      for (const pane of node.panes) {
        const result = searchForFocus(pane);
        if (result) return result;
      }
    }

    return null;
  }

  return searchForFocus(container);
}

function countTotalPanes(container: ContainerConfig): number {
  let count = 0;
  for (const pane of container.panes) {
    if (isPaneConfig(pane)) {
      count++;
    } else if (isContainerConfig(pane)) {
      count += countTotalPanes(pane);
    }
  }
  return count;
}

function generateFocusCommand(focusedPaneName: string): TmuxCommand | null {
  // Use pane index instead of pane_id for more reliable selection
  return {
    command:
      `tmux select-pane -t "$(tmux list-panes -F '#{?#{==:#{pane_title},${focusedPaneName}},#{pane_index},}' | grep -v '^$' | head -1)"`,
    description: `Focus on pane with title: ${focusedPaneName}`,
  };
}

function processContainer(
  container: ContainerConfig,
  startPaneIndex: number,
  commands: TmuxCommand[],
) {
  // Navigate to the starting pane
  commands.push({
    command: `tmux select-pane -t ${startPaneIndex}`,
    description: `Navigate to container start pane ${startPaneIndex}`,
  });

  // Create all splits first
  for (let i = 1; i < container.panes.length; i++) {
    let ratio: number;
    if (container.ratio) {
      const desiredRatios = container.ratio;
      const totalRatio = desiredRatios.reduce((sum, r) => sum + r, 0);

      if (i === 1) {
        const firstPaneRatio = desiredRatios[0];
        const remainingRatiosSum = totalRatio - firstPaneRatio;
        ratio = Math.round((remainingRatiosSum / totalRatio) * 100);
      } else {
        const currentSpaceRatios = desiredRatios.slice(i - 1);
        const currentSpaceTotal = currentSpaceRatios.reduce(
          (sum, r) => sum + r,
          0,
        );
        const newPaneRatios = desiredRatios.slice(i);
        const newPaneTotal = newPaneRatios.reduce((sum, r) => sum + r, 0);

        ratio = Math.round((newPaneTotal / currentSpaceTotal) * 100);
      }
    } else {
      const remainingPanes = container.panes.length - i + 1;
      ratio = Math.round(100 / remainingPanes);
    }

    const splitDirection = container.type === "horizontal" ? "-h" : "-v";
    commands.push({
      command: `tmux split-window ${splitDirection} -p ${ratio}`,
      description: `Split ${container.type} for pane ${i}`,
    });
  }

  // Now set titles and commands for each pane in this container
  let paneIndex = startPaneIndex;
  for (let i = 0; i < container.panes.length; i++) {
    const pane = container.panes[i];

    if (isPaneConfig(pane)) {
      // Navigate to this specific pane and set its properties
      commands.push({
        command: `tmux select-pane -t ${paneIndex}`,
        description: `Select pane ${paneIndex}`,
      });

      if (pane.name) {
        commands.push({
          command: `tmux select-pane -T "${pane.name}"`,
          description: `Set title: ${pane.name}`,
        });
      }

      if (pane.command) {
        commands.push({
          command: `tmux send-keys "${pane.command}" Enter`,
          description: `Run: ${pane.command}`,
        });
      }
      paneIndex++;
    } else if (isContainerConfig(pane)) {
      // Recursively process nested container
      processContainer(pane, paneIndex, commands);
      paneIndex += countTotalPanes(pane);
    }
  }
}

export function generateTmuxCommands(config: LayoutConfig): TmuxCommand[] {
  const commands: TmuxCommand[] = [];

  commands.push({
    command: "tmux new-window",
    description: "Create new window",
  });

  // Handle the main layout step by step
  if (config.layout.type === "horizontal") {
    // Handle any number of horizontal panes
    for (let i = 1; i < config.layout.panes.length; i++) {
      let ratio: number;
      if (config.layout.ratio) {
        const desiredRatios = config.layout.ratio;
        const totalRatio = desiredRatios.reduce((sum, r) => sum + r, 0);

        if (i === 1) {
          // First split: divide 100% into pane[0] and remaining panes[1...]
          const firstPaneRatio = desiredRatios[0];
          const remainingRatiosSum = totalRatio - firstPaneRatio;
          ratio = Math.round((remainingRatiosSum / totalRatio) * 100);
        } else {
          // Subsequent splits: divide current space into pane[i-1] and remaining panes[i...]
          const currentSpaceRatios = desiredRatios.slice(i - 1);
          const currentSpaceTotal = currentSpaceRatios.reduce(
            (sum, r) => sum + r,
            0,
          );
          const newPaneRatios = desiredRatios.slice(i);
          const newPaneTotal = newPaneRatios.reduce((sum, r) => sum + r, 0);

          ratio = Math.round((newPaneTotal / currentSpaceTotal) * 100);
        }
      } else {
        // Equal distribution
        const remainingPanes = config.layout.panes.length - i + 1;
        ratio = Math.round(100 / remainingPanes);
      }

      commands.push({
        command: `tmux split-window -h -p ${ratio}`,
        description: `Split horizontally for pane ${i + 1}`,
      });
    }

    // Process each main pane
    let paneIndex = 1;
    for (let i = 0; i < config.layout.panes.length; i++) {
      const pane = config.layout.panes[i];

      if (isPaneConfig(pane)) {
        commands.push({
          command: `tmux select-pane -t ${paneIndex}`,
          description: `Select main pane ${paneIndex}`,
        });

        if (pane.name) {
          commands.push({
            command: `tmux select-pane -T "${pane.name}"`,
            description: `Set title: ${pane.name}`,
          });
        }

        if (pane.command) {
          commands.push({
            command: `tmux send-keys "${pane.command}" Enter`,
            description: `Run: ${pane.command}`,
          });
        }
        paneIndex++;
      } else if (isContainerConfig(pane)) {
        processContainer(pane, paneIndex, commands);
        paneIndex += countTotalPanes(pane);
      }
    }
  }

  // Handle focus selection
  const focusedPaneName = findFocusedPane(config.layout);
  if (focusedPaneName !== null) {
    const focusCommand = generateFocusCommand(focusedPaneName);
    if (focusCommand) {
      commands.push(focusCommand);
    }
  }

  return commands;
}

export function commandsToString(commands: TmuxCommand[]): string {
  return commands.map((cmd) => cmd.command).join(" \\; ");
}
