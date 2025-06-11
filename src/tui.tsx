#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import React from 'react';
import { render } from 'ink';
import { TuiApp } from './TuiApp.tsx';

function main() {
  render(<TuiApp />);
}

if (import.meta.main) {
  main();
}