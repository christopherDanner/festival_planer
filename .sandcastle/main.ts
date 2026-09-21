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
// A spent usage window does not end the run. `claude -p` has no auto-continue
// of its own, so the run handles it itself. If `.sandcastle/.env` carries a
// second subscription's token (CLAUDE_CODE_OAUTH_TOKEN_BACKUP), the run simply
// switches accounts and keeps going — same sandbox, same branch, no sleep.
// Otherwise, or once every account is spent, it reads the reset time out of the
// limit message (or polls when none is given), sleeps, and re-runs the same
// agent on the same branch. A limit at 02:00 therefore costs the hours until
// the first window rolls over, not the whole night. Only a reset further out
// than USAGE_LIMIT_MAX_WAIT_SECONDS — the weekly limit — ends the run.
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
//   Issues (R/W), Pull requests (R/W), Contents (R/W), Metadata (R),
//   plus CLAUDE_CODE_OAUTH_TOKEN; CLAUDE_CODE_OAUTH_TOKEN_BACKUP is optional.
//   Local mode additionally needs claude, gh and node on the host, plus Git for
//   Windows' bash on Windows (SANDCASTLE_BASH overrides the search).

import * as sandcastle from '@ai-hero/sandcastle';
import { noSandbox } from '@ai-hero/sandcastle/sandboxes/no-sandbox';
import { podman } from '@ai-hero/sandcastle/sandboxes/podman';
import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environment
//
// Every path below assumes the run starts at the repo root, the way
// `npm run sandcastle` does — the prompt files are addressed the same way.
// ---------------------------------------------------------------------------

/** Where this run reads its tokens from. */
const ENV_FILE = join(process.cwd(), '.sandcastle', '.env');

/**
 * Read `.sandcastle/.env` into this process.
 *
 * Sandcastle reads that file itself and hands the sandbox **only the keys named
 * there**, falling back to `process.env` per key — so the agents get their
 * tokens without this. What they do not reach is this script: whether a backup
 * account exists at all is decided here, in `ACCOUNTS`, and that decision needs
 * the key in the runner's own environment.
 */
