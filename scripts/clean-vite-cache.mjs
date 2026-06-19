import { rmSync } from "node:fs";
import { join } from "node:path";

const targets = ["node_modules/.vite", ".tanstack"];

for (const rel of targets) {
  try {
    rmSync(join(process.cwd(), rel), { recursive: true, force: true });
    console.log(`Removed ${rel}`);
  } catch {
    /* ignore */
  }
}
