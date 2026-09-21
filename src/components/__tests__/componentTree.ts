import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Import-Graph über `src/`, gelesen von der Platte statt vom Bundler.
 *
 * Gesucht ist die Frage aus #163: Liegt unter `src/components/` ein Bauteil,
 * das die App gar nicht mehr erreicht? Der Bundler beantwortet sie nicht — er
 * lässt tote Dateien einfach weg, Typecheck und Tests bleiben grün, und die
 * Datei bleibt liegen. Genau so ist der alte Seitenkopf zum zweiten
 * Kopf-Muster geworden, nachdem seine beiden Nutzer weg waren.
 */

const SRC = path.resolve(__dirname, '../..');
const COMPONENTS = path.join(SRC, 'components');

/** `from '…'`, `import('…')`, `export … from '…'` — mehr Formen nutzt das Repo nicht. */
const SPECIFIER = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$/;

export interface ComponentTree {
	/** Alle Bauteile unter `src/components/`, ohne Tests — als Pfad relativ zu `src/`. */
	modules: string[];
	/** Davon die, zu denen von den Einstiegsdateien der App kein Weg führt. */
	unreachable: string[];
}

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return SOURCE_FILE.test(entry.name) ? [full] : [];
	});
}

/**
 * Tests zählen bewusst nicht als Nutzer: Ein Bauteil, das nur noch sein eigener
 * Test anfasst, ist genauso tot wie eines, das niemand anfasst.
 */
const isTest = (file: string) =>
	TEST_FILE.test(file) || path.relative(SRC, file).split(path.sep).includes('__tests__');

const isComponent = (file: string) => file.startsWith(COMPONENTS + path.sep);

const relative = (file: string) => path.relative(SRC, file).split(path.sep).join('/');

/** Löst `@/…` und relative Angaben auf; alles andere ist ein npm-Paket. */
function resolveSpecifier(files: Set<string>, from: string, specifier: string): string | null {
	let base: string;
	if (specifier.startsWith('@/')) base = path.join(SRC, specifier.slice(2));
	else if (specifier.startsWith('.')) base = path.resolve(path.dirname(from), specifier);
	else return null;

	const candidates = [
		`${base}.ts`,
		`${base}.tsx`,
		path.join(base, 'index.ts'),
		path.join(base, 'index.tsx')
	];
	return candidates.find((candidate) => files.has(candidate)) ?? null;
}

export function analyzeComponentTree(): ComponentTree {
	const files = new Set(sourceFiles(SRC));
	const importsOf = new Map<string, string[]>(
		[...files].map((file) => [
			file,
			[...readFileSync(file, 'utf8').matchAll(SPECIFIER)]
				.map((match) => resolveSpecifier(files, file, match[1]))
				.filter((target): target is string => target !== null)
		])
	);

	// Einstiege sind alles, was kein Bauteil und kein Test ist: `main.tsx`,
	// `App.tsx`, die Seiten, `lib/`, `hooks/`, `integrations/`.
	const reached = new Set<string>();
	const queue = [...files].filter((file) => !isComponent(file) && !isTest(file));
	while (queue.length > 0) {
		const file = queue.pop() as string;
		if (reached.has(file)) continue;
		reached.add(file);
		for (const target of importsOf.get(file) ?? []) {
			if (!isTest(target)) queue.push(target);
		}
	}

	const modules = [...files].filter((file) => isComponent(file) && !isTest(file)).sort();
	return {
		modules: modules.map(relative),
		unreachable: modules.filter((file) => !reached.has(file)).map(relative)
	};
}
