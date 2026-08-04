// Parallel Planner with Review — PR-based orchestration loop
//
// Fits the /wayfinder → /to-tickets → /implement workflow:
//   /wayfinder   charts decisions as wayfinder:* tickets (HITL — not touched here).
//   /to-tickets  publishes implementation tickets (label `ready-for-agent`)
//                with native GitHub blocked_by edges.
//   This script  works the frontier of those tickets AFK and ends each
//                ticket with a PR against main.
//
// Phases per iteration:
//   Phase 1 (Plan):             An opus agent reads the open `ready-for-agent`
//                               tickets, checks native blocked_by edges and
//                               open PRs, and outputs a <plan> JSON listing the
//                               unblocked tickets with branch names.
//   Phase 2 (Execute + Review): Per ticket, a sandbox is created via
//                               createSandbox(). The implementer runs first
//                               (100 iterations). If it produces commits, a
//                               reviewer runs in the same sandbox on the same
//                               branch (1 iteration).
//   Phase 3 (PR):               Still in the same sandbox, a PR agent pushes
//                               the branch and opens a pull request against
//                               main (`Closes #<ticket>`). Merging the PR — a
//                               human decision — closes the ticket and
//                               unblocks its dependents.
//
// The outer loop repeats up to MAX_ITERATIONS times, but because blocked
// tickets only unblock when a blocker's PR is MERGED, a single run usually
// works exactly one frontier wave and then exits. Re-run after merging PRs
// to pick up the next wave.
//
// Usage:
//   npm run sandcastle
//
// Requirements:
//   .sandcastle/.env needs GH_TOKEN with repo permissions:
//   Issues (R/W), Pull requests (R/W), Contents (R/W), Metadata (R).

import * as sandcastle from '@ai-hero/sandcastle';
import { podman } from '@ai-hero/sandcastle/sandboxes/podman';
import { z } from 'zod';

// The planner emits its plan as JSON inside <plan> tags; Output.object extracts
// and validates it against this schema.
const planSchema = z.object({
	issues: z.array(z.object({ id: z.string(), title: z.string(), branch: z.string() }))
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of plan→execute→PR cycles before stopping. The loop exits
// early as soon as the planner finds no unblocked tickets.
const MAX_ITERATIONS = 10;

// Hooks run inside the sandbox before the agent starts each iteration.
// npm install ensures the sandbox always has fresh dependencies.
const hooks = {
	sandbox: { onSandboxReady: [{ command: 'npm install' }] }
};

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
	console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

	// -------------------------------------------------------------------------
	// Phase 1: Plan
	//
	// The planning agent reads the open `ready-for-agent` tickets (wayfinder
	// decision tickets excluded), checks native blocked_by dependencies and
	// already-open PRs, and selects the tickets that can be worked in parallel
	// right now.
	// -------------------------------------------------------------------------
	const plan = await sandcastle.run({
		hooks,
		sandbox: podman(),
		name: 'planner',
		// One iteration is enough: the planner just needs to read and reason,
		// not write code. (Structured output requires maxIterations: 1.)
		maxIterations: 1,
		agent: sandcastle.claudeCode('claude-opus-5', { effort: 'high' }),
		promptFile: './.sandcastle/plan-prompt.md',
		output: sandcastle.Output.object({ tag: 'plan', schema: planSchema })
	});

	const issues = plan.output.issues;

	if (issues.length === 0) {
		// No unblocked work — everything is done, blocked, or already in a PR.
		console.log('No unblocked tickets to work on. Exiting.');
		break;
	}

	console.log(`Planning complete. ${issues.length} ticket(s) to work in parallel:`);
	for (const issue of issues) {
		console.log(`  #${issue.id}: ${issue.title} → ${issue.branch}`);
	}

	// -------------------------------------------------------------------------
	// Phase 2 + 3: Execute, Review, PR
	//
	// For each ticket, create a sandbox via createSandbox() so implementer,
	// reviewer, and PR agent share the same sandbox instance per branch.
	//
	// Promise.allSettled means one failing pipeline doesn't cancel the others.
	// -------------------------------------------------------------------------

	const settled = await Promise.allSettled(
		issues.map(async (issue) => {
			const sandbox = await sandcastle.createSandbox({
				branch: issue.branch,
				sandbox: podman(),
				// No copyToWorktree here: sandcastle implements it via the Unix `cp`
				// binary, which doesn't exist on a Windows host (spawn cp ENOENT).
				// The onSandboxReady `npm install` hook provisions node_modules instead.
				hooks
			});

			try {
				// Run the implementer
				const implement = await sandbox.run({
					name: 'implementer',
					maxIterations: 100,
					agent: sandcastle.claudeCode('claude-opus-5', { effort: 'medium' }),
					promptFile: './.sandcastle/implement-prompt.md',
					promptArgs: {
						TASK_ID: issue.id,
						ISSUE_TITLE: issue.title,
						BRANCH: issue.branch
					}
				});

				// Nothing committed → nothing to review or publish.
				if (implement.commits.length === 0) {
					return { commits: [], prPublished: false };
				}

				/* 				// Review in the same sandbox, on the same branch.
				const review = await sandbox.run({
					name: 'reviewer',
					maxIterations: 1,
					agent: sandcastle.claudeCode('claude-sonnet-5', { effort: 'high' }),
					promptFile: './.sandcastle/review-prompt.md',
					// {{TARGET_BRANCH}} in the prompt is a sandcastle built-in (the
					// host's active branch, i.e. main) — passing it here is an error.
					promptArgs: {
						TASK_ID: issue.id,
						BRANCH: issue.branch
					}
				}); */

				// Push the branch and open a PR against main.
				await sandbox.run({
					name: 'pr',
					maxIterations: 1,
					agent: sandcastle.claudeCode('claude-sonnet-5', { effort: 'medium' }),
					promptFile: './.sandcastle/pr-prompt.md',
					promptArgs: {
						TASK_ID: issue.id,
						ISSUE_TITLE: issue.title,
						BRANCH: issue.branch
					}
				});

				return {
					commits: [...implement.commits],
					prPublished: true
				};
			} finally {
				await sandbox.close();
			}
		})
	);

	// Log any agents that threw (network error, sandbox crash, etc.).
	for (const [i, outcome] of settled.entries()) {
		if (outcome.status === 'rejected') {
			console.error(`  ✗ #${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`);
		}
	}

	const published = settled
		.map((outcome, i) => ({ outcome, issue: issues[i]! }))
		.filter((entry) => entry.outcome.status === 'fulfilled' && entry.outcome.value.prPublished)
		.map((entry) => entry.issue);

	console.log(`\nExecution complete. ${published.length} PR(s) published against main:`);
	for (const issue of published) {
		console.log(`  #${issue.id}: ${issue.title} (${issue.branch})`);
	}

	if (published.length === 0) {
		console.log('No PRs produced this iteration.');
	}

	// The next iteration re-plans: tickets with open PRs are skipped, newly
	// unblocked tickets (blockers merged & closed in the meantime) are picked up.
}

console.log(
	'\nAll done. Review and merge the open PRs, then re-run to work the next frontier wave.'
);
