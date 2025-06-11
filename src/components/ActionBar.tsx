import React from 'react';
import { Box, Text } from 'ink';

interface ActionBarProps {
  activePanel: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({ activePanel }) => {
  const getActions = () => {
    switch (activePanel) {
      case 'worktrees':
        return ['n: New worktree', 'd: Delete', 'Enter: Switch'];
      case 'windows':
        return ['n: New window', 'd: Close', 'Enter: Select'];
      case 'claude':
        return ['n: Start Claude', 's: Stop', 'Enter: Focus'];
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
      <Box flexDirection="row">
        <Text bold color="yellow">Actions: </Text>
        {getActions().map((action, index) => (
          <Text key={index} marginRight={2}>{action}</Text>
        ))}
        <Text marginLeft={2} color="gray">Tab: Switch panel | q: Quit</Text>
      </Box>
    </Box>
  );
};