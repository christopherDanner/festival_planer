import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialTotals from './MaterialTotals';
import { formatEuro } from '@/lib/money';
import {
	deriveMaterialOrdered,
	deriveMaterialConsumed
} from '@/components/festival-overview/numberBoxes';
import type { FestivalMaterial } from '@/lib/materialService';

function material(over: Partial<FestivalMaterial> = {}): FestivalMaterial {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: 'Getränke',
		supplier: 'Metro',
		unit: 'Stk',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 10,
		actual_quantity: 8,
		unit_price: 10,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const render = (materials: FestivalMaterial[], totalCount = materials.length) =>
	renderToStaticMarkup(<MaterialTotals materials={materials} totalCount={totalCount} />);

describe('MaterialTotals — zwei Zahlen, beide richtig', () => {
	const rows = [material({ id: 'a' }), material({ id: 'b', unit_price: 5, actual_quantity: null })];

	it('zeigt Bestellwert und Verbrauchswert getrennt', () => {
		const html = render(rows);

		expect(html).toContain('Bestellt');
		expect(html).toContain('Verbraucht');
		expect(html).toContain(formatEuro(150)); // 10 × 10 + 5 × 10
		expect(html).toContain(formatEuro(80)); // 10 × 8, die zweite Zeile ist nicht erfasst
	});

	it('rechnet dieselben Zahlen wie die zwei Dashboard-Kästen', () => {
		const html = render(rows);

		expect(html).toContain(formatEuro(deriveMaterialOrdered(rows).total));
		expect(html).toContain(formatEuro(deriveMaterialConsumed(rows).consumed));
	});

	it('zählt die Positionen und die Preislücken', () => {
		const html = render([material({ id: 'a' }), material({ id: 'b', unit_price: null })]);

		expect(html).toContain('2 Positionen');
		expect(html).toMatch(/text-rot[^>]*>1 ohne Preis/);
	});
});

describe('MaterialTotals — gefiltert, und die Beschriftung sagt es', () => {
	it('sagt bei gefilterter Sicht, über wie viele Positionen gerechnet wurde', () => {
		const html = render([material()], 76);

		expect(html).toContain('gefiltert');
		expect(html).toContain('1 von 76');
	});

	it('schweigt über den Filter, wenn alle Positionen zählen', () => {
		expect(render([material()])).not.toContain('gefiltert');
	});

	it('setzt Striche, solange es keine Position gibt', () => {
		const html = render([]);

		expect(html).toContain('—');
		expect(html).toContain('Noch keine Positionen');
	});
});
