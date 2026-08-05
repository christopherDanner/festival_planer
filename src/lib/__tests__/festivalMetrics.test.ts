import { describe, expect, it } from 'vitest';

import { buildFestivalMetrics } from '../festivalMetrics';

const row = (festival_id: string) => ({ festival_id });

describe('buildFestivalMetrics', () => {
	it('zählt Schichten und Material-Positionen je Fest', () => {
		const metrics = buildFestivalMetrics({
			shifts: [row('a'), row('a'), row('b')],
			materials: [row('a')],
			sponsorings: []
		});

		expect(metrics.a).toEqual({ shifts: 2, materials: 1, sponsoring: 0 });
		expect(metrics.b).toEqual({ shifts: 1, materials: 0, sponsoring: 0 });
	});

	it('summiert das Sponsoring je Fest nach der Regel aus sponsoringTotals', () => {
		const metrics = buildFestivalMetrics({
			shifts: [],
			materials: [],
			sponsorings: [
				// Kategorie-Standardwert 200 + Freibetrag 500
				{
					festival_id: 'a',
					free_amount: 500,
					assignments: [{ value: null, category: { value: 200 } }]
				},
				// Überschriebener Wert 150 schlägt den Standardwert 200;
				// eine Kategorie ohne Wert trägt nichts bei
				{
					festival_id: 'a',
					free_amount: null,
					assignments: [
						{ value: 150, category: { value: 200 } },
						{ value: null, category: { value: null } }
					]
				},
				{ festival_id: 'b', free_amount: 80, assignments: [] }
			]
		});

		expect(metrics.a.sponsoring).toBe(850);
		expect(metrics.b.sponsoring).toBe(80);
	});
});
