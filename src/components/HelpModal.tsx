import type React from "react";
import { Box, Text } from "ink";

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose: _ }) => {
  return (
    <Box
      flexDirection="column"
      height="100%"
      padding={2}
    >
      <Box justifyContent="center">
        <Text bold color="cyan">CCDE - Keyboard Shortcuts</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">Navigation:</Text>
        <Text>j, ↓, Ctrl+n Move down</Text>
        <Text>k, ↑, Ctrl+p Move up</Text>
        <Text>g Go to first item</Text>
        <Text>G Go to last item</Text>
        <Text>Tab Switch panel</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">Actions:</Text>
        <Text>c Create worktree (new/existing branch)</Text>
        <Text>d Delete item</Text>
        <Text>Enter, Space Select/Execute</Text>
        <Text>q Quit</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">Input Mode:</Text>
        <Text>Enter Submit input</Text>
        <Text>Escape Cancel input</Text>
        <Text>Ctrl+a Beginning of line</Text>
        <Text>Ctrl+e End of line</Text>
        <Text>Ctrl+f Forward character</Text>
        <Text>Ctrl+b Backward character</Text>
        <Text>Ctrl+k Kill to end of line</Text>
        <Text>Ctrl+w Kill word backward</Text>
        <Text>Ctrl+d Delete character forward</Text>
        <Text>Ctrl+h Backspace</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">Help:</Text>
        <Text>h, ? Show this help</Text>
        <Text>Escape Close help</Text>
      </Box>

      <Box justifyContent="center">
        <Text color="gray">Press Escape or q to close</Text>
      </Box>
    </Box>
  );
};
