# ISSUES

Here are the open implementation tickets in the repo (label `ready-for-agent`, wayfinder decision tickets already excluded):

<issues-json>

!`gh issue list --state open --label ready-for-agent --limit 100 --json number,title,body,labels,comments --jq '[.[] | select(([.labels[].name | startswith("wayfinder:")] | any) | not) | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

Here are the currently open PRs — tickets whose branch already has an open PR are **in flight** and must NOT be planned again:

<open-prs-json>

!`gh pr list --state open --limit 100 --json number,title,headRefName`

</open-prs-json>

# CONTEXT

These tickets were created by the `/to-tickets` skill as **tracer-bullet vertical slices**. Each ticket body follows this shape:

- `## Parent` — optional link to the parent spec / wayfinder map
- `## What to build` — end-to-end behaviour
- `## Acceptance criteria` — checkboxes
- `## Blocked by` — references to blocking tickets, or "None — can start immediately"

Blocking edges also exist as **native GitHub issue dependencies**. For each candidate ticket, check them with:

```
gh api repos/{owner}/{repo}/issues/<number>/dependencies/blocked_by --jq '[.[] | {number, state}]'
```

(Substitute the owner/repo from `git remote -v`.)

# TASK

Determine which tickets are **unblocked** and can be worked in parallel right now.

A ticket is **blocked** if ANY of these hold:

1. Its native `blocked_by` dependencies contain an issue that is still **open**.
2. Its `## Blocked by` section references a ticket that is still open (fallback if no native edge was wired).
3. Its branch already has an open PR (see the open-PRs list — branch format `sandcastle/issue-<number>`).
4. It would modify the same files or modules as another ticket you are including in this plan, making merge conflicts likely — in that case include only one of them (the one that blocks the other, or the smaller one).

A ticket is **unblocked** if none of the above hold. Closed blockers do not block.

For each unblocked ticket, assign a branch name using the exact format `sandcastle/issue-{number}` (no slug or other suffix). This must be deterministic so that re-planning the same ticket always produces the same branch name and accumulated progress is preserved.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "42", "title": "Fix auth bug", "branch": "sandcastle/issue-42"}]}
</plan>

Include only unblocked tickets. Do NOT include a ticket just because everything is blocked — blocked means blocked; the run will exit and pick it up once its blockers' PRs are merged.

Always emit the `<plan>` tags, even when there is nothing to do. If no tickets are workable, output `<plan>{"issues": []}</plan>` so the run can exit cleanly.
