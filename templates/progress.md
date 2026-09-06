# Build progress — {{ID}} ({{ALIAS}})

{{SUBJECT}} · Unit {{UNIT_NO}}: {{TITLE}}
started: {{DATE}}

> Source of truth for what is done. `ccnotes-build` reads this on every resume and skips
> ticked items. Update it after every subagent returns. Never delete rows — tick them.

## Decks (extract one at a time, in order)

| deck | extract | slides | section authored | coverage | viz requested |
|------|:------:|:-----:|:---------------:|:--------:|:-------------:|
| 01-<slug> | [ ] | ?/? | [ ] | ?/? | ? |
| 02-<slug> | [ ] | ?/? | [ ] | ?/? | ? |

## Visualizations
- [ ] viz built ( ? files )
- [ ] viz verified — pass ?/?

## Assessments
- [ ] section-check MCQs synced into every section
- [ ] ISA 1-mark MCQs  (need >= 10)      count: ?
- [ ] ISA 2-mark MCQs  (need >= 8)       count: ?
- [ ] 4-mark theory     (need >= 5)      count: ?
- [ ] flashcards        (need >= 8 x sections)  count: ?
- [ ] quick reference sheet
- [ ] formula sheet

## Finalize
- [ ] manifest.json
- [ ] index.html + isa/index.html
- [ ] SKILL_SOURCE.md
- [ ] `bun tools/validate-notebook.mjs {{ID}}` -> PASS
- [ ] registry status: ready
- [ ] ccnotes-doubt-{{ID}} skill generated

## Gaps to revisit (before assembling)
<!-- Every "Gap in source" / "rushed, needs elaboration" / failed-viz note lands here.
     Clear each one (elaborate the section, add a data-reveal, rebuild the viz) then strike it. -->
- (none yet)

## Subagent log (1 line each)
<!-- e.g. "slide-extract 01-intro: 22 slides, 4 images, none unreadable" -->
