/* Regenerate .agents/skills/ as an exact mirror of .claude/skills/.
 *
 * .claude/skills/ is the single source of truth (committed). Antigravity reads
 * .agents/skills/, which is generated (git-ignored). Run this after editing a
 * skill, or via `npm run setup`. Skill bodies are written tool-neutrally so the
 * same text serves Claude Code and Antigravity.
 */
import fs from "node:fs";
import path from "node:path";
import { CLAUDE_SKILLS, AGENTS_SKILLS } from "./lib.mjs";

if (!fs.existsSync(CLAUDE_SKILLS)) {
  console.error(`no source skills dir: ${CLAUDE_SKILLS}`);
  process.exit(1);
}

function copyRecursive(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.mkdirSync(AGENTS_SKILLS, { recursive: true });

const want = new Set(
  fs.readdirSync(CLAUDE_SKILLS).filter((n) => fs.statSync(path.join(CLAUDE_SKILLS, n)).isDirectory())
);

// Drop anything in the mirror that no longer exists in the source.
for (const name of fs.readdirSync(AGENTS_SKILLS)) {
  if (!want.has(name)) {
    fs.rmSync(path.join(AGENTS_SKILLS, name), { recursive: true, force: true });
  }
}

// Mirror every source skill dir (replace, don't merge).
let n = 0;
for (const name of want) {
  const dest = path.join(AGENTS_SKILLS, name);
  fs.rmSync(dest, { recursive: true, force: true });
  copyRecursive(path.join(CLAUDE_SKILLS, name), dest);
  n++;
}

console.log(`mirrored ${n} skill(s) → .agents/skills/`);
