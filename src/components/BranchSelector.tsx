import type React from "react";
import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getDefaultBranch } from "../utils/git.ts";

interface BranchSelectorProps {
  title: string;
  branches: string[];
  existingWorktreeBranches: string[];
  onSelect: (branch: string | null) => void;
  onCancel: () => void;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  title,
  branches,
  existingWorktreeBranches,
  onSelect,
  onCancel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [_defaultBranch, setDefaultBranch] = useState<string>("main");

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

  // Add "Create new branch" option at the top
  const options = ["Create new branch...", ...branches];
  const maxIndex = options.length - 1;

  useInput((input, key) => {
    if (key.return || input === " ") {
      if (selectedIndex === 0) {
        // Create new branch option
        onSelect(null);
      } else {
        // Check if the selected branch already has a worktree
        const selectedBranch = branches[selectedIndex - 1];
        if (existingWorktreeBranches.includes(selectedBranch)) {
          // Don't allow selection of branches that already have worktrees
          return;
        }
        // Select existing branch
        onSelect(selectedBranch);
      }
      return;
    }

    if (key.escape || input === "q") {
      onCancel();
      return;
    }

    // Movement - Arrow keys
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => Math.min(maxIndex, prev + 1));
      return;
    }

    // Movement - Ctrl+n/Ctrl+p (Emacs-like)
    if (key.ctrl && input === "n") {
      setSelectedIndex((prev) => Math.min(maxIndex, prev + 1));
      return;
    }

    if (key.ctrl && input === "p") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    // First/Last navigation
    if (input === "g") {
      setSelectedIndex(0);
      return;
    }

    if (input === "G") {
      setSelectedIndex(maxIndex);
      return;
    }
  });

  return (
    <Box
      flexDirection="column"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        width={60}
        borderStyle="double"
        borderColor="yellow"
        padding={2}
        flexDirection="column"
        alignItems="center"
      >
        <Text bold color="yellow">{title}</Text>

        <Box flexDirection="column" width="100%" marginBottom={1}>
          {options.slice(0, 10).map((option, index) => {
            const isCreateNew = index === 0;
            const branchName = isCreateNew ? "" : branches[index - 1];
            const hasWorktree = !isCreateNew && existingWorktreeBranches.includes(branchName);
            
            return (
              <Box key={index} width="100%">
                <Text
                  color={selectedIndex === index ? "black" : (isCreateNew ? "green" : hasWorktree ? "gray" : "white")}
                  backgroundColor={selectedIndex === index ? "yellow" : undefined}
                  dimColor={isCreateNew || hasWorktree}
                >
                  {selectedIndex === index ? "> " : "  "}
                  {isCreateNew ? "+ " : hasWorktree ? "✓ " : "  "}
                  {option}
                  {hasWorktree ? " (worktree exists)" : ""}
                </Text>
              </Box>
            );
          })}
          {options.length > 10 && (
            <Text color="gray">
              ... and {options.length - 10} more
            </Text>
          )}
        </Box>

        <Text color="gray">
          Enter/Space: Select | Escape/q: Cancel
        </Text>
        <Text color="gray">
          j/k/↑/↓: Navigate | g/G: First/Last
        </Text>
      </Box>
    </Box>
  );
};
