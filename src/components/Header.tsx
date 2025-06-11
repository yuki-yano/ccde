import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <Box borderStyle="round" borderColor="blue" padding={1} marginBottom={1}>
      <Text bold color="blue">{title}</Text>
    </Box>
  );
};