import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Die Schreib- und Lesewege, die das Kopierwerk für Schritt „Sponsoring
 * übernehmen" braucht (#146) — beobachtet an der Grenze zu Supabase, also an
 * der Zeile, die wirklich abgeschickt wird:
 *
 *   1. `createCategoriesBulk` legt die *Preisliste* in **einem** Insert an,
 *      Name und Wert unverändert, jede Zeile am Zielfest.
 *   2. `createBareSponsorings` schickt je Firma genau drei Felder —
 *      `festival_id`, `sponsor_id`, `copied_from_festival_id`. Kein Freibetrag,
 *      keine Sachleistung, keine Notiz (ADR 0008).
 *   3. `getSponsoringSponsorIds` liest nur die Firmen-Spalte des Fests.
 */

type Call = { table: string; op: string; payload: unknown };

const mocks = vi.hoisted(() => ({
	calls: [] as Call[],
	rows: [] as unknown[]
}));

vi.mock('@/integrations/supabase/client', () => {
	const builderFor = (table: string) => {
		const chain: Record<string, unknown> = {};
		const record = (op: string, payload: unknown) => {
			mocks.calls.push({ table, op, payload });
			return chain;
		};
		Object.assign(chain, {
			select: (columns?: string) => record('select', columns ?? '*'),
			insert: (payload: unknown) => record('insert', payload),
			eq: () => chain,
			order: () => chain,
			then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
				resolve({ data: mocks.rows, error: null })
		});
		return chain;
	};
	return { supabase: { from: (table: string) => builderFor(table) } };
});

import {
	createBareSponsorings,
	createCategoriesBulk,
	getSponsoringSponsorIds
} from '../sponsorService';
import {
	festivalSponsoringTotal,
	type AssignedValue,
	type SponsoringValue
} from '../sponsoringTotals';

const callsFor = (table: string, op: string): Call[] =>
	mocks.calls.filter((c) => c.table === table && c.op === op);

const soleCall = (table: string, op: string): Call => {
	const found = callsFor(table, op);
	expect(found).toHaveLength(1);
	return found[0];
};

beforeEach(() => {
	mocks.calls = [];
	mocks.rows = [];
});

describe('createCategoriesBulk', () => {
	it('schreibt die Preisliste mit ihren Werten ans Zielfest', async () => {
		await createCategoriesBulk('fest-2027', [
			{ name: 'Werbeplakat', value: 500 },
			{ name: 'Social-Media-Beitrag', value: null }
		]);

		expect(soleCall('sponsoring_categories', 'insert').payload).toEqual([
			{ festival_id: 'fest-2027', name: 'Werbeplakat', value: 500 },
			// Eine Kategorie ohne Standardwert bleibt ohne — NULL ist nicht null Euro.
			{ festival_id: 'fest-2027', name: 'Social-Media-Beitrag', value: null }
		]);
	});

	// Geschlossen statt Zeile für Zeile, wie die Bulk-Wege für Helfer,
	// Stationen und Material.
	it('legt sie in einem Zug an', async () => {
		await createCategoriesBulk('fest-2027', [
			{ name: 'Werbeplakat', value: 500 },
			{ name: 'Logo in Speisekarte', value: 150 }
		]);

		expect(callsFor('sponsoring_categories', 'insert')).toHaveLength(1);
	});

	it('fragt gar nicht an, wenn die Vorlage keine Preisliste führt', async () => {
		await createCategoriesBulk('fest-2027', []);

		expect(mocks.calls).toEqual([]);
	});
});

describe('createBareSponsorings', () => {
	// Nackte Verknüpfung (ADR 0008): keine Zuweisung, kein Freibetrag, keine
	// Sachleistung, keine Notiz — die Geld-Gesamtsumme startet bei € 0.
	it('schickt je Firma nur Fest, Firma und Quellfest', async () => {
		await createBareSponsorings('fest-2027', ['firma-baeckerei', 'firma-bank'], 'fest-2026');

		expect(soleCall('sponsorings', 'insert').payload).toEqual([
			{
				festival_id: 'fest-2027',
				sponsor_id: 'firma-baeckerei',
				copied_from_festival_id: 'fest-2026'
			},
			{
				festival_id: 'fest-2027',
				sponsor_id: 'firma-bank',
				copied_from_festival_id: 'fest-2026'
			}
		]);
	});

	// Ohne den Zeiger hätte das übernommene Sponsoring keinen Vorjahresbeitrag.
	it('rührt die Zuweisungs-Tabelle nicht an', async () => {
		await createBareSponsorings('fest-2027', ['firma-baeckerei'], 'fest-2026');

		expect(callsFor('sponsoring_category_assignments', 'insert')).toEqual([]);
	});

	// Das Abnahmekriterium wörtlich: „Geld-Gesamtsumme € 0". Die Geldregel
	// (`festivalSponsoringTotal`, ADR 0008) rechnet über Freibetrag und
	// Zuweisungen — die geschriebene Zeile trägt beides nicht, und das ist es,
	// was die Summe des neuen Fests bei null hält.
	it('schreibt Zeilen, über die die Geldregel € 0 rechnet', async () => {
		await createBareSponsorings('fest-2027', ['firma-baeckerei', 'firma-bank'], 'fest-2026');

		const rows = soleCall('sponsorings', 'insert').payload as Record<string, unknown>[];
		const asValues: SponsoringValue[] = rows.map((row) => ({
			free_amount: (row.free_amount as number | null) ?? null,
			assignments: (row.assignments as AssignedValue[]) ?? []
		}));

		expect(festivalSponsoringTotal(asValues)).toBe(0);
	});

	it('fragt gar nicht an, wenn die Vorlage keine Firma führt', async () => {
		await createBareSponsorings('fest-2027', [], 'fest-2026');

		expect(mocks.calls).toEqual([]);
	});
});

describe('getSponsoringSponsorIds', () => {
	it('liest nur die Firmen-Spalte des Fests', async () => {
		mocks.rows = [{ sponsor_id: 'firma-baeckerei' }, { sponsor_id: 'firma-bank' }];

		const ids = await getSponsoringSponsorIds('fest-2026');

		expect(soleCall('sponsorings', 'select').payload).toBe('sponsor_id');
		expect(ids).toEqual(['firma-baeckerei', 'firma-bank']);
	});

	it('antwortet auf ein Fest ohne Sponsoring mit der leeren Liste', async () => {
		mocks.rows = [];

		expect(await getSponsoringSponsorIds('fest-2026')).toEqual([]);
	});

	// „Je Sponsor ein `sponsorings`-Datensatz" — und die Tabelle hält das nicht
	// selbst: ohne UNIQUE auf (festival_id, sponsor_id) kann dieselbe Firma im
	// Quellfest zweimal stehen. Übernommen wird sie trotzdem einmal.
	it('nennt jede Firma nur einmal, auch wenn sie zweimal erfasst war', async () => {
		mocks.rows = [
			{ sponsor_id: 'firma-baeckerei' },
			{ sponsor_id: 'firma-bank' },
			{ sponsor_id: 'firma-baeckerei' }
		];

		expect(await getSponsoringSponsorIds('fest-2026')).toEqual(['firma-baeckerei', 'firma-bank']);
	});
});
