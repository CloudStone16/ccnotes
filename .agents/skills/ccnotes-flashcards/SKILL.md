---
name: ccnotes-flashcards
description: Build the flashcard deck for a ccnotes notebook into data/flashcards.json, covering every key term, definition, formula and distinction so that answering all cards means the unit is mastered. Use when ccnotes-build asks for flashcards.
---

# ccnotes-flashcards -> data/flashcards.json

Read `NOTES_SPEC.md` section 8. Work from the finished `sections/*.html`.

## Coverage contract
A student who answers **every** card correctly is thorough with the unit. So the deck must
cover, across sections:
- every **key term** and its definition (`kind: "definition"`),
- every **concept / mechanism** — front asks "what/why/how", back explains (`kind: "concept"`),
- every **formula** — front: name + when to use; back: the formula + symbols (`kind: "formula"`),
- every **A vs B distinction** the deck draws (`kind: "distinction"`),
- every **procedure / algorithm** — front: "steps to X"; back: ordered steps (`kind: "procedure"`).

## Card rules
- One idea per card. Back is answerable in 1–3 sentences (or a short list).
- Front is a real question or cloze, not a topic label.
- No card requires knowledge from outside the unit.
- `id` = `fc-001`, `fc-002`, ... zero-padded, contiguous. Tag `section` and `tags[]`.
- Aim for >= 8 x (section count); more is fine if the content warrants it.

## Report (<=8 lines)
total cards, breakdown by kind and by section, any term/formula still without a card (should be none).
