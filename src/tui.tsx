#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { render } from "ink";
import { TuiApp } from "./TuiApp.tsx";

const main = () => {
  render(<TuiApp />);
}

if (import.meta.main) {
  main();
}
