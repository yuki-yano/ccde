import type React from "react";
import { Box, Text, useInput } from "ink";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  errorOnly?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  errorOnly = false,
}) => {
  useInput((input, key) => {
    if (!errorOnly && (input === "y" || input === "Y")) {
      onConfirm();
      return;
    }

    if (input === "n" || input === "N" || key.escape || key.return) {
      onCancel();
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
        width={70}
        borderStyle="double"
        borderColor="red"
        padding={2}
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Text bold color="red">{title}</Text>
        <Box marginY={1} width="100%">
          <Text>{message}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">
            {errorOnly ? "Enter/Escape: OK" : "y: Yes  |  n: No  |  Escape: Cancel"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
