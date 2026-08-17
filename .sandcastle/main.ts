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
//   npm run sandcastle              # podman containers (default)
//   npm run sandcastle -- --local   # no container, agents run on this machine
//   npm run sandcastle -- --podman  # force the default back
//
// Without a flag the mode comes from SANDCASTLE_MODE (default podman).
//
// Requirements:
//   .sandcastle/.env needs GH_TOKEN with repo permissions:
//   Issues (R/W), Pull requests (R/W), Contents (R/W), Metadata (R).
//   Local mode additionally needs claude, gh and node on the host, plus Git for
//   Windows' bash on Windows (SANDCASTLE_BASH overrides the search).

import * as sandcastle from '@ai-hero/sandcastle';
import { noSandbox } from '@ai-hero/sandcastle/sandboxes/no-sandbox';
import { podman } from '@ai-hero/sandcastle/sandboxes/podman';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
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
 * Where the agents run: in a Podman container, or straight on the host.
 *
 * - `podman` (default) — one container per ticket, built from the Containerfile.
 *   The agent cannot touch anything outside the bind-mounted worktree.
 * - `local` — sandcastle's `noSandbox()` provider. No container: the ticket's
 *   git worktree is created under `.sandcastle/worktrees/` and the agent runs
 *   directly on the host, with the host's Claude CLI, `gh`, and node. No image
 *   build, no podman machine, no per-container RAM ceiling — and no isolation
 *   either: the agent can reach the whole machine.
 *
 * Selected with `npm run sandcastle -- --local` (`--podman` forces the default
 * back); without a flag the mode comes from SANDCASTLE_MODE.
 */
const SANDBOX_MODE: 'podman' | 'local' = process.argv.includes('--podman')
	? 'podman'
	: process.argv.includes('--local') || process.env.SANDCASTLE_MODE === 'local'
		? 'local'
		: 'podman';

/**
 * Maximum number of sandboxes (= Podman containers) alive at the same time.
 *
 * This is the parallelism knob, and the main lever on how long a run takes: a
 * ticket costs 30 minutes to 2 hours, so a serial run cannot drain a wave of a
 * dozen tickets overnight.
 *
 * It stays at 1 anyway. `~/.wslconfig` caps the podman machine at 6 GB, and the
 * measurements recorded there (ticket #175) put a heavy ticket at a 3.81 GiB
 * peak — two of those would be OOM-killed. Raising this needs the separate
 * machine that wayfinder card #174 decides on, not an edit here.
 *
 * In `local` mode the ceiling is the host's RAM instead, and the workers still
 * get one worktree each — but nothing stops a runaway agent from taking the
 * machine down with it, so raise it there deliberately too.
 */
const POOL_SIZE = 1;

/**
 * Number of plan→work waves. Raising this only helps when blockers' PRs get
 * merged between waves (or to retry tickets that failed in an earlier wave) —
 * the planner skips tickets that already have an open PR either way.
 */
const WAVES = 1;

/**
 * Ref a ticket branch is forked from when it does not exist yet. Ignored for a
 * branch that already exists, so a re-run keeps its progress.
 *
 * Pinned instead of left at HEAD: the tickets target `main`, and the host repo
 * may well be checked out somewhere else when the run starts. Make sure `main`
 * is up to date before starting — sandcastle does not fetch.
 */
const BASE_BRANCH = 'main';

/** Agent turns the implementer gets before being cut off. */
const IMPLEMENT_ITERATIONS = 100;

/**
 * Agent turns for the PR agent (push + gh pr create).
 *
 * 3 was too tight — #112 burned all three without emitting the completion
 * signal. The PR agent is cheap, so give it headroom.
 */
const PR_ITERATIONS = 5;

/** Every prompt in .sandcastle/ ends with this tag; it stops the turn loop early. */
const COMPLETION_SIGNAL = '<promise>COMPLETE</promise>';

/** An agent that produces no output for this long is treated as hung and fails. */
const IDLE_TIMEOUT_SECONDS = 900;

/**
 * Per-container CPU cap, via `podman run --cpus`. `undefined` = unconstrained.
 * Podman mode only — `local` mode has no such knob.
 *
 * With POOL_SIZE = 1 there is nothing to share, so this stays off. When raising
 * POOL_SIZE, set it so POOL_SIZE * CPUS_PER_CONTAINER leaves the host headroom.
 * Podman has no memory flag on WSL — `podman machine set --memory` is rejected
 * there. RAM is capped in `~/.wslconfig` instead, and only takes effect after
 * `wsl --shutdown` + `podman machine start`.
 */
const CPUS_PER_CONTAINER: number | undefined = undefined;

