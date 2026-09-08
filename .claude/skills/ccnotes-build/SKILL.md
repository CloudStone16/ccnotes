---
name: ccnotes-build
description: Orchestrate building one unit's interactive notebook from its slide decks. Use when the user says "build notebook <id>", "make notes for <unit>", or points at an inbox/ deck folder. Fans out to ccnotes-slide-extract, ccnotes-section-author, ccnotes-viz-build/verify, ccnotes-mcq, ccnotes-flashcards, ccnotes-theory, ccnotes-quickref, ccnotes-assemble via subagents.
---

# ccnotes-build — pipeline orchestrator

You are the conductor. **You never read slide or section content yourself** — only file
names, counts, and `build/PROGRESS.md`. Every heavy step is delegated to a subagent that
returns a short report. This keeps your context small and the build cheap and fast.

## 0. Read first (once)
- `NOTES_SPEC.md` — the whole file.
- The target: a notebook `id` (or `alias`) + a deck folder under `inbox/`.
  No notebook yet? `node tools/new-notebook.mjs "<Subject>" <unitNo> "<Title>"` — it creates
  the notebook folder AND the inbox folder, and prints both.

## 1. Normalize decks (fast, no content reads)
- `unzip -o <f>.zip -d <slug>/` for every `.zip` in the deck folder.
- Ignore `PUT-DECKS-HERE.txt` and anything that is not `.pptx` / `.pdf` / a slides export.
- Order deck files by filename; assign slugs `01-<name>`, `02-<name>`, ...
- Write `content/<subjectSlug>/<id>/build/decks.json`:
  `{ "decks": [ { "slug": "01-intro", "file": "Intro.pptx", "kind": "pptx", "slides": 0 }, ... ] }`
  (fill `slides` after extraction).

## 2. Create the progress tracker
Copy `templates/progress.md` to `content/<subjectSlug>/<id>/build/PROGRESS.md` and fill the
header + one row per deck. **This file is the source of truth for what is done.**
- After every subagent returns, tick its box and paste its 1-line result.
- On resume / re-run: read PROGRESS.md first and skip every ticked item.
- Every "Gap in source" or "needs elaboration" note from a subagent goes in the
  `## Gaps to revisit` section — you revisit these before assembling.

## 3. The schedule (parse decks one by one; overlap everything else)

Rule: **decks are extracted strictly one at a time, in order** (bounds memory + prevents
context rot). But the moment deck *k*'s `slides.json` exists, its section author can run
while deck *k+1* is being extracted. Keep **at most 3 subagents running at once**.

```
loop over decks in order:
  - Task: ccnotes-slide-extract  deck k          (wait for it — sequential)
  - update decks.json slides count + PROGRESS
  - Task: ccnotes-section-author deck k           (do NOT wait — let it run)
  - continue to deck k+1 extraction in parallel with the running authors
after last deck extracted: wait for all section-author tasks to finish
```

Collect every author's `viz-requests[]` and gap notes as they report.

### 4. Visualizations (parallel within, loop until clean)
- One `ccnotes-viz-build` subagent, given the full combined `viz-requests[]` list. If there
  are many (8+), split into 2 subagents by section range, run in parallel.
- Then one `ccnotes-viz-verify` -> `build/viz-report.json`.
- While any `verdict != "pass"`: re-spawn `ccnotes-viz-build` with **only** the failing
  items + the verifier notes, re-verify. Max 3 rounds; then record the failures in
  PROGRESS `## Gaps to revisit` and continue (don't block the whole build on one viz).

### 5. Assessments — run the 4 sub-skills concurrently (cap of 3 at a time, so 3 then 1, or 2+2)
`ccnotes-mcq`, `ccnotes-flashcards`, `ccnotes-theory`, `ccnotes-quickref`. Each is told:
notebook path, section list, "read the finished `sections/*.html` and `build/*/slides.json`
for traceability — NOT the raw decks". Each writes its own `data/*.json` and reports counts.

### 6. Assemble + validate (sequential)
`ccnotes-assemble`: builds `index.html`, `isa/index.html`, `manifest.json`, `SKILL_SOURCE.md`;
runs `node tools/validate-notebook.mjs <id>`; sets registry `status: "ready"` only on pass;
reports the validator output verbatim.
On failure: read the precise error list, dispatch the **smallest** targeted fix to the one
responsible sub-skill (e.g. "flashcards count low" -> re-run `ccnotes-flashcards` only),
tick PROGRESS, re-assemble. Repeat.

### 7. Doubt skill
On a green validate: `node tools/gen-doubt-skill.mjs <id>`. Tick PROGRESS.

### 8. Report to the user (short)
id + alias · sections · slide coverage (must be 100%) · counts (section MCQs / flashcards /
1-mark / 2-mark / 4-mark / viz) · validator verdict · any unresolved gaps · "run `ccnotes open`".

## Token & speed discipline (do this, it matters)
- Never paste slide, section, JSON, or HTML content into your own context. Work from
  PROGRESS.md + short reports + `ls` / counts.
- Every subagent prompt: give **paths, not content**; demand a report of **<= 12 lines**
  (paths + numbers + issues). If a subagent returns pasted content, tell it to compress and resend.
- Each subagent re-reads `NOTES_SPEC.md` and its own inputs itself — you don't relay spec text.
- Run subagents concurrently up to the cap of 3. Don't serialize things that don't depend
  on each other (the 4 assessment skills; multiple section authors; viz splits).
- One deck at a time for extraction — never batch decks into one extractor.
- If the build is interrupted, resume from PROGRESS.md; do not rebuild ticked items.
