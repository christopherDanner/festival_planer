import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialTable from './MaterialTable';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

const noop = () => {};

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'mat1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Stk',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const renderTable = (materials: FestivalMaterialWithStation[]) =>
	renderToStaticMarkup(
		<MaterialTable
			materials={materials}
			onEdit={noop}
			onDelete={noop}
			onCopy={noop}
			onUpdateField={noop}
			onUpdateFields={noop}
		/>
	);

describe('MaterialTable — Gesamtkosten', () => {
	it('summiert brutto über die übergebenen (gefilterten) Positionen', () => {
		const html = renderTable([
			material({ id: 'a', unit_price: 2, tax_rate: 20, price_is_net: true, ordered_quantity: 10 }),
			material({ id: 'b', unit_price: 3, ordered_quantity: 5 })
		]);
		expect(html).toContain('39.00 €'); // 2 netto → 2,40 brutto × 10, plus 3 × 5
	});

	/** Fertig-Kriterium aus Issue #112: dieselben vier Positionen stehen in
	`numberBoxes.test.ts` („Dashboard gegen Material-Bereich") mit denselben 51 €
	als Literal. Beide Seiten sind einzeln festgeschrieben — rechnet eine wieder
	selbst, fällt genau ihr Test. */
	it('zeigt für dasselbe Fest dieselbe Zahl wie das Dashboard', () => {
		const html = renderTable([
			// netto erfasst, 20 % → 2,40 × 10 = 24
			material({ id: 'a', ordered_quantity: 10, unit_price: 2, tax_rate: 20, price_is_net: true }),
			// brutto erfasst, 10 % → bleibt 3,30 × 5 = 16,50
			material({ id: 'b', ordered_quantity: 5, unit_price: 3.3, tax_rate: 10, price_is_net: false }),
			// ohne Steuersatz → 1,50 × 7 = 10,50
			material({ id: 'c', ordered_quantity: 7, unit_price: 1.5, tax_rate: null }),
			// ohne Preis → zählt nicht mit
			material({ id: 'd', ordered_quantity: 4, unit_price: null })
		]);
		expect(html).toContain('51.00 €');
	});

	it('läuft nicht gegen die Zeilensummen auseinander (drei Positionen à 0,105 €)', () => {
		const html = renderTable([
			material({ id: 'a', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'b', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'c', unit_price: 0.105, ordered_quantity: 1 })
		]);
		expect(html.match(/0\.11 €/g)).toHaveLength(3); // je Zeile die gerundete Zeilensumme
		expect(html).toContain('0.33 €'); // Gesamtkosten = Σ der Zeilen, kein Cent Abweichung
	});
});
