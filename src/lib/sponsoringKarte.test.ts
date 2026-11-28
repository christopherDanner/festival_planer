import { describe, it, expect } from 'vitest';
import { buildSponsoringOverviewRows } from '@/lib/sponsoringTotals';
import { applyZettel } from '@/lib/sponsoringZettel';
import { hasAddables, sponsoringAddables } from '@/lib/sponsoringKarte';
import {
	makeAssignment,
	makeCategory,
	makeSponsoring
} from '@/lib/__tests__/sponsoringFactories';

const plakat = makeCategory('Plakat', 200);
const transparent = makeCategory('Transparent', 300);
const speisekarte = makeCategory('Speisekarte', null);
const preisliste = [plakat, transparent, speisekarte];

const rowOf = (opts: Parameters<typeof makeSponsoring>[0]) =>
	buildSponsoringOverviewRows([makeSponsoring(opts)])[0];

describe('sponsoringAddables — was das „+" einer Karte anbietet (#155)', () => {
	it('bietet einer Firma ohne alles jede Kategorie, Freibetrag und Sachleistung an', () => {
		const addables = sponsoringAddables(rowOf({}), preisliste);

		expect(addables.categories.map((a) => a.label)).toEqual(['Plakat', 'Transparent', 'Speisekarte']);
		expect(addables.other.map((a) => a.label)).toEqual(['Freibetrag', 'Sachleistung']);
		expect(hasAddables(addables)).toBe(true);
	});

	it('lässt gewählte Kategorien, gesetzten Freibetrag und erfasste Sachleistung weg', () => {
		const addables = sponsoringAddables(
			rowOf({
				assignments: [makeAssignment({ category: plakat })],
				freeAmount: 100,
				inKindDescription: 'Tombolapreis',
				inKindValue: 50
			}),
			preisliste
		);

		expect(addables.categories.map((a) => a.label)).toEqual(['Transparent', 'Speisekarte']);
		expect(addables.other).toEqual([]);
	});

	it('hat bei einer Firma mit allem nichts mehr anzubieten', () => {
		const addables = sponsoringAddables(
			rowOf({
				assignments: preisliste.map((category) => makeAssignment({ category, value: 10 })),
				freeAmount: 100,
				inKindDescription: 'Tombolapreis'
			}),
			preisliste
		);

		expect(hasAddables(addables)).toBe(false);
	});

	it('nennt bei einer Kategorie ihren Standardwert', () => {
		const [first] = sponsoringAddables(rowOf({}), [plakat]).categories;

		expect(first.hint).toBe('€ 200');
	});

	it('weist eine Kategorie mit Standardwert sofort zu — zum Standardwert', () => {
		const sponsoring = makeSponsoring({});
		const [first] = sponsoringAddables(buildSponsoringOverviewRows([sponsoring])[0], [plakat])
			.categories;

		expect(first.direct).not.toBeNull();
		const write = applyZettel(sponsoring, first.target, first.direct!);
		// Erbt den Standardwert (value IS NULL), statt ihn als Zahl festzuschreiben.
		expect(write.assignments).toEqual([{ category_id: plakat.id, value: null }]);
	});

	it('führt eine Kategorie ohne Standardwert auf den Zettel — dort muss getippt werden', () => {
		const [first] = sponsoringAddables(rowOf({}), [speisekarte]).categories;

		expect(first.direct).toBeNull();
		expect(first.target).toEqual({ kind: 'category', category: speisekarte });
	});

	it('führt Freibetrag und Sachleistung auf ihren Zettel', () => {
		const { other } = sponsoringAddables(rowOf({}), []);

		expect(other.map((a) => a.target.kind)).toEqual(['freeAmount', 'inKind']);
		expect(other.every((a) => a.direct === null)).toBe(true);
	});

	it('hat auch ohne Preisliste etwas anzubieten', () => {
		expect(hasAddables(sponsoringAddables(rowOf({}), []))).toBe(true);
	});
});
