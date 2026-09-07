/* Synchronize skills between .claude/skills and .agents/skills. */
import fs from "node:fs";
import path from "node:path";
import { CLAUDE_SKILLS, GEMINI_SKILLS } from "./lib.mjs";

fs.mkdirSync(CLAUDE_SKILLS, { recursive: true });
fs.mkdirSync(GEMINI_SKILLS, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy non-doubt skills from source to target
function syncDirs(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  let count = 0;
  for (const name of fs.readdirSync(srcDir)) {
    if (name.startsWith("ccnotes-doubt-")) continue;
    const srcPath = path.join(srcDir, name);
    const destPath = path.join(destDir, name);
    const st = fs.statSync(srcPath);
    if (st.isDirectory()) {
      copyRecursive(srcPath, destPath);
      count++;
    }
  }
  return count;
}

const copiedToGemini = syncDirs(CLAUDE_SKILLS, GEMINI_SKILLS);
console.log(`Synced ${copiedToGemini} skills from .claude/skills/ to .agents/skills/`);
