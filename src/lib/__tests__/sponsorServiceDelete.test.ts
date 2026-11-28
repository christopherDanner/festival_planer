import { describe, it, expect, vi, beforeEach } from 'vitest';

/* Seam dieses Tests (aus #159): `deleteSponsor` ist der einzige Schreibweg in
   das `DELETE` auf `sponsors`. Läuft es in den Fremdschlüssel (`RESTRICT`,
   ADR 0010) — Nebenläufigkeit: jemand erfasst die Firma gerade in einem anderen
   Fest —, kommt **der Satz der Regel** heraus, nie die Postgres-Meldung. */

const mocks = vi.hoisted(() => ({
	deleteResult: { error: null } as { error: { code?: string; message: string } | null },
	deletedId: null as string | null
}));

vi.mock('@/integrations/supabase/client', () => ({
	supabase: {
		from: () => ({
			delete: () => ({
				eq: async (_column: string, id: string) => {
					mocks.deletedId = id;
					return mocks.deleteResult;
				}
			})
		})
	}
}));

import { deleteSponsor, SPONSOR_HAS_HISTORY_MESSAGE } from '../sponsorService';

const POSTGRES =
	'update or delete on table "sponsors" violates foreign key constraint "sponsorings_sponsor_id_fkey" on table "sponsorings"';

describe('deleteSponsor', () => {
	beforeEach(() => {
		mocks.deleteResult = { error: null };
		mocks.deletedId = null;
	});

	it('löscht die Firma mit ihrer Id', async () => {
		await deleteSponsor('sp-7');
		expect(mocks.deletedId).toBe('sp-7');
	});

	it('übersetzt den RESTRICT-Fehler (23001) in den Satz der Regel', async () => {
		mocks.deleteResult = { error: { code: '23001', message: POSTGRES } };

		await expect(deleteSponsor('sp-7')).rejects.toThrow(SPONSOR_HAS_HISTORY_MESSAGE);
	});

	it('übersetzt auch die allgemeine Fremdschlüsselverletzung (23503)', async () => {
		mocks.deleteResult = { error: { code: '23503', message: POSTGRES } };

		await expect(deleteSponsor('sp-7')).rejects.toThrow(SPONSOR_HAS_HISTORY_MESSAGE);
	});

	it('zeigt keine Postgres-Meldung, sondern einen verständlichen Satz', async () => {
		mocks.deleteResult = { error: { code: '23001', message: POSTGRES } };

		const error = await deleteSponsor('sp-7').catch((e: Error) => e);
		expect((error as Error).message).not.toContain('foreign key');
		expect((error as Error).message).not.toContain('sponsorings_sponsor_id_fkey');
		expect(SPONSOR_HAS_HISTORY_MESSAGE).toContain('noch nie gesponsert');
	});

	it('reicht andere Fehler unverändert durch', async () => {
		mocks.deleteResult = { error: { code: '42501', message: 'permission denied' } };

		await expect(deleteSponsor('sp-7')).rejects.toThrow('permission denied');
	});
});
