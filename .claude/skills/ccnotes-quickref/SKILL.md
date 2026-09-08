---
name: ccnotes-quickref
description: Build the quick-reference sheet (data/quickref.json) and formula sheet (data/formulas.json) for a ccnotes notebook. Use when ccnotes-build asks for the quick reference or formula sheet.
---

# ccnotes-quickref -> data/quickref.json + data/formulas.json

Read `NOTES_SPEC.md` section 8. Source: finished `sections/*.html`.

## quickref.json
- `sections[]` — one block per notebook section (or per major theme): `title` + `points[]`
  of the most compressed, exam-useful statements. Someone should be able to skim this the
  night before and recall the unit's spine.
- `keyTerms[]` — every important term -> a one-line definition. This doubles as search bait
  (the server indexes it).

## formulas.json
- One entry per formula/equation/quantitative rule in the unit. `{ id, name, latex, symbols[],
  useWhen, section }`. Define every symbol. `latex` must render in KaTeX.
- If the unit has no formulas, write `{ "formulas": [] }` — that's valid.

## Rules
- Nothing outside the unit. Every point traceable to a section.
- Keep points to one line; move nuance to the section notes, not here.
- **KaTeX Delimiters:** Every formula, variable, and symbol in `points[]` and `keyTerms[].definition` **must** be enclosed in LaTeX delimiters (`\( ... \)`). Never write raw ASCII formulas.

## Report (<=6 lines)
quickref block count, key-term count, formula count.
