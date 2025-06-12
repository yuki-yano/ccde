import type React from "react";
import { Box, Text } from "ink";
import type { Worktree } from "../tui-types.ts";
import { getDefaultBranch, isDefaultBranch } from "../utils/git.ts";
import { useEffect, useState } from "react";

interface WorktreeListProps {
  worktrees: Worktree[];
  selectedIndex: number;
  isActive: boolean;
}

export const WorktreeList: React.FC<WorktreeListProps> = ({
  worktrees,
  selectedIndex,
  isActive,
}) => {
  const [defaultBranch, setDefaultBranch] = useState<string>("main");

  useEffect(() => {
    const loadDefaultBranch = async () => {
      try {
        const branch = await getDefaultBranch();
        setDefaultBranch(branch);
      } catch {
        // Keep default as 'main'
      }
    };
    loadDefaultBranch();
  }, []);

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
      {worktrees.map((worktree, index) => {
        const isSelected = index === selectedIndex && isActive;
        const isDefault = isDefaultBranch(worktree, defaultBranch);
        const prefix = worktree.active ? "→ " : "  ";
        const defaultMarker = isDefault ? " [DEFAULT]" : "";

        return (
          <Box key={worktree.name}>
            <Text
              color={isSelected ? "black" : (isDefault ? "cyan" : undefined)}
              backgroundColor={isSelected ? "green" : undefined}
            >
              {prefix}
              {worktree.name} ({worktree.branch}){defaultMarker}
            </Text>
          </Box>
        );
      })}
      {worktrees.length === 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">No worktrees found</Text>
          <Text color="yellow">
            Press 'n' to create ccde_main worktree
          </Text>
        </Box>
      )}
    </Box>
  );
};
