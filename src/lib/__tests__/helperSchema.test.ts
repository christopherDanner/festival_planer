import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Schema-Vertrag des Helfer-Umbaus (#98, ADR 0005).
 *
 * Drei Dinge leben nur in SQL und lassen sich sonst nirgends einklagen. Alle
 * drei sind Stellen, an denen der Code sonst gegen eine Wand läuft, die kein
 * Typ und kein Test sieht:
 *
 *   * `station_members.member_id` war NOT NULL. Solange das gilt, kann die
 *     Helferliste keine Stations-Zuteilung mehr anlegen — sie schreibt nur
 *     noch `helper_id`.
 *   * Der Schutz gegen die doppelte Stations-Zuteilung hing an
 *     `UNIQUE(station_id, member_id)`. Ohne ein Gegenstück auf `helper_id`
 *     wäre er beim Umschalten still verloren.
 *   * `schedule_entries.responsible_member_id` zeigt per Fremdschlüssel auf
 *     `members`; der Schema-Slice (#97) hat den Ablaufplan übersehen. Ohne
 *     eigene Helfer-Spalte könnte er keinen Helfer eintragen.
 *
 * Gelesen wird der Migrationsstand als Ganzes, in Dateireihenfolge — was
 * zählt, ist der Zustand, in dem eine frische Datenbank landet.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

const allSql = readdirSync(MIGRATIONS_DIR)
	.filter((name) => name.endsWith('.sql'))
	.sort()
	.map((name) => readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'))
	.join('\n');

describe('station_members', () => {
	it('lässt member_id offen, damit eine Zuteilung allein am Helfer hängen kann', () => {
		expect(allSql).toMatch(/ALTER TABLE station_members[\s\S]*?ALTER COLUMN member_id DROP NOT NULL/);
	});

	it('verbietet die doppelte Stations-Zuteilung weiterhin — jetzt über helper_id', () => {
		expect(allSql).toMatch(
			/CREATE UNIQUE INDEX[^;]*station_members[^;]*\(\s*station_id\s*,\s*helper_id\s*\)/
		);
	});
});

describe('schedule_entries', () => {
	it('trägt einen eigenen Zeiger auf den Helfer des Fests', () => {
		expect(allSql).toMatch(
			/ALTER TABLE schedule_entries[\s\S]{0,200}?responsible_helper_id UUID[^;]*REFERENCES festival_helpers\(id\)/
		);
	});

	it('vergisst nur den Verweis, statt den Ablauf-Eintrag mitzureißen (SET NULL, nicht CASCADE)', () => {
		const declaration = allSql.match(
			/ALTER TABLE schedule_entries[\s\S]{0,200}?responsible_helper_id[^;]*;/
		);
		expect(declaration).not.toBeNull();
		expect(declaration![0]).toMatch(/ON DELETE SET NULL/);
		expect(declaration![0]).not.toMatch(/ON DELETE CASCADE/);
	});
});
