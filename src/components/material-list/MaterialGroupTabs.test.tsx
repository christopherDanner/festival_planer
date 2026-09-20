import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialGroupTabs from './MaterialGroupTabs';
import { groupMaterials, type GroupableMaterial, type MaterialAxis } from '@/lib/materialGrouping';

function material(over: Partial<GroupableMaterial> = {}): GroupableMaterial {
	return {
		name: 'Bier',
		category: 'Getränke',
		supplier: 'Metro',
		station: { id: 's1', name: 'Ausschank' },
		ordered_quantity: 1,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		...over
	};
}

const render = (materials: GroupableMaterial[], axis: MaterialAxis = 'supplier', active = 0) => {
	const groups = groupMaterials(materials, axis);
	return renderToStaticMarkup(
		<MaterialGroupTabs
			groups={groups}
			axis={axis}
			activeGroupId={groups[active]?.id ?? null}
			onSelect={() => {}}
		/>
	);
};

describe('MaterialGroupTabs — was ein Reiter trägt', () => {
	it('zeigt Name, Anzahl und Zwischensumme der Gruppe', () => {
		const html = render([
			material({ supplier: 'Metro', unit_price: 10, ordered_quantity: 3 }),
			material({ supplier: 'Metro', unit_price: 5, ordered_quantity: 4 })
		]);

		expect(html).toContain('Metro');
		expect(html).toMatch(/tabular-nums">2</); // 2 Positionen
		expect(html).toContain('€ 50'); // 10 × 3 + 5 × 4
	});

	it('nennt die Preislücken einer Gruppe und schreibt sie rot', () => {
		const html = render([
			material({ supplier: 'Metro', unit_price: 10, ordered_quantity: 1 }),
			material({ supplier: 'Metro', unit_price: null })
		]);

		expect(html).toMatch(/text-rot[^>]*>1 ohne Preis/);
	});

	it('setzt statt der Preislücke einen Haken, wenn jede Position einen Preis hat', () => {
		const html = render([material({ supplier: 'Metro', unit_price: 10, ordered_quantity: 1 })]);

		expect(html).not.toContain('ohne Preis');
		expect(html).toContain('✓');
	});
});

describe('MaterialGroupTabs — der Streifen', () => {
	it('bricht um und scrollt nicht (Regel des Ampel-Streifens)', () => {
		const html = render([material()]);

		expect(html).toContain('flex-wrap');
		expect(html).not.toContain('overflow-x-auto');
	});

	it('hebt den aktiven Reiter gelb mit Versatz-Schatten hervor', () => {
		const html = render(
			[material({ supplier: 'Aaa Ersatzteile' }), material({ supplier: 'Metro' })],
			'supplier',
			1
		);
		const reiter = html.split('<button').slice(1);

		expect(reiter).toHaveLength(2);
		expect(reiter[0]).not.toContain('bg-gelb');
		expect(reiter[1]).toContain('bg-gelb');
		expect(reiter[1]).toContain('shadow-versatz');
		expect(reiter[1]).toContain('aria-checked="true"');
	});

	it('stellt die Gruppe ohne Zuordnung als vollwertigen Reiter ans Ende', () => {
		const html = render(
			[material({ supplier: null }), material({ supplier: 'Metro' })],
			'supplier'
		);

		expect(html.indexOf('Kein Lieferant')).toBeGreaterThan(html.indexOf('Metro'));
	});

	it('rendert nichts, wenn es keine Gruppen gibt', () => {
		expect(render([])).toBe('');
	});

	it('entfällt auf der Achse ALLE — dort gibt es genau einen Kasten', () => {
		expect(render([material(), material({ supplier: 'Lagerhaus' })], 'all')).toBe('');
	});
});
