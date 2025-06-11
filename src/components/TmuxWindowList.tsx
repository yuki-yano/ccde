import React from 'react';
import { Box, Text } from 'ink';
import { TmuxWindow } from '../tui-types.ts';

interface TmuxWindowListProps {
  windows: TmuxWindow[];
  selectedIndex: number;
  isActive: boolean;
}

export const TmuxWindowList: React.FC<TmuxWindowListProps> = ({ 
  windows, 
  selectedIndex, 
  isActive 
}) => {
  return (
    <Box 
      flexDirection="column" 
      borderStyle="single" 
      borderColor={isActive ? "green" : "gray"}
      padding={1}
      width="50%"
    >
      <Text bold underline>Tmux Windows</Text>
      {windows.map((window, index) => (
        <Box key={window.id} marginTop={1}>
          <Text 
            color={index === selectedIndex && isActive ? "black" : undefined}
            backgroundColor={index === selectedIndex && isActive ? "green" : undefined}
          >
            {window.active ? "→ " : "  "}
            {window.name} ({window.paneCount} panes)
          </Text>
        </Box>
      ))}
      {windows.length === 0 && (
        <Text color="gray">No windows found</Text>
      )}
    </Box>
  );
};