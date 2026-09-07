# GEMINI.md — Antigravity / Gemini Workspace Guidelines for ccnotes

This repository is **ccnotes**, a local platform for interactive, exam-focused study notes built from slide decks. It is designed to work seamlessly with **Google Antigravity / Gemini** alongside **Claude Code**.

---

## 1. Core Principles & Strict Contract

All skills and agents operating in this workspace **must** adhere strictly to `NOTES_SPEC.md`:

1. **"Enhanced, not invented"**:
   - Every fact, definition, bullet, table, diagram label, and speaker note from the slides must appear in the notes. Nothing dropped as "obvious".
   - Enhance terse slides with clear explanations, worked examples, analogies, and visualizations.
   - Never invent external facts or frameworks not implied by the deck. Unresolvable ambiguities are recorded as `[data-reveal="Gap in source"]`.
2. **100% Slide Traceability**:
   - Every slide number must map to a subsection. The validator strictly enforces `sum(slides) == total` and zero unhandled slides.
3. **Completely Offline & Self-Contained**:
   - Never reference external `http://` or `https://` URLs in `sections/`, `assets/`, `index.html`, or `isa/`.
   - All styles, scripts, math (KaTeX), and diagrams (Mermaid) come from `/note-kit/*` served by the local server.
4. **Dark Mode Aesthetics**:
   - Designed for readability and focus with dark backgrounds (`#0a0b0e` / `#0e0f13`).
5. **Runtime**:
   - Zero external npm dependencies. Runs on Node.js (>=20) or Bun.

---

## 2. Available Skills (`.agents/skills/`)

Antigravity automatically discovers these skills:

| Skill | Role |
|---|---|
| `ccnotes-build` | Conductor: orchestrates pipeline across subagents, tracking progress in `build/PROGRESS.md`. |
| `ccnotes-slide-extract` | Extracts one deck into `slides.json` and images into `assets/img/`. |
| `ccnotes-section-author` | Two-pass authoring: slide-by-slide draft followed by strict audit against slides. |
| `ccnotes-viz-build` | Builds self-contained dark-mode interactive visualizations (`assets/viz/*.html`). |
| `ccnotes-viz-verify` | Verifies visualizations via browser automation (`build/viz-report.json`). |
| `ccnotes-mcq` | Writes section understanding checks + ISA 1-mark and 2-mark banks (`data/mcqs.json`). |
| `ccnotes-flashcards` | Writes comprehensive flashcards (`data/flashcards.json`). |
| `ccnotes-theory` | Writes 4-mark ISA theory questions with model answers and marking scheme (`data/theory.json`). |
| `ccnotes-quickref` | Writes quick-reference summary points and formula sheet (`data/quickref.json`, `data/formulas.json`). |
| `ccnotes-assemble` | Assembles HTML pages, validates with `tools/validate-notebook.mjs`, and marks ready. |
| `ccnotes-delete` | Safely and permanently deletes a notebook and its tutoring skills. |
| `ccnotes-doubt-<id>` | Auto-generated per-notebook tutoring skill for student Q&A with slide citations. |

---

## 3. CLI & Tool Commands

You can run tools using either `node` or `bun`:

- **Scaffold new notebook**: `node tools/new-notebook.mjs "<Subject>" <unitNo> "<Title>"`
- **Validate single notebook**: `node tools/validate-notebook.mjs <id|alias>`
- **Validate entire library**: `node tools/validate-all.mjs`
- **Generate / refresh doubt skill**: `node tools/gen-doubt-skill.mjs <id|alias>` (writes to both `.agents/skills/` and `.claude/skills/`)
- **Delete notebook**: `node tools/delete-notebook.mjs <id|alias> [--yes]` (removes from both skill directories)
- **Sync skills**: `node tools/sync-skills.mjs` (synchronizes `.agents/skills/` and `.claude/skills/`)
- **Start server**: `node server.mjs` (default port 4319)

---

## 4. Pipeline Execution Discipline

When running `ccnotes-build`:
- **Context management**: Never paste full slide decks or large HTML files into your main conversation context. Work from short reports and file paths.
- **Decks sequential, assessments parallel**: Extract decks one by one. Authors run as decks finish extraction. Assessment skills (`mcq`, `flashcards`, `theory`, `quickref`) run concurrently.
- **Resume cleanly**: Always check `build/PROGRESS.md` before re-running steps. Skip already completed tasks.
