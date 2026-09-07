/* Shared helpers for ccnotes tools. Zero dependencies. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
export const CONTENT = path.join(ROOT, "content");
export const CLAUDE_SKILLS = path.join(ROOT, ".claude", "skills");
export const GEMINI_SKILLS = path.join(ROOT, ".agents", "skills");
export const SKILL_DIRS = [CLAUDE_SKILLS, GEMINI_SKILLS];
export const SKILLS = CLAUDE_SKILLS;
export const REGISTRY = path.join(CONTENT, "registry.json");

export function slugify(s) {
  return String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { if (fallback !== undefined) return fallback; throw e; }
}
export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
export function loadRegistry() { return readJson(REGISTRY, { notebooks: [], updatedAt: null }); }
export function saveRegistry(reg) { reg.updatedAt = new Date().toISOString(); writeJson(REGISTRY, reg); }

export function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ").trim();
}
export function walk(dir, hit) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, hit); else hit(full);
  }
}