/**
 * Podman network the sandboxes attach to. It exists to pin DNS.
 *
 * Podman's default network hands the container the WSL stub resolver
 * (`nameserver 10.255.255.254`). That resolver went bad mid-run on 2026-08-05
 * and answered NOTIMP, so every agent died with
 * `API Error: Unable to connect to API (ENOTIMP)` while npm and git kept
 * working. This network forwards DNS to public resolvers instead.
 *
 * Create it once per podman machine — if it is missing, the first container
 * fails with `network not found`:
 *
 *   podman network create --dns 1.1.1.1 --dns 8.8.8.8 sandcastle-net
 */
const PODMAN_NETWORK = 'sandcastle-net';

/** Attempts per agent run before the ticket is given up on. */
const RUN_ATTEMPTS = 3;

/** Wait before retrying an agent run, per attempt already spent. */
const RETRY_BACKOFF_SECONDS = [60, 180];

/**
 * Consecutive tickets that may die of transient API/connect failures before the
 * whole run is aborted.
 *
 * On 2026-08-05 nine tickets in a row ran into a broken resolver, ~9 minutes
 * each, all doomed from the start. One dead ticket is bad luck; three in a row
 * means the environment is broken and the remaining plan is worth more
 * unspent — the branches keep their progress for the next run.
 */
const TRANSIENT_FAILURE_BUDGET = 3;

// ---------------------------------------------------------------------------
// Local mode: running the agents on the host
//
// `noSandbox()` still creates the git worktree under .sandcastle/worktrees/ and
// still collects the commits — only the place the commands run changes. On
// Windows that needs one correction.
// ---------------------------------------------------------------------------

/**
 * Find Git for Windows' bash.
 *
 * `noSandbox()` runs commands through `cmd.exe` on win32, and nothing here
 * survives that: sandcastle quotes every command POSIX-style (the agent call
 * comes out as `claude --model 'claude-opus-5' …`, and cmd.exe hands the quotes
 * to the CLI, which then reports the model does not exist), and the prompts'
 * shell blocks are POSIX too — plan-prompt.md passes `--jq` filters full of `|`
 * inside single quotes, which cmd.exe would read as pipes. So the local
 * provider routes `exec` through the bash that ships with git.
 *
 * Deliberately no bare `bash` fallback: on Windows that resolves to
 * `System32\bash.exe`, the WSL launcher — the agent would run in the Linux
 * distro with a different filesystem and a different PATH.
 */
function resolveBash(): string {
	const candidates = [
		process.env.SANDCASTLE_BASH,
		// git --exec-path → <git>/mingw64/libexec/git-core; bash sits three up.
		(() => {
			try {
				const execPath = execFileSync('git', ['--exec-path'], {
					encoding: 'utf8',
					windowsHide: true
				}).trim();
				return join(dirname(dirname(dirname(execPath))), 'bin', 'bash.exe');
			} catch {
				return undefined;
			}
		})(),
		'C:\\Program Files\\Git\\bin\\bash.exe',
		`${process.env.LOCALAPPDATA ?? ''}\\Programs\\Git\\bin\\bash.exe`
	].filter((candidate): candidate is string => Boolean(candidate));

	for (const candidate of candidates) {
		try {
			execFileSync(candidate, ['-c', 'exit 0'], { stdio: 'ignore', windowsHide: true });
			return candidate;
		} catch {
			// Next candidate.
		}
	}

	console.error(
		'Local mode needs Git for Windows\u2019 bash and could not find it. Looked for:\n' +
			candidates.map((candidate) => `  ${candidate}`).join('\n') +
			'\nInstall Git for Windows, or point SANDCASTLE_BASH at its bash.exe.'
	);
	process.exit(1);
}

/** Keep only the tail of a stream so a long run cannot blow V8's string limit. */
const MAX_OUTPUT_TAIL_CHARS = 64 * 1024;

const appendBounded = (buffer: string, chunk: string) => {
	const combined = buffer + chunk;
	return combined.length > MAX_OUTPUT_TAIL_CHARS
		? combined.slice(combined.length - MAX_OUTPUT_TAIL_CHARS)
		: combined;
};

type NoSandboxHandle = {
	worktreePath: string;
	exec: (
		command: string,
		options?: { onLine?: (line: string) => void; cwd?: string; stdin?: string }
	) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
};

/**
 * `noSandbox()`, with `exec` going through bash instead of cmd.exe on Windows.
 *
 * The provider object sandcastle hands out exposes only `name` and `env` in its
 * public type; `create` is internal, hence the cast. Everything else — worktree,
 * commit collection, lifecycle — stays untouched upstream code.
 */
