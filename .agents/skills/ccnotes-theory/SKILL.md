---
name: ccnotes-theory
description: Write the 4-mark ISA theory questions with model answers and marking schemes for a ccnotes notebook into data/theory.json. Use when ccnotes-build asks for theory questions.
---

# ccnotes-theory -> data/theory.json

Read `NOTES_SPEC.md` section 8 (theory shape) and 11.5 (>= 5 four-mark questions).
Source: finished `sections/*.html` + `build/*/slides.json` for `sourceSlides`.

## Each question
- `marks: 4`, tied to one `section`, `sourceSlides: [...]`.
- `prompt` — the kind of "explain / compare / derive / justify with a diagram" question an
  examiner sets for 4 marks. Must be fully answerable from the unit.
- `modelAnswer` — a complete answer in markdown: definition(s), the substantive explanation,
  an example or labelled-diagram description, and the consequence/why-it-matters. This is what
  a top student would write.
- `markingScheme` — 3–5 lines that sum to 4 marks (e.g. "1 mark: correct definition",
  "1 mark: labelled diagram", "2 marks: two trade-offs with examples").

## Rules
- Cover different sections; don't put all 5+ on one topic.
- Nothing in the model answer that isn't supported by the slides.
- Prefer questions that combine two ideas from the unit (that's what makes them 4-mark).

## Report (<=6 lines)
count, section spread, any section with no theory question.
