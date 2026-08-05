# ISSUES

Here are the open implementation tickets in the repo (label `ready-for-agent`, wayfinder decision tickets already excluded):

<issues-json>

!`gh issue list --state open --label ready-for-agent --limit 300 --json number,title,body,labels --jq '[.[] | select(([.labels[].name | startswith("wayfinder:")] | any) | not) | {number, title, body, labels: [.labels[].name]}]'`

</issues-json>

Here are the currently open PRs — tickets whose branch already has an open PR are **in flight** and must NOT be planned again:

<open-prs-json>

!`gh pr list --state open --limit 300 --json number,title,headRefName`

</open-prs-json>

# CONTEXT

These tickets were created by the `/to-tickets` skill as **tracer-bullet vertical slices**. Each ticket body follows this shape:

- `## Parent` — optional link to the parent spec / wayfinder map
- `## What to build` — end-to-end behaviour
- `## Acceptance criteria` — checkboxes
- `## Blocked by` — references to blocking tickets, or "None — can start immediately"

Blocking edges also exist as **native GitHub issue dependencies**. Fetch them for **all** candidate tickets in ONE batch — do not make one tool call per ticket, the list can be hundreds of tickets long:

```
for n in $(gh issue list --state open --label ready-for-agent --limit 300 --json number --jq '.[].number'); do
  echo "$n <- $(gh api repos/{owner}/{repo}/issues/$n/dependencies/blocked_by --jq '[.[] | "\(.number):\(.state)"] | join(" ")' 2>/dev/null)"
done
```

(`{owner}/{repo}` is substituted by `gh` itself — no need to read `git remote`.)

# TASK

Determine which tickets are **unblocked** and can be worked right now.

A ticket is **blocked** if ANY of these hold:

1. Its native `blocked_by` dependencies contain an issue that is still **open**.
2. Its `## Blocked by` section references a ticket that is still open (fallback if no native edge was wired).
3. Its branch already has an open PR (see the open-PRs list — branch format `sandcastle/issue-<number>`).

A ticket is **unblocked** if none of the above hold. Closed blockers do not block.

**Include EVERY unblocked ticket.** Do not cap the list, do not pre-select a "reasonable batch", and do not drop a ticket because it touches the same files as another one in the plan. The runner works the plan through a worker pool with a fixed concurrency limit — it decides how many run at once and pulls the next ticket as soon as one finishes. Your job is completeness of the frontier, not scheduling.

For each unblocked ticket, assign a branch name using the exact format `sandcastle/issue-{number}` (no slug or other suffix). This must be deterministic so that re-planning the same ticket always produces the same branch name and accumulated progress is preserved.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "42", "title": "Fix auth bug", "branch": "sandcastle/issue-42"}]}
</plan>

Include only unblocked tickets. Do NOT include a ticket just because everything is blocked — blocked means blocked; the run will exit and pick it up once its blockers' PRs are merged.

Always emit the `<plan>` tags, even when there is nothing to do. If no tickets are workable, output `<plan>{"issues": []}</plan>` so the run can exit cleanly.