const localSandbox = () => {
	const base = noSandbox();
	if (process.platform !== 'win32') return base;

	const bash = resolveBash();
	const internal = base as unknown as {
		create: (options: {
			worktreePath: string;
			env: Record<string, string>;
		}) => Promise<NoSandboxHandle>;
	};

	return {
		...base,
		create: async (options: { worktreePath: string; env: Record<string, string> }) => {
			const handle = await internal.create(options);
			const env = { ...process.env, ...options.env };

			return {
				...handle,
				exec: (command: string, execOptions?: Parameters<NoSandboxHandle['exec']>[1]) =>
					new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
						const child = spawn(bash, ['-c', command], {
							cwd: execOptions?.cwd ?? handle.worktreePath,
							env,
							stdio: [execOptions?.stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
							windowsHide: true
						});

						if (execOptions?.stdin !== undefined) {
							child.stdin!.write(execOptions.stdin);
							child.stdin!.end();
						}

						// Both are non-null: the stdio above pipes them unconditionally.
						const childStdout = child.stdout!;
						const childStderr = child.stderr!;

						let stdout = '';
						let stderr = '';
						childStderr.on('data', (chunk: Buffer) => {
							stderr = appendBounded(stderr, chunk.toString());
						});

						// Line-by-line streaming is contract, not comfort: the live log
						// feeds on it, and the idle timeout measures against it.
						if (execOptions?.onLine) {
							const onLine = execOptions.onLine;
							createInterface({ input: childStdout }).on('line', (line: string) => {
								stdout = appendBounded(stdout, `${line}\n`);
								onLine(line);
							});
						} else {
							childStdout.on('data', (chunk: Buffer) => {
								stdout = appendBounded(stdout, chunk.toString());
							});
						}

						child.on('error', (error) => reject(new Error(`exec failed: ${error.message}`)));
						child.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
					})
			};
		}
	} as unknown as ReturnType<typeof noSandbox>;
};

const sandboxProvider = () =>
	SANDBOX_MODE === 'local'
		? localSandbox()
		: podman({
				network: PODMAN_NETWORK,
				...(CPUS_PER_CONTAINER === undefined ? {} : { cpus: CPUS_PER_CONTAINER })
			});

/**
 * The agent for one run.
 *
 * Sandcastle only passes `--dangerously-skip-permissions` when a sandbox encloses
 * the agent; without one it deliberately leaves permissions to the user. An AFK
 * run has nobody to answer a permission prompt, so local mode sets the flag back
 * — the real price of the mode, said once instead of hidden in three places.
 *
 * Not via the `permissionMode` option: that would *replace* the flag rather than
 * set it, and the two are mutually exclusive on Claude's CLI.
 */
const agentProvider = (model: string) => {
	const base = sandcastle.claudeCode(model, { effort: 'high' });
	if (SANDBOX_MODE !== 'local') return base;

	return {
		...base,
		buildPrintCommand: (options: Parameters<typeof base.buildPrintCommand>[0]) =>
			base.buildPrintCommand({ ...options, dangerouslySkipPermissions: true })
	};
};

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
	| { readonly status: 'failed'; readonly error: unknown; readonly transient: boolean }
	| { readonly status: 'skipped' };

const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/**
 * Does this failure look like the API or the network, rather than the ticket?
 *
 * Sandcastle surfaces an agent crash as `claude-code exited with code N:` plus
 * the CLI's last output, so the CLI's own error line is what we match on.
 * Transient failures are worth another attempt; a type error in the worktree is
 * not.
 */
function isTransient(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /Unable to connect to API|API Error: 5\d\d|Overloaded|ENOTIMP|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(
		message
	);
}

/**
 * Run one agent, retrying transient API/connect failures in the same sandbox.
 *
 * The sandbox survives such a failure — the container is fine, only the CLI's
 * call to the API was not — so a retry costs a fresh agent run, not another
 * `npm install`. Whatever the agent already committed stays on the branch, so
 * the retry picks up where it left off.
 */
async function runWithRetry(
	sandbox: Awaited<ReturnType<typeof sandcastle.createSandbox>>,
	label: string,
	options: Parameters<typeof sandbox.run>[0]
): Promise<Awaited<ReturnType<typeof sandbox.run>>> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= RUN_ATTEMPTS; attempt++) {
		try {
			return await sandbox.run(options);
		} catch (error) {
			lastError = error;
			if (!isTransient(error) || attempt === RUN_ATTEMPTS) throw error;

			const backoff = RETRY_BACKOFF_SECONDS[attempt - 1] ?? RETRY_BACKOFF_SECONDS.at(-1)!;
			console.warn(
				`${label} transient failure on attempt ${attempt}/${RUN_ATTEMPTS}, ` +
					`retrying in ${backoff}s: ${error}`
			);
			await sleep(backoff);
		}
	}

	throw lastError;
}

