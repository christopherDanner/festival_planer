import { describe, it, expect } from 'vitest';
import {
	buildSponsoringExportFilename,
	buildSponsoringExportRows,
	SPONSORING_EXPORT_COLUMNS
} from '../sponsoringExport';
import type { SponsoringOverviewRow } from '../sponsoringTotals';

describe('buildSponsoringExportFilename', () => {
	it('names the file after the festival and the Sponsoring-Übersicht', () => {
		expect(buildSponsoringExportFilename('Sommerfest 2026', 'pdf')).toBe(
			'Sommerfest 2026_Sponsoring-Übersicht.pdf'
		);
	});

	it('strips characters that are unsafe in filenames, keeping umlauts', () => {
		expect(buildSponsoringExportFilename('Fest: "Spaß/Anker"?', 'pdf')).toBe(
			'Fest SpaßAnker_Sponsoring-Übersicht.pdf'
		);
	});
});

function makeRow(overrides: Partial<SponsoringOverviewRow>): SponsoringOverviewRow {
	return {
		sponsoringId: 'spo-1',
		companyName: 'Firma',
		positions: [],
		freeAmount: null,
		total: 0,
		...overrides
	};
}

describe('buildSponsoringExportRows', () => {
	it('renders one cell row per sponsor with positions, free amount and formatted total', () => {
		const rows = buildSponsoringExportRows([
			makeRow({
				companyName: 'Raiffeisen',
				positions: [
					{ label: 'Werbeplakat', value: 150 },
					{ label: 'Social-Media-Beitrag', value: 100 }
				],
				freeAmount: 100.5,
				total: 350.5
			})
		]);

		expect(rows[0]).toEqual([
			'Raiffeisen',
			'Werbeplakat (150,00 €), Social-Media-Beitrag (100,00 €), Freibetrag (100,50 €)',
			'350,50 €'
		]);
	});

	it('appends a total row summing all sponsorings', () => {
		const rows = buildSponsoringExportRows([
			makeRow({ companyName: 'A', total: 100 }),
			makeRow({ companyName: 'B', total: 50.25, freeAmount: 50.25 })
		]);

		expect(rows).toHaveLength(3);
		expect(rows[2]).toEqual(['Gesamtsumme', '', '150,25 €']);
	});

	it('matches the column layout of SPONSORING_EXPORT_COLUMNS', () => {
		expect(SPONSORING_EXPORT_COLUMNS).toEqual(['Firma', 'Leistungen', 'Gesamt']);
		const rows = buildSponsoringExportRows([makeRow({})]);
		expect(rows[0]).toHaveLength(SPONSORING_EXPORT_COLUMNS.length);
	});
});
