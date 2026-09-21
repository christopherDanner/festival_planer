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
/** Der einzige Einstieg der App — alles andere hängt daran. */
const ENTRY = path.join(SRC, 'main.tsx');

/**
 * Deckt `from '…'`, `import('…')` und `export … from '…'` ab. Bewusst grob:
 * Der Ausdruck greift auch in Kommentaren und Zeichenketten. Das macht den
 * Graph großzügiger, als er sein müsste — er hält ein Bauteil eher für
 * lebendig als für tot und meldet darum nie ein benutztes Bauteil an.
 */
const SPECIFIER = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

/** `allowJs` steht in der tsconfig auf true, also zählen JS-Dateien mit. */
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const SOURCE_FILE = /\.[jt]sx?$/;
const TEST_FILE = /\.test\.[jt]sx?$/;

export interface ComponentTree {
	/** Alle Bauteile unter `src/components/`, ohne Tests — als Pfad relativ zu `src/`. */
	modules: string[];
	/** Davon die, zu denen vom Einstieg der App kein Weg führt. */
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
 * Tests gehören nicht zum Bestand: Ein Bauteil, das nur noch sein eigener Test
 * anfasst, ist genauso tot wie eines, das niemand anfasst — und vom Einstieg
 * der App führt ohnehin kein Weg in einen Test.
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

	// `base` selbst zuerst: `main.tsx` schreibt die Endung aus (`./App.tsx`).
	const candidates = [
		base,
		...EXTENSIONS.map((extension) => `${base}${extension}`),
		...EXTENSIONS.map((extension) => path.join(base, `index${extension}`))
	];
	return candidates.find((candidate) => files.has(candidate)) ?? null;
}

export function analyzeComponentTree(): ComponentTree {
	const files = new Set(sourceFiles(SRC));
	if (!files.has(ENTRY)) {
		// Ohne Einstieg wäre jedes Bauteil unerreichbar — ein Guard, der alles
		// anmeckert, wird abgeschaltet. Lieber laut hier abbrechen.
		throw new Error(`Einstieg ${relative(ENTRY)} nicht gefunden — Pfad im Guard veraltet?`);
	}

	const importsOf = new Map<string, string[]>(
		[...files].map((file) => [
			file,
			[...readFileSync(file, 'utf8').matchAll(SPECIFIER)]
				.map((match) => resolveSpecifier(files, file, match[1]))
				.filter((target): target is string => target !== null)
		])
	);

	// Gelaufen wird von `main.tsx` aus, nicht von allem, was kein Bauteil ist.
	// Sonst hielte eine Seite, die selbst niemand mehr aufruft, ihre Bauteile
	// am Leben — und genau so bleibt ein abgelöstes Muster unbemerkt liegen.
	const reached = new Set<string>();
	const queue = [ENTRY];
	while (queue.length > 0) {
		const file = queue.pop() as string;
		if (reached.has(file)) continue;
		reached.add(file);
		queue.push(...(importsOf.get(file) ?? []));
	}

	const modules = [...files].filter((file) => isComponent(file) && !isTest(file)).sort();
	return {
		modules: modules.map(relative),
		unreachable: modules.filter((file) => !reached.has(file)).map(relative)
	};
}
