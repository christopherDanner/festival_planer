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
