import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const testsDir = path.dirname(fileURLToPath(import.meta.url));

/** Eine leere Datenbank im Schemastand vor #97 (siehe baseline_schema.sql). */
export async function createTestDatabase(): Promise<PGlite> {
	const db = await PGlite.create();
	await db.exec(readFileSync(path.join(testsDir, 'baseline_schema.sql'), 'utf8'));
	return db;
}

/** Spielt eine echte Migrationsdatei aus supabase/migrations ab. */
export async function applyMigration(db: PGlite, fileName: string): Promise<void> {
	const sql = readFileSync(path.join(testsDir, '..', 'migrations', fileName), 'utf8');
	await db.exec(sql);
}

/** Ein Fest im Schemastand des Fixtures (type + visitor_count sind dort noch NOT NULL). */
export async function insertFestival(db: PGlite, name: string, startDate: string): Promise<string> {
	const result = await db.query<{ id: string }>(
		`INSERT INTO festivals (name, type, start_date, visitor_count, user_id)
		 VALUES ($1, 'Zeltfest', $2, '500', gen_random_uuid()) RETURNING id`,
		[name, startDate]
	);
	return result.rows[0].id;
}

export type ColumnRow = {
	column_name: string;
	data_type: string;
	udt_name: string;
	is_nullable: string;
	column_default: string | null;
};

/** Die Spalten einer Tabelle, nach Spaltenname aufgeschlagen. */
export async function columnsOf(db: PGlite, table: string): Promise<Map<string, ColumnRow>> {
	const result = await db.query<ColumnRow>(
		`SELECT column_name, data_type, udt_name, is_nullable, column_default
		   FROM information_schema.columns
		  WHERE table_schema = 'public' AND table_name = $1`,
		[table]
	);
	return new Map(result.rows.map((row) => [row.column_name, row]));
}
