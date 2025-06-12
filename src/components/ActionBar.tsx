import type React from "react";
import { Box, Text } from "ink";

interface ActionBarProps {
  activePanel: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({ activePanel }) => {
  const getActions = () => {
    switch (activePanel) {
      case "worktrees":
        return ["c: Create worktree (new/existing branch)", "d: Delete", "Enter: Open tmux window"];
      case "windows":
        return ["n: New window", "d: Close", "Enter: Select"];
      case "claude":
        return ["n: Start Claude", "s: Stop", "Enter: Focus"];
      default:
        return [];
    }
  };

  return (
    <Box
      borderStyle="single"
      borderColor="yellow"
      padding={1}
      marginTop={1}
    >
      <Box flexDirection="column">
        <Box flexDirection="column">
          <Text bold color="yellow">Actions:</Text>
          {getActions().map((action, index) => (
            <Box key={index} marginLeft={2}>
              <Text>{action}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">j/k/↑/↓: Move | Tab: Switch | g/G: First/Last | r: Reload | h/?: Help | q: Quit</Text>
        </Box>
      </Box>
    </Box>
  );
};
