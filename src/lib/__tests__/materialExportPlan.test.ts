import { describe, it, expect } from 'vitest';

import { planMaterialExport, type MaterialExportSheet } from '../materialExportPlan';
import type { GroupableMaterial } from '../materialGrouping';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `planMaterialExport` ist die *Regel* des Materiallisten-Exports — welche
   Papiere aus Achse und gewählter Gruppe entstehen und welche Beträge
   daraufstehen. Reines Logikmodul: es kennt weder Dialog noch jsPDF.

   Die Achse ist die aus #113 (`MaterialAxis`), gruppiert wird mit
   `groupMaterials` — der Export darf nicht anders einteilen als der Bildschirm.
   Gerechnet wird in `materialCosts` (ADR 0006), hier steht keine Geldformel. */

interface MakeOpts {
	name: string;
	station?: string | null;
	supplier?: string | null;
	category?: string | null;
	ordered?: number;
	actual?: number | null;
	price?: number | null;
	tax?: number | null;
}

function make(opts: MakeOpts): GroupableMaterial {
	return {
		name: opts.name,
		category: opts.category ?? null,
		supplier: opts.supplier ?? null,
		station: opts.station ? { id: `s-${opts.station}`, name: opts.station } : null,
		ordered_quantity: opts.ordered ?? 0,
		actual_quantity: opts.actual ?? null,
		unit_price: opts.price ?? null,
		tax_rate: opts.tax ?? null,
		price_is_net: true
	};
}

const names = (sheets: MaterialExportSheet<GroupableMaterial>[]) =>
	sheets.map((s) => s.materials.map((m) => m.name));

describe('planMaterialExport — welche Papiere entstehen', () => {
	const materials = [
		make({ name: 'Bier', station: 'Ausschank', supplier: 'Huber' }),
		make({ name: 'Teller', station: 'Küche', supplier: 'Metro' }),
		make({ name: 'Zelt', station: null, supplier: 'Metro' })
	];

	it('macht auf der Achse ALLE ein einziges Papier ohne Untertitel', () => {
		const plan = planMaterialExport(materials, 'all', null);

		expect(plan.sheets).toHaveLength(1);
		expect(plan.sheets[0].label).toBeNull();
		expect(names(plan.sheets)).toEqual([['Bier', 'Teller', 'Zelt']]);
	});

	it('macht je Gruppe ein Papier, wenn keine Gruppe gewählt ist — Restgruppe am Ende', () => {
		const plan = planMaterialExport(materials, 'station', null);

		expect(plan.sheets.map((s) => s.label)).toEqual(['Ausschank', 'Küche', 'Ohne Station']);
		expect(names(plan.sheets)).toEqual([['Bier'], ['Teller'], ['Zelt']]);
	});

	it('macht genau ein Papier, wenn eine Gruppe gewählt ist', () => {
		const [, kueche] = planMaterialExport(materials, 'station', null).sheets;
		const plan = planMaterialExport(materials, 'station', kueche.groupId);

		expect(plan.sheets.map((s) => s.label)).toEqual(['Küche']);
		expect(plan.positionCount).toBe(1);
	});

	it('fällt auf alle Gruppen zurück, wenn die gewählte Gruppe die Achse nicht kennt', () => {
		// Achsenwechsel: die Gruppen-Id trägt die Achse im Schlüssel.
		const plan = planMaterialExport(materials, 'supplier', 'station:s-Küche');

		expect(plan.sheets.map((s) => s.label)).toEqual(['Huber', 'Metro']);
	});

	it('folgt der Lieferanten-Achse mit dem Wortlaut der Arbeitsliste', () => {
		const plan = planMaterialExport(
			[...materials, make({ name: 'Kohle', supplier: null })],
			'supplier',
			null
		);

		expect(plan.sheets.map((s) => s.label)).toEqual(['Huber', 'Metro', 'Kein Lieferant']);
	});

	it('lässt die Station-Spalte nur weg, wo die Achse sie schon gesetzt hat', () => {
		expect(planMaterialExport(materials, 'station', null).sheets[0].showStation).toBe(false);
		for (const axis of ['all', 'supplier', 'category'] as const) {
			expect(planMaterialExport(materials, axis, null).sheets[0].showStation).toBe(true);
		}
	});

	it('gibt ohne Positionen kein Papier her', () => {
		const plan = planMaterialExport([], 'station', null);

		expect(plan.sheets).toEqual([]);
		expect(plan.groups).toEqual([]);
		expect(plan.positionCount).toBe(0);
	});

	it('nennt die Gruppen der Achse samt Anzahl — auch die nicht gewählten', () => {
		const ausschank = planMaterialExport(materials, 'station', null).groups[0];
		const plan = planMaterialExport(materials, 'station', ausschank.id);

		expect(plan.groups).toEqual([
			{ id: ausschank.id, name: 'Ausschank', count: 1 },
			{ id: expect.any(String), name: 'Küche', count: 1 },
			{ id: expect.any(String), name: 'Ohne Station', count: 1 }
		]);
		expect(plan.sheets).toHaveLength(1);
	});
});

describe('planMaterialExport — Beträge aus dem gemeinsamen Rechenmodul', () => {
	// 10 € netto + 20 % = 12 € brutto. Bestellt 5 → 60 €, verbraucht 3 → 36 €.
	const bier = make({ name: 'Bier', station: 'Ausschank', ordered: 5, actual: 3, price: 10, tax: 20 });
	// 4 € brutto ohne Steuersatz. Bestellt 10 → 40 €, nichts verbraucht.
	const teller = make({ name: 'Teller', station: 'Küche', ordered: 10, price: 4 });
	const zelt = make({ name: 'Zelt', station: 'Küche', ordered: 1 });

	it('nennt Bestellwert und Verbrauchswert der Auswahl', () => {
		const plan = planMaterialExport([bier, teller, zelt], 'all', null);

		expect(plan.ordered).toBe(100);
		expect(plan.consumed).toBe(36);
	});

	it('rechnet nur über die gewählte Gruppe', () => {
		const kueche = planMaterialExport([bier, teller, zelt], 'station', null).sheets[1];
		const plan = planMaterialExport([bier, teller, zelt], 'station', kueche.groupId);

		expect(plan.ordered).toBe(40);
		expect(plan.consumed).toBe(0);
	});

	it('zählt die Positionen ohne Preis als Preislücke', () => {
		expect(planMaterialExport([bier, teller, zelt], 'all', null).withoutPrice).toBe(1);
	});
});
