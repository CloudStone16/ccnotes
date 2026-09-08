---
name: ccnotes-assemble
description: Assemble a ccnotes notebook — build index.html, isa/index.html, manifest.json and SKILL_SOURCE.md from the finished parts, run tools/validate-notebook.mjs, and register the notebook only if it passes. Use when ccnotes-build asks to assemble.
---

# ccnotes-assemble — tie it together, validate, register

Read `NOTES_SPEC.md` sections 2, 4, 9, 11.

Inputs (all already produced): `sections/*.html`, `data/*.json`, `assets/viz/*` +
`build/viz-report.json`, `build/decks.json`, `build/*/coverage.json`.

## Steps
1. **manifest.json** — from the pieces. Fill `sourceDecks` from `build/decks.json`,
   `sections` from the section files (n, slug, title, file, deckSlug, topics — pull `topics`
   from each section's `<h2>` set / key terms), `slideCoverage` from coverage vs decks,
   `counts` by tallying the data files and viz report. `builtAt` = now (ISO).
   Validate against `templates/schemas/manifest.schema.json` before writing.
2. **index.html** — copy `templates/unit-index.html`, fill placeholders, expand the
   `SECTIONS` list to real `<li><a href="sections/NN-slug.html">N. Title</a></li>` with a
   `.toc-topics` span. Keep the quickref/formulas/flashcards `data-*-src` hooks.
3. **isa/index.html** — copy `templates/isa-index.html`, fill `{{SUBJECT}}/{{UNIT_NO}}/{{TITLE}}`.
   The `data-*-src` paths are already correct (`../data/...`).
4. **SKILL_SOURCE.md** — write the digest per NOTES_SPEC section 9: overview, per-section
   summary (title + 3–6 bullets + key terms), Glossary (every term), Formula list,
   Common misconceptions, File map. <= 500 lines. Must contain `## Glossary` and
   `## Formula list` headings (validator checks).
5. **Sync section checks** — ensure each section file's `data-section-check` JSON matches
   `data/mcqs.json` `sectionChecks` for that section.
6. **Validate**: `node tools/validate-notebook.mjs <id>`. Paste the output into your report.
7. **Register**: only if validation passed, set the registry entry `status` to `"ready"`
   (`node -e` a small update, or edit `content/registry.json` and bump `updatedAt`).
   If it failed: DO NOT register. Return the precise error list to ccnotes-build.

## Report
validator verdict (verbatim), counts block, 100%-coverage confirmation, ready/not-ready.
