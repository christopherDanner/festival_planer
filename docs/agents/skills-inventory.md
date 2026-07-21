# Installed skills inventory

Repo-local agent skills in `.claude/skills/` (15). Stand: 2026-07-21.

## Workflow / Planning

| Skill | Zweck | Invocation |
|---|---|---|
| `grill-me` | Plan/Design per Interview stress-testen, Frage für Frage | auto + `/grill-me` |
| `grill-with-docs` | Wie grill-me, prüft gegen Domain-Modell und aktualisiert CONTEXT.md/ADRs inline | auto + `/grill-with-docs` |
| `prototype` | Wegwerf-Prototyp: Terminal-App (State/Logik) oder mehrere UI-Varianten | auto + `/prototype` |
| `to-prd` | Aktuellen Konversationskontext als PRD in den Issue-Tracker publizieren | auto + `/to-prd` |
| `to-issues` | Plan/PRD in unabhängig greifbare Issues zerlegen (Tracer-Bullet-Slices) | auto + `/to-issues` |
| `triage` | Issues durch State-Machine mit Triage-Rollen bewegen | auto + `/triage` |

## Engineering

| Skill | Zweck | Invocation |
|---|---|---|
| `tdd` | Red-green-refactor-Loop, test-first | auto + `/tdd` |
| `diagnose` | Diagnose-Loop für harte Bugs: reproduce → minimise → hypothesise → instrument → fix → regression-test | auto + `/diagnose` |
| `improve-codebase-architecture` | Deepening-Refactors finden, informiert durch CONTEXT.md + docs/adr/ | auto + `/improve-codebase-architecture` |
| `zoom-out` | Höhere Abstraktionsebene: Karte der Module/Caller im Domain-Vokabular | nur manuell `/zoom-out` |

## Meta / Session

| Skill | Zweck | Invocation |
|---|---|---|
| `setup-matt-pocock-skills` | Richtet `## Agent skills`-Block + `docs/agents/` ein (Issue-Tracker, Labels, Domain-Docs) | nur manuell `/setup-matt-pocock-skills` |
| `write-a-skill` | Neue Skills mit korrekter Struktur und progressive disclosure erstellen | auto + `/write-a-skill` |
| `handoff` | Konversation in Handoff-Dokument für nächste Session kompaktieren | auto + `/handoff` |
| `teach` | Thema über mehrere Sessions lehren (stateful) | nur manuell `/teach` |
| `caveman` | Ultra-komprimierter Antwortmodus (~75 % weniger Tokens) | auto + `/caveman` |

## Notes

- "nur manuell" = `disable-model-invocation: true` im Frontmatter; Agent triggert nicht selbstständig.
- `setup-matt-pocock-skills` vor Erstnutzung von `to-issues`, `to-prd`, `triage`, `diagnose`, `tdd`, `improve-codebase-architecture`, `zoom-out` ausführen — bereits geschehen (siehe `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md` und CLAUDE.md).
- Zusätzlich stehen je nach Session eingebaute/Plugin-Skills bereit (z. B. code-review, verify, deep-research); die sind nicht Teil des Repos.
