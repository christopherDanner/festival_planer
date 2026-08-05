import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Schema-Vertrag der Sponsoring-Tabellen (#143).
 *
 * Zwei Entscheidungen leben nur in SQL und lassen sich sonst nirgends
 * einklagen — beide sind genau die Stelle, an der jemand später das
 * Naheliegende tut und damit Daten verliert:
 *
 *   * `sponsorings.copied_from_festival_id` ist ON DELETE **SET NULL**. Wer
 *     "CASCADE wie überall" schreibt, reißt beim Löschen des Vorjahresfests
 *     die diesjährigen Sponsorings mit (ADR 0008).
 *   * `sponsors`, `sponsorings` und `sponsoring_categories` haben eine offene
 *     DELETE-Policy. Sie fehlten in der Tabellenliste von
 *     20260610000001_open_delete_within_festival.sql und widersprachen damit
 *     ADR 0002 ("ALLE übrigen Tabellen").
 *
 * Gelesen wird der Migrationsstand als Ganzes, in Dateireihenfolge — nicht
 * eine einzelne Datei. Was zählt, ist der Zustand, in dem eine frische
 * Datenbank landet. Das ist kein SQL-Interpreter: er kennt die zwei
 * Schreibweisen, in denen dieses Repo DELETE-Policies setzt, und meldet
 * lautstark, sobald eine der beobachteten Tabellen in einer Form auftaucht,
 * die er nicht sicher lesen kann (siehe `readDeletePolicies`).
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

/** Nur diese Tabellen werden verfolgt — für alles andere träfe der Leser keine Aussage. */
const WATCHED_TABLES = [
	'sponsors',
	'sponsorings',
	'sponsoring_categories',
	'sponsoring_category_assignments'
];

interface Migration {
	name: string;
	sql: string;
}

const migrations: Migration[] = readdirSync(MIGRATIONS_DIR)
	.filter((name) => name.endsWith('.sql'))
	.sort()
	.map((name) => ({ name, sql: readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8') }));

const allSql = migrations.map((m) => m.sql).join('\n');

/**
 * Schreibweise 1 — die Policy steht ausgeschrieben da:
 * `CREATE POLICY "x" ON [public.]<tabelle> FOR DELETE [TO <rolle>] USING (<prädikat>)`.
 * `TO <rolle>` ist optional, weil die ältesten Migrationen es weglassen.
 */
const NAMED_DELETE_POLICY =
	/CREATE POLICY\s+"?([\w ]+)"?\s+ON\s+(?:public\.)?(\w+)\s+FOR DELETE\s+(?:TO\s+\w+\s+)?USING\s*\(([\s\S]*?)\)\s*;/g;

/** Schreibweise 2 — dieselbe Policy als format()-Vorlage im DO-Block: `ON public.%I`. */
const TEMPLATED_DELETE_POLICY =
	/CREATE POLICY\s+"?([\w ]+)"?\s+ON\s+public\.%I\s+FOR DELETE\s+(?:TO\s+\w+\s+)?'?\s*'?USING\s*\(([\s\S]*?)\)'/g;

/** Tabellennamen aus allen `ARRAY[ 'a', 'b' ]`-Literalen einer Datei. */
const tablesInArrayLiterals = (sql: string): string[] =>
	[...sql.matchAll(/ARRAY\s*\[([\s\S]*?)\]/g)].flatMap((m) =>
		[...m[1].matchAll(/'([a-z_]+)'/g)].map((t) => t[1])
	);

interface DeletePolicy {
	migration: string;
	policy: string;
	using: string;
}

/**
 * Spielt alle Migrationen in Dateireihenfolge durch und liefert die zuletzt
 * gesetzte DELETE-Policy je beobachteter Tabelle.
 *
 * Eine Datei, die eine beobachtete Tabelle in einem ARRAY-Literal nennt, aber
 * nicht genau eine DELETE-Vorlage trägt, wäre mehrdeutig: welche Vorlage für
 * welche Liste gilt, steht dann nicht mehr fest. Statt sie stillschweigend zu
 * überspringen — womit der Wächter grün bliebe, ohne etwas zu prüfen — wirft
 * der Leser. Wer eine dritte Schreibweise einführt, erfährt es hier.
 */
const readDeletePolicies = (): Map<string, DeletePolicy> => {
	const effective = new Map<string, DeletePolicy>();

	for (const { name, sql } of migrations) {
		for (const [, policy, table, using] of sql.matchAll(NAMED_DELETE_POLICY)) {
			if (WATCHED_TABLES.includes(table)) {
				effective.set(table, { migration: name, policy, using: using.trim() });
			}
		}

		const listed = tablesInArrayLiterals(sql).filter((t) => WATCHED_TABLES.includes(t));
		if (listed.length === 0) continue;

		const templates = [...sql.matchAll(TEMPLATED_DELETE_POLICY)];
		if (templates.length !== 1) {
			throw new Error(
				`${name} nennt ${listed.join(', ')} in einer Tabellenliste, trägt aber ` +
					`${templates.length} DELETE-Vorlagen — der Schema-Vertrag kann die Wirkung ` +
					`nicht mehr eindeutig lesen. Test anpassen.`
			);
		}

		const [, policy, using] = templates[0];
		for (const table of listed) {
			effective.set(table, { migration: name, policy, using: using.trim() });
		}
	}

	return effective;
};

const deletePolicies = readDeletePolicies();

describe('sponsorings-Schema', () => {
	it('trägt Beschreibung und Wert der Sachleistung', () => {
		expect(allSql).toMatch(/ALTER TABLE sponsorings ADD COLUMN[^;]*in_kind_description TEXT/);
		expect(allSql).toMatch(/ALTER TABLE sponsorings ADD COLUMN[^;]*in_kind_value NUMERIC/);
	});

	it('zeigt mit copied_from_festival_id auf ein Fest', () => {
		expect(allSql).toMatch(
			/ALTER TABLE sponsorings ADD COLUMN[^;]*copied_from_festival_id UUID[^;]*REFERENCES festivals\(id\)/
		);
	});

	it('löst den Quellfest-Zeiger auf, statt das Sponsoring mitzureißen (SET NULL, nicht CASCADE)', () => {
		const declaration = allSql.match(
			/ALTER TABLE sponsorings ADD COLUMN[^;]*copied_from_festival_id[^;]*;/
		);
		expect(declaration).not.toBeNull();
		expect(declaration![0]).toMatch(/ON DELETE SET NULL/);
		expect(declaration![0]).not.toMatch(/ON DELETE CASCADE/);
	});
});

describe('DELETE im gemeinsamen Arbeitsbereich (ADR 0002)', () => {
	it.each(WATCHED_TABLES)('öffnet %s für jeden angemeldeten Benutzer', (table) => {
		const policy = deletePolicies.get(table);
		expect(policy, `keine DELETE-Policy für ${table} gefunden`).toBeDefined();
		expect(policy!.using, `zuletzt gesetzt in ${policy?.migration}`).toBe('true');
	});

	it('nimmt das Fest selbst bewusst aus (Blast-Radius)', () => {
		const migration = migrations.find((m) => m.name.includes('add_sponsoring_in_kind'));
		expect(migration).toBeDefined();
		const opened = tablesInArrayLiterals(migration!.sql);
		expect(opened).toEqual(['sponsors', 'sponsorings', 'sponsoring_categories']);
	});
});
