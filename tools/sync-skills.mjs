/* Synchronize skills between .claude/skills and .agents/skills (bidirectional: newest wins). */
import fs from "node:fs";
import path from "node:path";
import { CLAUDE_SKILLS, GEMINI_SKILLS } from "./lib.mjs";

fs.mkdirSync(CLAUDE_SKILLS, { recursive: true });
fs.mkdirSync(GEMINI_SKILLS, { recursive: true });

function copyFileIfNewer(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  }
  const srcMtime = fs.statSync(src).mtimeMs;
  const destMtime = fs.statSync(dest).mtimeMs;
  if (srcMtime > destMtime) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function syncRecursive(srcDir, destDir) {
  let updated = 0;
  if (!fs.existsSync(srcDir)) return 0;
  for (const child of fs.readdirSync(srcDir)) {
    if (child.startsWith("ccnotes-doubt-")) continue;
    const srcPath = path.join(srcDir, child);
    const destPath = path.join(destDir, child);
    const st = fs.statSync(srcPath);
    if (st.isDirectory()) {
      updated += syncRecursive(srcPath, destPath);
    } else {
      if (copyFileIfNewer(srcPath, destPath)) updated++;
    }
  }
  return updated;
}

// 1. Sync any newer files in .agents/skills into .claude/skills
const toClaude = syncRecursive(GEMINI_SKILLS, CLAUDE_SKILLS);
// 2. Sync any newer files in .claude/skills into .agents/skills
const toGemini = syncRecursive(CLAUDE_SKILLS, GEMINI_SKILLS);

console.log(`Synced skills: ${toClaude} updated in .claude/skills/, ${toGemini} updated in .agents/skills/`);
