import type React from "react";
import { useState } from "react";
import { Box, Text, useInput } from "ink";

interface InputFormProps {
  title: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const InputForm: React.FC<InputFormProps> = ({
  title,
  placeholder,
  onSubmit,
  onCancel,
}) => {
  const [input, setInput] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  useInput((inputText, key) => {
    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    // Emacs-like text editing commands
    if (key.ctrl) {
      switch (inputText) {
        case "a": // Ctrl+a - beginning of line
          setCursorPosition(0);
          return;
        case "e": // Ctrl+e - end of line
          setCursorPosition(input.length);
          return;
        case "f": // Ctrl+f - forward char
          setCursorPosition((prev) => Math.min(input.length, prev + 1));
          return;
        case "b": // Ctrl+b - backward char
          setCursorPosition((prev) => Math.max(0, prev - 1));
          return;
        case "k": // Ctrl+k - kill to end of line
          setInput((prev) => prev.slice(0, cursorPosition));
          return;
        case "w": { // Ctrl+w - kill word backward
          const beforeCursor = input.slice(0, cursorPosition);
          const afterCursor = input.slice(cursorPosition);
          const lastSpaceIndex = beforeCursor.lastIndexOf(" ");
          const newBeforeCursor = lastSpaceIndex >= 0 ? beforeCursor.slice(0, lastSpaceIndex + 1) : "";
          setInput(newBeforeCursor + afterCursor);
          setCursorPosition(newBeforeCursor.length);
          return;
        }
        case "d": // Ctrl+d - delete char forward
          if (cursorPosition < input.length) {
            setInput((prev) => prev.slice(0, cursorPosition) + prev.slice(cursorPosition + 1));
          }
          return;
        case "h": // Ctrl+h - backspace
          if (cursorPosition > 0) {
            setInput((prev) => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
            setCursorPosition((prev) => prev - 1);
          }
          return;
      }
    }

    // Regular backspace
    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        setInput((prev) => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
        setCursorPosition((prev) => prev - 1);
      }
      return;
    }

    // Arrow keys
    if (key.leftArrow) {
      setCursorPosition((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPosition((prev) => Math.min(input.length, prev + 1));
      return;
    }

    // Regular text input
    if (inputText && !key.ctrl && !key.meta) {
      setInput((prev) => prev.slice(0, cursorPosition) + inputText + prev.slice(cursorPosition));
      setCursorPosition((prev) => prev + 1);
      return;
    }
  });

  const displayText = input.length === 0 ? "|" : input.slice(0, cursorPosition) + "|" + input.slice(cursorPosition);

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

        <Text color="cyan">{placeholder}:</Text>

        <Box
          width={40}
          borderStyle="single"
          borderColor="cyan"
          paddingLeft={1}
          paddingRight={1}
        >
          <Text>{displayText}</Text>
        </Box>

        <Text color="gray">
          Enter: Submit | Escape: Cancel
        </Text>
        <Text color="gray">
          Ctrl+a/e/f/b/k/w/d/h: Emacs keys
        </Text>
      </Box>
    </Box>
  );
};
