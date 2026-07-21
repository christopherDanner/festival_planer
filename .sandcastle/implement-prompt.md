# TASK

Implement ticket #{{TASK_ID}}: {{ISSUE_TITLE}}

Work on branch {{BRANCH}}. Only work on this one ticket.

# THE TICKET

Pull in the ticket with `gh issue view {{TASK_ID}} --comments`.

The ticket is a **tracer-bullet vertical slice** created by `/to-tickets`. Its body contains:

- `## Parent` — if present, fetch the parent issue (spec / wayfinder map) too. It holds the decisions this ticket builds on — respect them, don't re-litigate them.
- `## What to build` — the end-to-end behaviour, from the user's perspective. Deliver the whole slice: schema, logic, UI, tests — narrow but complete.
- `## Acceptance criteria` — the checkboxes define "done". Every criterion must be met and verified before you finish.

Read `CONTEXT.md` and any relevant `docs/adr/` entries — use the domain vocabulary and respect recorded decisions.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

Drive the implementation with this repo's skills (in `.claude/skills/`):

1. Invoke the **/implement** skill for this ticket. It directs you to work via **/tdd** and to finish with **/code-review**.
2. **/tdd** wants seams pre-agreed with a user. You are running AFK — there is no user. Treat the ticket's acceptance criteria as the pre-agreed seams: derive the public interfaces they imply, write them down before the first test, and test only there. Red–green–refactor until every acceptance criterion is covered.
3. **/code-review** wants a fixed point — use `main` (three-dot merge-base diff). The spec source is issue #{{TASK_ID}}. The review only reports; you act on it: fix every confirmed finding that is in scope for this ticket, re-run the checks, and commit the fixes. Note out-of-scope findings in your issue comment instead of fixing them.

# FEEDBACK LOOPS

- Run `npm run typecheck` regularly. Note: the repo currently has pre-existing type errors in files unrelated to your ticket. Capture the baseline (`npm run typecheck` before your first change) and ensure you introduce **zero new errors**; your own files must be error-free. Do not fix pre-existing errors outside your ticket's scope.
- Run single test files regularly while iterating (`npx vitest run <file>`).
- Before the final commit, run `npm run test` — the full suite must pass — and re-run `npm run typecheck` against the baseline.

# COMMIT

Commit your work to branch {{BRANCH}} in coherent increments. Commit messages follow the repo's conventional style, referencing the ticket:

```
feat: <what the slice delivers> (#{{TASK_ID}})
```

(`fix:`/`refactor:`/`test:` where appropriate.) In the body, briefly note key decisions.

# THE ISSUE

- If you complete the ticket, leave a short comment on the issue summarizing what was built and how the acceptance criteria are met.
- If you can NOT complete the ticket, leave a comment with what was done and what blocks you.
- **Never close the issue** — the PR created later will close it via `Closes #{{TASK_ID}}` when merged.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON THIS SINGLE TICKET. Do not touch other tickets, the parent issue, or the wayfinder map.
