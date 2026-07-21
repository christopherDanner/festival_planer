# TASK

Publish branch `{{BRANCH}}` (implementing ticket #{{TASK_ID}}: {{ISSUE_TITLE}}) as a pull request against `main`.

# STEPS

1. Make sure git pushes authenticate via the GitHub CLI: run `gh auth setup-git`.
2. Push the branch: `git push -u origin {{BRANCH}}`.
3. Check whether a PR for this branch already exists: `gh pr list --head {{BRANCH}} --state open`.
   - **If one exists**, the push above already updated it — leave a comment on the PR summarizing what changed, then you are done.
   - **If none exists**, create one.
4. Create the PR with base `main`. Write the body to a file first and use `--body-file` (never inline a multi-line body):

```
gh pr create --base main --head {{BRANCH}} --title "<conventional title> (#{{TASK_ID}})" --body-file /tmp/pr-body.md
```

The PR title matches the final commit style, e.g. `feat: <what the slice delivers> (#{{TASK_ID}})`.

The PR body must contain:

- A short summary of what the change delivers (from the user's perspective, mirroring the ticket's "What to build").
- The acceptance criteria from the ticket as a checked-off checklist.
- A "Test plan" section: which checks ran (`npm run typecheck`, `npm run test`) and their result.
- The line `Closes #{{TASK_ID}}` so merging the PR closes the ticket and unblocks its dependents.
- The footer:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

# RULES

- Do NOT merge the PR. A human reviews and merges.
- Do NOT close issue #{{TASK_ID}} — `Closes #{{TASK_ID}}` handles that on merge.
- Do NOT make any code changes in this run.

Once the PR exists, output <promise>COMPLETE</promise>.
