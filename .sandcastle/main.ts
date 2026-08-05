// Sequential Planner — PR-based orchestration loop
//
// Fits the /wayfinder → /to-tickets → /implement workflow:
//   /wayfinder   charts decisions as wayfinder:* tickets (HITL — not touched here).
//   /to-tickets  publishes implementation tickets (label `ready-for-agent`)
//                with native GitHub blocked_by edges.
//   This script  works the frontier of those tickets AFK and ends each
//                ticket with a PR against main.
//
// Phases per wave:
//   Phase 1 (Plan):   An opus agent reads the open `ready-for-agent` tickets,
//                     checks native blocked_by edges and open PRs, and outputs
//                     a <plan> JSON listing ALL unblocked tickets with branch
//                     names. The planner does not limit the list — this script
//                     limits how many are worked at once.
//   Phase 2 (Work):   A worker pool of POOL_SIZE workers drains the plan.
//                     Each worker takes the next ticket, creates its own
//                     sandbox via createSandbox(), and runs the implementer and
//                     then the PR agent in that one sandbox on that one branch.
//                     (Review is not a separate phase — the implementer already
//                     finishes via the /code-review skill.) When a worker
//                     finishes a ticket it immediately pulls the next one,
//                     until the plan is empty.
//
//                     POOL_SIZE is the ONLY parallelism knob. POOL_SIZE = 1
//                     means strictly one container at a time. It is unrelated
//                     to the agents' `maxIterations` (how many turns a single
//                     agent gets) and to WAVES (how many plan rounds run).
//
// A wave drains its whole plan. Blocked tickets only unblock when a blocker's
// PR is MERGED, so with WAVES = 1 the run works exactly one frontier wave and
// exits. Merge the PRs, then re-run to pick up the next wave.
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

type PlannedIssue = z.infer<typeof planSchema>['issues'][number];

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Maximum number of sandboxes (= Podman containers) alive at the same time.
 *
 * This is the parallelism knob. 1 = strictly one ticket after another. Raise to
 * 2 or 3 once a sequential run is proven — and set CPUS_PER_CONTAINER when you
 * do, so the containers cannot starve the host.
 */
const POOL_SIZE = 1;

/**
 * Number of plan→work waves. Raising this only helps when blockers' PRs get
 * merged between waves (or to retry tickets that failed in an earlier wave) —
 * the planner skips tickets that already have an open PR either way.
 */
const WAVES = 1;

/** Agent turns the implementer gets before being cut off. */
const IMPLEMENT_ITERATIONS = 100;

/** Agent turns for the PR agent (push + gh pr create). */
const PR_ITERATIONS = 3;

/** Every prompt in .sandcastle/ ends with this tag; it stops the turn loop early. */
const COMPLETION_SIGNAL = '<promise>COMPLETE</promise>';

/** An agent that produces no output for this long is treated as hung and fails. */
const IDLE_TIMEOUT_SECONDS = 900;

/**
 * Per-container CPU cap, via `podman run --cpus`. `undefined` = unconstrained.
 *
 * With POOL_SIZE = 1 there is nothing to share, so this stays off. When raising
 * POOL_SIZE, set it so POOL_SIZE * CPUS_PER_CONTAINER leaves the host headroom.
 * Podman has no memory flag here — cap RAM on the machine instead:
 * `podman machine set --cpus 6 --memory 8192`.
 */
const CPUS_PER_CONTAINER: number | undefined = undefined;

const sandboxProvider = () =>
	podman(CPUS_PER_CONTAINER === undefined ? {} : { cpus: CPUS_PER_CONTAINER });

// Hooks run inside the sandbox before the agent starts each iteration.
// npm install ensures the sandbox always has fresh dependencies.
const hooks = {
	sandbox: { onSandboxReady: [{ command: 'npm install' }] }
};

// ---------------------------------------------------------------------------
// Working a single ticket
// ---------------------------------------------------------------------------

type TicketOutcome =
	| { readonly status: 'pr'; readonly commits: number }
	| { readonly status: 'no-commits' }
	| { readonly status: 'failed'; readonly error: unknown };

/**
 * Implement and publish one ticket. Implementer and PR agent share a single
 * sandbox so they see the same worktree and branch.
 *
 * There is no separate review run: the implement prompt drives /implement →
 * /tdd → /code-review, so the review already happened on this branch.
 */
async function workTicket(issue: PlannedIssue): Promise<TicketOutcome> {
	const sandbox = await sandcastle.createSandbox({
		branch: issue.branch,
		sandbox: sandboxProvider(),
		// No copyToWorktree here: sandcastle implements it via the Unix `cp`
		// binary, which doesn't exist on a Windows host (spawn cp ENOENT).
		// The onSandboxReady `npm install` hook provisions node_modules instead.
		hooks
	});

	try {
		const implement = await sandbox.run({
			name: 'implementer',
			maxIterations: IMPLEMENT_ITERATIONS,
			completionSignal: COMPLETION_SIGNAL,
			idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
			agent: sandcastle.claudeCode('claude-opus-5', { effort: 'high' }),
			promptFile: './.sandcastle/implement-prompt.md',
			promptArgs: {
				TASK_ID: issue.id,
				ISSUE_TITLE: issue.title,
				BRANCH: issue.branch
			}
		});

		// Nothing committed → nothing to publish.
		if (implement.commits.length === 0) {
			return { status: 'no-commits' };
		}

		// Push the branch and open a PR against main.
		await sandbox.run({
			name: 'pr',
			maxIterations: PR_ITERATIONS,
			completionSignal: COMPLETION_SIGNAL,
			idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
			agent: sandcastle.claudeCode('claude-sonnet-5', { effort: 'high' }),
			promptFile: './.sandcastle/pr-prompt.md',
			promptArgs: {
				TASK_ID: issue.id,
				ISSUE_TITLE: issue.title,
				BRANCH: issue.branch
			}
		});

		return { status: 'pr', commits: implement.commits.length };
	} finally {
		await sandbox.close();
	}
}

