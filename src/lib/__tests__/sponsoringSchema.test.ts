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
 * Datenbank landet.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

const migrations = (): { name: string; sql: string }[] =>
	readdirSync(MIGRATIONS_DIR)
		.filter((name) => name.endsWith('.sql'))
		.sort()
		.map((name) => ({ name, sql: readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8') }));

const allSql = (): string => migrations().map((m) => m.sql).join('\n');

/** `CREATE POLICY "x" ON [public.]<tabelle> FOR DELETE TO authenticated USING (<prädikat>)` */
const NAMED_DELETE_POLICY =
	/CREATE POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)\s+FOR DELETE\s+TO authenticated\s+USING\s*\(([\s\S]*?)\)\s*;/g;

/** Dieselbe Policy als format()-Vorlage in einem DO-Block: `ON public.%I`. */
const TEMPLATED_DELETE_POLICY =
	/CREATE POLICY\s+"([^"]+)"\s+ON\s+public\.%I\s+FOR DELETE\s+TO authenticated\s+USING\s*\(([\s\S]*?)\)'/g;

/** Tabellennamen aus allen `ARRAY[ 'a', 'b' ]`-Literalen einer Datei. */
const tablesInArrayLiterals = (sql: string): string[] =>
	[...sql.matchAll(/ARRAY\s*\[([\s\S]*?)\]/g)].flatMap((m) =>
		[...m[1].matchAll(/'([a-z_]+)'/g)].map((t) => t[1])
	);

/**
 * Spielt alle Migrationen durch und liefert die zuletzt gesetzte
 * DELETE-Policy je Tabelle. Erfasst beide im Repo verwendeten Schreibweisen;
 * eine Datei mit mehreren Vorlagen bliebe mehrdeutig und wird für die
 * Vorlagen-Form übersprungen.
 */
const effectiveDeletePolicies = (): Map<string, { policy: string; using: string }> => {
	const effective = new Map<string, { policy: string; using: string }>();

	for (const { sql } of migrations()) {
		for (const [, policy, table, using] of sql.matchAll(NAMED_DELETE_POLICY)) {
			effective.set(table, { policy, using: using.trim() });
		}

		const templates = [...sql.matchAll(TEMPLATED_DELETE_POLICY)];
		if (templates.length !== 1) continue;
		const [, policy, using] = templates[0];
		for (const table of tablesInArrayLiterals(sql)) {
			effective.set(table, { policy, using: using.trim() });
		}
	}

	return effective;
};

describe('sponsorings-Schema', () => {
	it('trägt Beschreibung und Wert der Sachleistung', () => {
		const sql = allSql();
		expect(sql).toMatch(/ALTER TABLE sponsorings ADD COLUMN[^;]*in_kind_description TEXT/);
		expect(sql).toMatch(/ALTER TABLE sponsorings ADD COLUMN[^;]*in_kind_value NUMERIC/);
	});

	it('zeigt mit copied_from_festival_id auf ein Fest', () => {
		expect(allSql()).toMatch(
			/ALTER TABLE sponsorings ADD COLUMN[^;]*copied_from_festival_id UUID[^;]*REFERENCES festivals\(id\)/
		);
	});

	it('löst den Quellfest-Zeiger auf, statt das Sponsoring mitzureißen (SET NULL, nicht CASCADE)', () => {
		const declaration = allSql().match(
			/ALTER TABLE sponsorings ADD COLUMN[^;]*copied_from_festival_id[^;]*;/
		);
		expect(declaration).not.toBeNull();
		expect(declaration![0]).toMatch(/ON DELETE SET NULL/);
		expect(declaration![0]).not.toMatch(/ON DELETE CASCADE/);
	});
});

describe('DELETE im gemeinsamen Arbeitsbereich (ADR 0002)', () => {
	const openTables = ['sponsors', 'sponsorings', 'sponsoring_categories'];

	it.each(openTables)('öffnet %s für jeden angemeldeten Benutzer', (table) => {
		const policy = effectiveDeletePolicies().get(table);
		expect(policy, `keine DELETE-Policy für ${table} gefunden`).toBeDefined();
		expect(policy!.using).toBe('true');
	});

	it('lässt sponsoring_category_assignments offen, wie es schon war', () => {
		expect(effectiveDeletePolicies().get('sponsoring_category_assignments')?.using).toBe('true');
	});

	it('nimmt das Fest selbst bewusst aus (Blast-Radius)', () => {
		const migration = migrations().find((m) => m.name.includes('add_sponsoring_in_kind'));
		expect(migration).toBeDefined();
		expect(tablesInArrayLiterals(migration!.sql)).not.toContain('festivals');
	});
});
