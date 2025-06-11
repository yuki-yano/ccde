import React from 'react';
import { Box, Text } from 'ink';
import { Worktree } from '../tui-types.ts';

interface WorktreeListProps {
  worktrees: Worktree[];
  selectedIndex: number;
  isActive: boolean;
}

export const WorktreeList: React.FC<WorktreeListProps> = ({ 
  worktrees, 
  selectedIndex, 
  isActive 
}) => {
  return (
    <Box 
      flexDirection="column" 
      borderStyle="single" 
      borderColor={isActive ? "green" : "gray"}
      padding={1}
      marginRight={1}
      width="50%"
    >
      <Text bold underline>Git Worktrees</Text>
      {worktrees.map((worktree, index) => (
        <Box key={worktree.name} marginTop={1}>
          <Text 
            color={index === selectedIndex && isActive ? "black" : undefined}
            backgroundColor={index === selectedIndex && isActive ? "green" : undefined}
          >
            {worktree.active ? "→ " : "  "}
            {worktree.name} ({worktree.branch})
          </Text>
        </Box>
      ))}
      {worktrees.length === 0 && (
        <Text color="gray">No worktrees found</Text>
      )}
    </Box>
  );
};