// ---------------------------------------------------------------------------
// Worker pool
// ---------------------------------------------------------------------------

const formatDuration = (ms: number) => {
	const totalMinutes = Math.round(ms / 60_000);
	return totalMinutes < 60
		? `${totalMinutes}m`
		: `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, '0')}`;
};

/**
 * Work every planned ticket, never more than `poolSize` at a time.
 *
 * The workers share one cursor into `issues`, so a worker that finishes a
 * ticket immediately pulls the next unclaimed one. The pool resolves when the
 * list is exhausted; a ticket that throws is recorded and does not stop the
 * other workers.
 */
async function drain(issues: PlannedIssue[], poolSize: number): Promise<TicketOutcome[]> {
	const outcomes = new Array<TicketOutcome>(issues.length);
	let cursor = 0;
	let finished = 0;

	const worker = async (workerId: number) => {
		while (true) {
			const index = cursor++;
			const issue = issues[index];
			if (!issue) return;

			const label = `[w${workerId}] #${issue.id} (${issue.branch})`;
			const startedAt = Date.now();
			console.log(`${label} ▶ start — ${issue.title}`);

			try {
				outcomes[index] = await workTicket(issue);
			} catch (error) {
				outcomes[index] = { status: 'failed', error };
			}

			const outcome = outcomes[index]!;
			finished++;
			const elapsed = formatDuration(Date.now() - startedAt);
			const progress = `${finished}/${issues.length}`;

			switch (outcome.status) {
				case 'pr':
					console.log(
						`${label} ✓ PR published (${outcome.commits} commits, ${elapsed}) — ${progress}`
					);
					break;
				case 'no-commits':
					console.log(`${label} ○ no commits, skipped PR (${elapsed}) — ${progress}`);
					break;
				case 'failed':
					console.error(`${label} ✗ failed after ${elapsed} — ${progress}: ${outcome.error}`);
					break;
			}
		}
	};

	const workerCount = Math.min(poolSize, issues.length);
	await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i + 1)));

	return outcomes;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const runStartedAt = Date.now();
const published: PlannedIssue[] = [];
const failed: PlannedIssue[] = [];
const withoutCommits: PlannedIssue[] = [];

for (let wave = 1; wave <= WAVES; wave++) {
	console.log(`\n=== Wave ${wave}/${WAVES} (pool size ${POOL_SIZE}) ===\n`);

	// -------------------------------------------------------------------------
	// Phase 1: Plan
	//
	// The planning agent reads the open `ready-for-agent` tickets (wayfinder
	// decision tickets excluded), checks native blocked_by dependencies and
	// already-open PRs, and returns every ticket that is unblocked right now.
	// -------------------------------------------------------------------------
	const plan = await sandcastle.run({
		hooks,
		sandbox: sandboxProvider(),
		name: 'planner',
		// One iteration is enough: the planner just needs to read and reason,
		// not write code. (Structured output requires maxIterations: 1.)
		maxIterations: 1,
		idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
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

	console.log(`Planning complete. ${issues.length} unblocked ticket(s) queued:`);
	for (const issue of issues) {
		console.log(`  #${issue.id}: ${issue.title} → ${issue.branch}`);
	}
	console.log('');

	// -------------------------------------------------------------------------
	// Phase 2: Work the queue, POOL_SIZE containers at a time.
	// -------------------------------------------------------------------------
	const outcomes = await drain(issues, POOL_SIZE);

	for (const [i, outcome] of outcomes.entries()) {
		const issue = issues[i]!;
		switch (outcome.status) {
			case 'pr':
				published.push(issue);
				break;
			case 'no-commits':
				withoutCommits.push(issue);
				break;
			case 'failed':
				failed.push(issue);
				break;
		}
	}

	console.log(
		`\nWave ${wave} complete: ${outcomes.filter((o) => o.status === 'pr').length} PR(s), ` +
			`${outcomes.filter((o) => o.status === 'no-commits').length} without commits, ` +
			`${outcomes.filter((o) => o.status === 'failed').length} failed.`
	);

	// The next wave re-plans: tickets with open PRs are skipped, newly unblocked
	// tickets (blockers merged & closed in the meantime) are picked up.
}

// ---------------------------------------------------------------------------
// Summary — the thing to read the morning after
// ---------------------------------------------------------------------------

console.log(`\n=== Run summary (${formatDuration(Date.now() - runStartedAt)}) ===\n`);

console.log(`PRs published (${published.length}):`);
for (const issue of published) {
	console.log(`  ✓ #${issue.id}: ${issue.title} (${issue.branch})`);
}

if (withoutCommits.length > 0) {
	console.log(`\nNo commits produced (${withoutCommits.length}) — check the implementer log:`);
	for (const issue of withoutCommits) {
		console.log(
			`  ○ #${issue.id}: ${issue.title} (.sandcastle/logs/${issue.branch.replace(/\//g, '-')}-implementer.log)`
		);
	}
}

if (failed.length > 0) {
	console.log(`\nFailed (${failed.length}) — re-run to retry, the branch keeps its progress:`);
	for (const issue of failed) {
		console.log(`  ✗ #${issue.id}: ${issue.title} (${issue.branch})`);
	}
}

console.log('\nReview and merge the open PRs, then re-run to work the next frontier wave.');
