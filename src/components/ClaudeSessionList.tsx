import type React from "react";
import { Box, Text } from "ink";
import type { ClaudeSession } from "../tui-types.ts";

interface ClaudeSessionListProps {
  sessions: ClaudeSession[];
  selectedIndex: number;
  isActive: boolean;
}

export const ClaudeSessionList: React.FC<ClaudeSessionListProps> = ({
  sessions,
  selectedIndex,
  isActive,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isActive ? "green" : "gray"}
      padding={1}
      marginTop={1}
    >
      <Text bold underline>Claude Sessions</Text>
      {sessions.map((session, index) => (
        <Box key={session.id} marginTop={1}>
          <Text
            color={index === selectedIndex && isActive ? "black" : undefined}
            backgroundColor={index === selectedIndex && isActive ? "green" : undefined}
          >
            {session.status === "running" ? "🟢 " : "🔴 "}
            Window: {session.windowId} (PID: {session.pid || "N/A"})
          </Text>
        </Box>
      ))}
      {sessions.length === 0 && <Text color="gray">No Claude sessions found</Text>}
    </Box>
  );
};
