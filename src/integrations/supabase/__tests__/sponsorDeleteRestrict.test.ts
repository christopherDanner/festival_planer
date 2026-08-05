// @vitest-environment node
//
// Ein Sponsor ist nur löschbar, solange er keine Historie hat (ADR 0010, #156).
// Getestet wird an der Naht, an der die Regel steht: dem Schema selbst. Der
// Prüfstand spielt die echten Migrationen in ein echtes Postgres ein; die
// Testfälle sprechen SQL, nicht sponsorService — die Regel muss auch für Wege
// gelten, die nie durch unser TypeScript laufen.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
	SPONSOR_RESTRICT_MIGRATION,
	applyMigration,
	createSponsoringSchemaDb,
	seedFestivalAndSponsor
} from './schemaHarness';

describe('Sponsor löschen: nur ohne Sponsoren-Historie (ADR 0010)', () => {
	let db: PGlite;

	beforeAll(async () => {
		db = await createSponsoringSchemaDb();
	});

	afterAll(async () => {
		await db?.close();
	});

	it('lehnt das Löschen einer Firma mit Historie ab und lässt das Sponsoring stehen', async () => {
		const { festivalId, sponsorId } = await seedFestivalAndSponsor(db);
		await db.query(
			`INSERT INTO sponsorings (festival_id, sponsor_id, free_amount) VALUES ($1, $2, 500)`,
			[festivalId, sponsorId]
		);

		const deletion = db.query(`DELETE FROM sponsors WHERE id = $1`, [sponsorId]);

		await expect(deletion).rejects.toMatchObject({
			// 23001 = restrict_violation. Festgenagelt, weil der Migrations-Kommentar
			// diesen Code für die Fehlerübersetzung in #159 zusagt.
			code: '23001',
			constraint: 'sponsorings_sponsor_id_fkey'
		});

		const survivors = await db.query(`SELECT id FROM sponsorings WHERE sponsor_id = $1`, [
			sponsorId
		]);
		expect(survivors.rows).toHaveLength(1);
	});

	it('löscht eine Firma ohne Historie', async () => {
		const { sponsorId } = await seedFestivalAndSponsor(db, 'Nie gefragt GmbH');

		await db.query(`DELETE FROM sponsors WHERE id = $1`, [sponsorId]);

		const remaining = await db.query(`SELECT id FROM sponsors WHERE id = $1`, [sponsorId]);
		expect(remaining.rows).toHaveLength(0);
	});

	// Der Weg über festival_id bleibt CASCADE — Blast-Radius ist das Fest (ADR 0002).
	it('entfernt beim Löschen eines Fests weiterhin dessen Sponsorings samt Zuweisungen', async () => {
		const { festivalId, sponsorId } = await seedFestivalAndSponsor(db, 'Raiffeisen');
		const sponsoring = await db.query<{ id: string }>(
			`INSERT INTO sponsorings (festival_id, sponsor_id) VALUES ($1, $2) RETURNING id`,
			[festivalId, sponsorId]
		);
		const category = await db.query<{ id: string }>(
			`INSERT INTO sponsoring_categories (festival_id, name, value) VALUES ($1, 'Bierzelt-Tafel', 300) RETURNING id`,
			[festivalId]
		);
		await db.query(
			`INSERT INTO sponsoring_category_assignments (sponsoring_id, category_id) VALUES ($1, $2)`,
			[sponsoring.rows[0].id, category.rows[0].id]
		);

		await db.query(`DELETE FROM festivals WHERE id = $1`, [festivalId]);

		const sponsorings = await db.query(`SELECT id FROM sponsorings WHERE festival_id = $1`, [
			festivalId
		]);
		expect(sponsorings.rows).toHaveLength(0);
		const assignments = await db.query(
			`SELECT id FROM sponsoring_category_assignments WHERE sponsoring_id = $1`,
			[sponsoring.rows[0].id]
		);
		expect(assignments.rows).toHaveLength(0);

		// Die Firma selbst ist Stammdatum und überlebt ihr Fest.
		const sponsors = await db.query(`SELECT id FROM sponsors WHERE id = $1`, [sponsorId]);
		expect(sponsors.rows).toHaveLength(1);
	});

	// Die Migration darf den Constraint-Namen nicht raten. Trägt der Fremdschlüssel
	// in der echten Datenbank einen anderen Namen — Supabase-Altbestand, von Hand
	// angelegt —, dann darf sie nicht scheinbar durchlaufen und den alten CASCADE
	// stehen lassen: der feuert zuerst und löscht die Historie trotzdem.
	it('zieht den Fremdschlüssel auch dann auf RESTRICT, wenn er anders heißt', async () => {
		const driftDb = await createSponsoringSchemaDb();
		try {
			await driftDb.exec(`
				ALTER TABLE sponsorings DROP CONSTRAINT sponsorings_sponsor_id_fkey;
				ALTER TABLE sponsorings ADD CONSTRAINT fk_sponsorings_sponsor
				  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE;
			`);

			await applyMigration(driftDb, SPONSOR_RESTRICT_MIGRATION);

			const { festivalId, sponsorId } = await seedFestivalAndSponsor(driftDb);
			await driftDb.query(`INSERT INTO sponsorings (festival_id, sponsor_id) VALUES ($1, $2)`, [
				festivalId,
				sponsorId
			]);

			const deletion = driftDb.query(`DELETE FROM sponsors WHERE id = $1`, [sponsorId]);

			await expect(deletion).rejects.toMatchObject({ code: '23001' });

			const survivors = await driftDb.query(`SELECT id FROM sponsorings WHERE sponsor_id = $1`, [
				sponsorId
			]);
			expect(survivors.rows).toHaveLength(1);
		} finally {
			await driftDb.close();
		}
	});
});