/**
 * Implement and publish one ticket. Implementer and PR agent share a single
 * sandbox so they see the same worktree and branch.
 *
 * There is no separate review run: the implement prompt drives /implement →
 * /tdd → /code-review, so the review already happened on this branch.
 */
async function workTicket(issue: PlannedIssue, label: string): Promise<TicketOutcome> {
	const sandbox = await sandcastle.createSandbox({
		branch: issue.branch,
		baseBranch: BASE_BRANCH,
		sandbox: sandboxProvider(),
		// No copyToWorktree here: sandcastle implements it via the Unix `cp`
		// binary, which doesn't exist on a Windows host (spawn cp ENOENT).
		// The onSandboxReady `npm install` hook provisions node_modules instead.
		hooks
	});

	try {
		const implement = await runWithRetry(sandbox, `${label} implementer`, {
			name: 'implementer',
			maxIterations: IMPLEMENT_ITERATIONS,
			completionSignal: COMPLETION_SIGNAL,
			idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
			agent: agentProvider('claude-opus-5'),
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
		await runWithRetry(sandbox, `${label} pr`, {
			name: 'pr',
			maxIterations: PR_ITERATIONS,
			completionSignal: COMPLETION_SIGNAL,
			idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
			agent: agentProvider('claude-sonnet-5'),
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

	// Circuit breaker: tickets lost to transient failures back to back. Any
	// ticket that gets to a verdict of its own resets it — the environment works.
	let consecutiveTransient = 0;
	let aborted = false;

	const worker = async (workerId: number) => {
		while (true) {
			const index = cursor++;
			const issue = issues[index];
			if (!issue) return;

			const label = `[w${workerId}] #${issue.id} (${issue.branch})`;

			if (aborted) {
				outcomes[index] = { status: 'skipped' };
				console.log(`${label} ⤼ skipped — run aborted`);
				continue;
			}

			const startedAt = Date.now();
			console.log(`${label} ▶ start — ${issue.title}`);

			try {
				outcomes[index] = await workTicket(issue, label);
			} catch (error) {
				outcomes[index] = { status: 'failed', error, transient: isTransient(error) };
			}

			const outcome = outcomes[index]!;

			if (outcome.status === 'failed' && outcome.transient) {
				consecutiveTransient++;
				if (consecutiveTransient >= TRANSIENT_FAILURE_BUDGET) {
					aborted = true;
					console.error(
						`\n✗ ${consecutiveTransient} tickets in a row lost to transient API/connect ` +
							`failures — aborting the run. The environment looks broken; the branches keep ` +
							`their progress, so re-run once it is back.\n`
					);
				}
			} else {
				consecutiveTransient = 0;
			}

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
					console.error(
						`${label} ✗ failed after ${elapsed}${outcome.transient ? ' (transient)' : ''} — ` +
							`${progress}: ${outcome.error}`
					);
					break;
				case 'skipped':
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
const skipped: PlannedIssue[] = [];

for (let wave = 1; wave <= WAVES; wave++) {
	console.log(
		`\n=== Wave ${wave}/${WAVES} (sandbox ${SANDBOX_MODE}, pool size ${POOL_SIZE}) ===\n`
	);

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
		agent: agentProvider('claude-opus-5'),
		promptFile: './.sandcastle/plan-prompt.md',
		// A malformed <plan> tag would otherwise sink the whole run. The retry
		// resumes the planner's session and tells it what was wrong with the tag.
		output: sandcastle.Output.object({ tag: 'plan', schema: planSchema, maxRetries: 2 })
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
			case 'skipped':
				skipped.push(issue);
				break;
		}
	}

	console.log(
		`\nWave ${wave} complete: ${outcomes.filter((o) => o.status === 'pr').length} PR(s), ` +
			`${outcomes.filter((o) => o.status === 'no-commits').length} without commits, ` +
			`${outcomes.filter((o) => o.status === 'failed').length} failed, ` +
			`${outcomes.filter((o) => o.status === 'skipped').length} skipped.`
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

if (skipped.length > 0) {
	console.log(`\nNever started (${skipped.length}) — the run aborted before reaching them:`);
	for (const issue of skipped) {
		console.log(`  ⤼ #${issue.id}: ${issue.title} (${issue.branch})`);
	}
}

console.log('\nReview and merge the open PRs, then re-run to work the next frontier wave.');
