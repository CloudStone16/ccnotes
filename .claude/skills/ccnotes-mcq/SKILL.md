---
name: ccnotes-mcq
description: Write the MCQ banks for a ccnotes notebook — per-section understanding checks plus ISA 1-mark and 2-mark banks — into data/mcqs.json. Use when ccnotes-build asks for MCQs.
---

# ccnotes-mcq -> data/mcqs.json

Read `NOTES_SPEC.md` section 8 (mcqs shape) and section 11.5 (minimums). Work from the finished
`sections/*.html` and `build/*/slides.json` for traceability — not from raw slides alone.

## What to produce
1. `sectionChecks[]` — for each section, 3–8 questions testing understanding of that section.
   Mirror these into each section file's `data-section-check` JSON (ccnotes-assemble can also
   sync them; leave them consistent).
2. `isa.mark1[]` — >= 10 questions. Single fact / recognition / definition. One clear answer.
3. `isa.mark2[]` — >= 8 questions. Multi-step: needs a small chain of reasoning, a comparison,
   a short calculation, or applying a rule to a new case. Add `why` explaining the 2-mark nature.

## Quality rules
- **Not answerable by string-matching a slide bullet.** Rework the scenario, numbers, or framing.
- **Flawless Math Formatting:** Every formula, variable, Greek symbol (\(\theta, \sigma, \eta, \alpha_i, \mathbf{w}, \xi_i\)), and calculation in stems, options, and explanations **must** be enclosed in LaTeX delimiters (`\( ... \)`). NEVER output raw ASCII pseudo-code (e.g. `delta_j = a_j * (1 - a_j) * sum_k ...` or `||w||/2`).
- Exactly one correct option; 3–4 options; distractors are plausible misconceptions, not filler.
- `answer` = 0-based index. Always fill `explanation` (why right + why the tempting wrong one is wrong).
- Stay inside unit content. Tag `section` and `conceptRef`.
- Spread across sections and difficulties; don't clump on section 1.

## Report (<=8 lines)
counts: sectionChecks per section, mark1, mark2; concepts with no coverage (should be none).