function loadSandcastleEnv(): void {
	if (!existsSync(ENV_FILE)) {
		console.error(
			`\n${ENV_FILE} is missing. Copy .sandcastle/.env.example to it and fill in ` +
				`CLAUDE_CODE_OAUTH_TOKEN and GH_TOKEN.\n`
		);
		process.exit(1);
	}

	// Split on CRLF too: the file is edited on Windows, and a trailing `\r`
	// would otherwise be carried into the token.
	for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
		const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
		if (!match) continue;

		const [, key, rawValue] = match;
		const value = rawValue!.trim().replace(/^["']|["']$/g, '');
		if (value && !process.env[key!]) process.env[key!] = value;
	}
}

loadSandcastleEnv();

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

/**
 * How long a run may sit and wait for a spent usage limit to reset.
 *
 * The subscription's window is five hours, so six covers a limit hit right at
 * the start of one plus the grace below. What it deliberately does **not**
 * cover is the weekly limit: that resets days out, and a run that sleeps
 * through a weekend holds a worktree, a base ref and a node_modules hostage for
 * nothing. Past this deadline the ticket fails and the run aborts — the branch
 * keeps its commits either way.
 */
const USAGE_LIMIT_MAX_WAIT_SECONDS = 6 * 60 * 60;

/**
 * Re-check interval when the limit message names no reset time.
 *
 * The wait then becomes polling: sleep, try the agent again, and let the API
 * itself say whether the window is back. Half an hour is the compromise — a
 * wasted agent start every 30 minutes at worst, and at most 30 minutes of the
 * night burnt after an early reset.
 */
const USAGE_LIMIT_POLL_SECONDS = 30 * 60;

/**
 * Added to a reset time the CLI *did* name, before retrying.
 *
 * Resuming on the exact second risks another rejection (clock skew, a window
 * that closes server-side a moment later) which would cost a whole poll
 * interval. A minute is cheap insurance.
 */
const USAGE_LIMIT_GRACE_SECONDS = 60;

// ---------------------------------------------------------------------------
// Claude accounts
//
// A run may spend more than one subscription. The second one is what keeps a
// night going when the first one's window closes: instead of sleeping until the
// reset, the run switches accounts and carries on, and only sleeps once every
// account it knows is spent. See `withUsageLimitWait`.
// ---------------------------------------------------------------------------

/** The env key the Claude CLI itself reads. */
const PRIMARY_TOKEN_KEY = 'CLAUDE_CODE_OAUTH_TOKEN';

/** A second subscription's token, if `.sandcastle/.env` carries one. */
const BACKUP_TOKEN_KEY = 'CLAUDE_CODE_OAUTH_TOKEN_BACKUP';

interface Account {
	/** Env key holding this account's token, as named in `.sandcastle/.env`. */
	readonly tokenKey: string;
	/** What the log calls it. */
	readonly label: string;
	/**
	 * The window this account is sitting out, once it has hit a limit. `known`
	 * is false when the limit message named no reset time and `at` is therefore
	 * nothing but the next time to look again.
	 */
	spent?: { at: number; known: boolean };
}

/**
 * The accounts this run may spend, in the order they are tried.
 *
 * The backup only joins if its token actually resolved — `loadSandcastleEnv`
 * has already read `.sandcastle/.env` into this process, so an absent or empty
 * key simply means one account, and every path below behaves exactly as it did
 * before the second one existed.
 */
const ACCOUNTS: Account[] = [
	{ tokenKey: PRIMARY_TOKEN_KEY, label: 'primary account' },
	...(process.env[BACKUP_TOKEN_KEY]
		? [{ tokenKey: BACKUP_TOKEN_KEY, label: 'backup account' }]
		: [])
];

/** Index into `ACCOUNTS` of the one every agent command currently uses. */
let activeAccount = 0;

/**
 * Shell prefix that points the CLI at the account currently in force.
 *
 * Empty while the primary is active, so the default path runs exactly the
 * command sandcastle would have built. Otherwise the CLI's own key is
 * overridden for the length of that one command — which is what makes a switch
 * free: the container keeps running, the worktree and the branch are untouched,
 * and the next agent turn simply authenticates as someone else.
 *
 * The token is passed **by name**, never inlined: `podman exec` puts the whole
 * command into the host's process list, and a `local` run puts it into a bash
 * command line. Both accounts' tokens are in the sandbox environment already,
 * because `.sandcastle/.env` names both keys.
 */
function accountEnvPrefix(): string {
	const account = ACCOUNTS[activeAccount]!;
	if (account.tokenKey === PRIMARY_TOKEN_KEY) return '';
	return `${PRIMARY_TOKEN_KEY}="$${account.tokenKey}" `;
}

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
 *
 * `buildPrintCommand` is called afresh for every agent turn, so it — and not
 * the sandbox's environment, which is fixed at container start — is where the
 * active account is read. A switch therefore takes effect on the next turn.
 */
const agentProvider = (model: string) => {
	const base = sandcastle.claudeCode(model, { effort: 'high' });

	return {
		...base,
		buildPrintCommand: (options: Parameters<typeof base.buildPrintCommand>[0]) => {
			const built = base.buildPrintCommand({
				...options,
				dangerouslySkipPermissions: SANDBOX_MODE === 'local' || options.dangerouslySkipPermissions
			});

			return { ...built, command: `${accountEnvPrefix()}${built.command}` };
		}
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

/** What a thrown thing says, whatever it is. */
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Does this failure look like the API or the network, rather than the ticket?
 *
 * Sandcastle surfaces an agent crash as `claude-code exited with code N:` plus
 * the CLI's last output, so the CLI's own error line is what we match on.
 * Transient failures are worth another attempt; a type error in the worktree is
 * not.
 */
function isTransient(error: unknown): boolean {
	return /Unable to connect to API|API Error: 5\d\d|Overloaded|ENOTIMP|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(
		errorText(error)
	);
}

/**
 * Has the account's window run out?
 *
 * The wait cannot be left to the CLI. `claude -p` does not sit out a limit the
 * way the interactive session does: it either exits, or it goes quiet until
 * sandcastle's idle timeout kills it. Either way the wait has to happen here.
 *
 * Matched broadly on purpose: the wording is the CLI's, not an API contract,
 * and it has changed more than once — "usage limit reached", and lately
 * "You've hit your session limit · resets 4:20pm". So the patterns bind to the
 * noun ("session limit", "weekly limit") and not to a whole sentence: a false
 * positive costs a sleep, a false negative costs the rest of the night.
 */
function isUsageLimit(error: unknown): boolean {
	return /usage limit|session limit|\b5-hour limit\b|weekly limit|rate_limit_error|API Error: 429|Too Many Requests/i.test(
		errorText(error)
	);
}

/**
 * When the spent window reopens, in epoch millis — if the message says so.
 *
 * Four shapes get read, because the CLI has used all of them: a retry delay, the
 * epoch the older marker appended (`usage limit reached|1757308800`), an ISO
 * timestamp, and a wall-clock time ("resets at 5am", "continuing automatically
 * at 5:30 PM"). `undefined` means the message named nothing usable — the caller
 * then polls instead of guessing.
 */
function usageLimitResetAt(error: unknown, now: number): number | undefined {
	const message = errorText(error);
	const plausible = (at: number) => (at > now && at < now + 8 * 24 * 3600_000 ? at : undefined);

	// `retry after 1800 seconds`, `retry-after: 1800`
	const delay = /retry[-\s]?after\D{0,12}(\d{1,6})/i.exec(message);
	if (delay) return plausible(now + Number(delay[1]) * 1000);

	// Epoch, seconds or millis, as the limit markers carry it.
	const epoch = /\b(1\d{12}|1\d{9})\b/.exec(message);
	if (epoch) {
		const digits = epoch[1]!;
		return plausible(Number(digits) * (digits.length === 10 ? 1000 : 1));
	}

	const iso = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?/.exec(message);
	if (iso) {
		const at = Date.parse(iso[0]);
		if (!Number.isNaN(at)) return plausible(at);
	}

	// `resets at 5am`, `resets 05:00`, `continuing automatically at 3:30 PM` —
	// local wall clock, which is the form the CLI actually prints. Taken as the
	// next occurrence of that time; the keyword prefix keeps it from reading some
	// unrelated number (an HTTP status, a ticket id) as an hour.
	const clock =
		/(?:resets?|automatically|again)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(message);
	if (clock) {
		let hour = Number(clock[1]);
		const meridiem = clock[3]?.toLowerCase();
		if (meridiem === 'pm' && hour < 12) hour += 12;
		if (meridiem === 'am' && hour === 12) hour = 0;
		if (hour > 23) return undefined;

		const at = new Date(now);
		at.setHours(hour, Number(clock[2] ?? 0), 0, 0);
		if (at.getTime() <= now) at.setDate(at.getDate() + 1);
		return plausible(at.getTime());
	}

	return undefined;
}

/** Did sandcastle cut the agent off for producing no output? */
const isIdleTimeout = (error: unknown) => /Agent idle for \d+ seconds/i.test(errorText(error));

/**
 * Where sandcastle writes an agent's live log.
 *
 * Mirrors its `buildLogFilename` — branch, separators replaced, agent name
 * appended. Reconstructing it couples us to that scheme, but the alternative
 * (naming the log ourselves) would rename every existing log; a scheme change
 * upstream only costs the extra evidence below, never the run.
 */
const agentLogPath = (branch: string, name: string) =>
	join(process.cwd(), '.sandcastle', 'logs', `${branch.replace(/[/\\:*?"<>|]/g, '-')}-${name}.log`);

/**
 * Last `bytes` of a log file, or an empty string if it is not readable.
 *
 * Read through a handle instead of `readFileSync`: an implementer log runs to
 * megabytes, and all that is wanted is how it ends.
 */
function logTail(path: string, bytes = 64 * 1024): string {
	let handle: number | undefined;
	try {
		const size = statSync(path).size;
		const length = Math.min(size, bytes);
		const buffer = Buffer.alloc(length);
		handle = openSync(path, 'r');
		readSync(handle, buffer, 0, length, size - length);
		return buffer.toString('utf8');
	} catch {
		return '';
	} finally {
		if (handle !== undefined) closeSync(handle);
	}
}

/**
 * One wait shared by every worker: while it is set, every account's window is
 * known to be closed, so nobody spends a sandbox start or an agent turn to
 * find out again.
 */
let usageLimitGate: Promise<void> | null = null;

const formatClock = (at: number) =>
	new Date(at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

/**
 * Run something, sitting out spent usage windows instead of failing on them.
 *
 * This is what keeps an AFK run from throwing away the night. A limit hit at
 * 02:00 first looks for an account that still has a window (see `ACCOUNTS`);
 * finding one costs nothing but a retry, because the sandbox, the worktree and
 * the branch all stay as they are. Only when every account is spent does the
 * run sleep, until the first of them reopens, and then re-runs the same agent
 * in the same sandbox — so whatever the implementer already committed is where
 * it picks up. Nothing is retried faster than the limit allows, and the run
 * only gives up when no account reopens within
 * `USAGE_LIMIT_MAX_WAIT_SECONDS` — the weekly limit on every account, in
 * practice.
 *
 * The wait costs nothing but wall-clock time: no agent turn, no API call, no
 * container. It is deliberately *outside* `sandbox.run`, so the agent's idle
 * timeout never sees it.
 *
 * `logPath` is the agent's live log, and it is there for the case where the CLI
 * does **not** exit on a limit: newer builds sit and wait for the window
 * themselves, print nothing while they do, and sandcastle's idle timeout is
 * what fires. That error says nothing about limits, so the log's last lines are
 * the only place the marker exists.
 */
async function withUsageLimitWait<T>(
	label: string,
	run: () => Promise<T>,
	logPath?: string
): Promise<T> {
	const deadline = Date.now() + USAGE_LIMIT_MAX_WAIT_SECONDS * 1000;

	while (true) {
		// Someone else is already sitting out the same limit — join that wait.
		if (usageLimitGate) await usageLimitGate;

		// The account this attempt spends, held so that a limit landing after
		// another worker already switched is not booked against the fresh one.
		const spender = ACCOUNTS[activeAccount]!;

		try {
			return await run();
		} catch (error) {
			const tail = logPath && isIdleTimeout(error) ? logTail(logPath) : '';
			// Whichever text carries the limit is also the text the reset time is
			// read from — the error itself, or the log behind an idle timeout.
			const evidence = isUsageLimit(error) ? error : isUsageLimit(tail) ? tail : undefined;
			if (evidence === undefined) throw error;

			if (evidence === tail) {
				console.warn(
					`${label} idle timeout, but the log ends in a usage limit — treating it as one.`
				);
			}

			const now = Date.now();

			// Another worker switched while this run was in flight: the limit it hit
			// belongs to the account they already booked. Retry on the new one.
			if (spender !== ACCOUNTS[activeAccount]) continue;

			const resetAt = usageLimitResetAt(evidence, now);
			spender.spent = resetAt
				? { at: resetAt + USAGE_LIMIT_GRACE_SECONDS * 1000, known: true }
				: { at: now + USAGE_LIMIT_POLL_SECONDS * 1000, known: false };

			// A second subscription turns the wait into a switch — same sandbox,
			// same branch, and the next agent turn authenticates as the other one.
			const spare = ACCOUNTS.findIndex((account) => (account.spent?.at ?? 0) <= now);
			if (spare !== -1) {
				activeAccount = spare;
				console.warn(
					`${label} ⇄ usage limit on the ${spender.label} ` +
						`(${resetAt ? `resets ${formatClock(resetAt)}` : 'no reset time given'}) — ` +
						`switching to the ${ACCOUNTS[spare]!.label}`
				);
				continue;
			}

			// Every account is spent. Sleep until the first one reopens, and come
			// back on that one rather than on whichever was last in force.
			const earliest = ACCOUNTS.reduce((a, b) => (a.spent!.at <= b.spent!.at ? a : b));
			const wakeAt = earliest.spent!.at;

			if (wakeAt > deadline) {
				console.error(
					`${label} ✗ usage limit, and no account reopens within ` +
						`${formatDuration(USAGE_LIMIT_MAX_WAIT_SECONDS * 1000)} ` +
						`(earliest ${formatClock(wakeAt)}) — giving up. This is what a weekly ` +
						`limit looks like; the branch keeps its commits.`
				);
				throw error;
			}

			if (!usageLimitGate) {
				console.warn(
					`${label} ⏸ usage limit on the ${spender.label}` +
						`${ACCOUNTS.length > 1 ? ', every account spent' : ''} — ` +
						`${earliest.spent!.known ? 'resumes' : 're-checking'} ${formatClock(wakeAt)} ` +
						`(${formatDuration(wakeAt - now)})`
				);
				usageLimitGate = sleep((wakeAt - now) / 1000).then(() => {
					usageLimitGate = null;
					const reopened = Date.now();
					for (const account of ACCOUNTS) {
						if (account.spent && account.spent.at <= reopened) account.spent = undefined;
					}
					activeAccount = ACCOUNTS.indexOf(earliest);
					console.log(`${label} ▶ the ${earliest.label}'s window should be back — resuming`);
				});
			}

			await usageLimitGate;
		}
	}
}

/**
 * Run one agent, retrying transient API/connect failures in the same sandbox.
 *
 * The sandbox survives such a failure — the container is fine, only the CLI's
 * call to the API was not — so a retry costs a fresh agent run, not another
 * `npm install`. Whatever the agent already committed stays on the branch, so
 * the retry picks up where it left off.
 *
 * A spent usage window is handled a layer in (`withUsageLimitWait`) and does
 * not consume an attempt: it is not a failure to retry three times, it is a
 * wait. Only if the window stays shut past the deadline does the error reach
 * this loop, where it counts as non-transient and fails the ticket at once.
 */
async function runWithRetry(
	sandbox: Awaited<ReturnType<typeof sandcastle.createSandbox>>,
	label: string,
	branch: string,
	options: Parameters<typeof sandbox.run>[0]
): Promise<Awaited<ReturnType<typeof sandbox.run>>> {
	let lastError: unknown;
	const logPath = options.name ? agentLogPath(branch, options.name) : undefined;

	for (let attempt = 1; attempt <= RUN_ATTEMPTS; attempt++) {
		try {
			return await withUsageLimitWait(label, () => sandbox.run(options), logPath);
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
		const implement = await runWithRetry(sandbox, `${label} implementer`, issue.branch, {
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
		await runWithRetry(sandbox, `${label} pr`, issue.branch, {
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

			// A limit that survived `withUsageLimitWait` reopens further out than the
			// run is willing to sleep — a weekly limit, in practice. Every remaining
			// ticket would hit it too, so stop instead of burning the plan one
			// sandbox start at a time.
			if (outcome.status === 'failed' && isUsageLimit(outcome.error)) {
				aborted = true;
				console.error(
					`\n✗ Usage limit outlasts the ${formatDuration(USAGE_LIMIT_MAX_WAIT_SECONDS * 1000)} ` +
						`wait — aborting the run. The branches keep their progress; re-run once the window ` +
						`is back.\n`
				);
			} else if (outcome.status === 'failed' && outcome.transient) {
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

// Whether a spent window pauses the run or only switches it. Worth one line at
// the top of an AFK log: a missing or misspelled backup key is otherwise only
// noticed hours later, by the run sleeping where it could have carried on.
console.log(
	ACCOUNTS.length > 1
		? `Accounts: ${ACCOUNTS.length} — a spent window switches to the ${ACCOUNTS[1]!.label} instead of waiting.`
		: `Accounts: 1 — a spent window is waited out. Add ${BACKUP_TOKEN_KEY} to .sandcastle/.env to switch instead.`
);

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
	const plan = await withUsageLimitWait('planner', () =>
		sandcastle.run({
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
		})
	);

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
