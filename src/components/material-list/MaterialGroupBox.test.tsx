import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialGroupBox from './MaterialGroupBox';
import {
	groupMaterials,
	groupCategories,
	filterByCategory,
	type GroupableMaterial,
	type MaterialAxis
} from '@/lib/materialGrouping';

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

const render = (
	materials: GroupableMaterial[],
	axis: MaterialAxis = 'station',
	activeCategory: string | null = null
) => {
	const [group] = groupMaterials(materials, axis);
	return renderToStaticMarkup(
		<MaterialGroupBox
			group={group}
			axis={axis}
			materials={filterByCategory(group.materials, activeCategory)}
			categories={groupCategories(group.materials)}
			activeCategory={activeCategory}
			onCategoryChange={() => {}}
			onAddPosition={() => {}}
		>
			<p>Positionstabelle</p>
		</MaterialGroupBox>
	);
};

describe('MaterialGroupBox — der Kopf des Kastens', () => {
	it('trägt Gruppenname, Anzahl und Zwischensumme auf grüner Plakatfläche', () => {
		const html = render([
			material({ unit_price: 10, ordered_quantity: 2 }),
			material({ unit_price: 5, ordered_quantity: 2 })
		]);

		expect(html).toContain('poster');
		expect(html).toContain('Ausschank');
		expect(html).toContain('2 Positionen');
		expect(html).toContain('Zwischensumme');
		expect(html).toContain('€ 30');
	});

	it('schreibt die Preislücken der Gruppe warnend heraus', () => {
		const html = render([material({ unit_price: 10 }), material({ unit_price: null })]);

		expect(html).toContain('1 ohne Preis');
	});

	it('nennt im Knopf die Gruppe, für die eine Position dazukommt', () => {
		expect(render([material()])).toContain('+ POSITION FÜR AUSSCHANK');
	});

	it('lässt den Zusatz weg, wo die Gruppe für keine Zuordnung steht', () => {
		const ohneStation = render([material({ station: null })], 'station');

		expect(ohneStation).toContain('+ POSITION');
		expect(ohneStation).not.toContain('FÜR OHNE STATION');
		expect(render([material()], 'all')).not.toContain('FÜR');
	});

	it('zeigt die durchgereichte Positionstabelle', () => {
		expect(render([material()])).toContain('Positionstabelle');
	});
});

describe('MaterialGroupBox — Kategorie-Chips', () => {
	const rows = [
		material({ name: 'Bier', category: 'Getränke', unit_price: 10, ordered_quantity: 2 }),
		material({ name: 'Senf', category: 'Lebensmittel', unit_price: 5, ordered_quantity: 2 })
	];

	it('bietet je Kategorie der Gruppe einen Chip', () => {
		const html = render(rows);

		expect(html).toContain('Kategorie');
		expect(html).toContain('Getränke');
		expect(html).toContain('Lebensmittel');
	});

	it('drückt den gewählten Chip in Tinte durch', () => {
		const html = render(rows, 'station', 'Getränke');
		const chips = html.split('data-chip="').slice(1);

		expect(chips).toHaveLength(2);
		expect(chips[0]).toContain('bg-tinte');
		expect(chips[1]).not.toContain('bg-tinte');
	});

	it('rechnet den Kopf mit dem Chip mit und sagt, dass er gefiltert ist', () => {
		const html = render(rows, 'station', 'Getränke');

		expect(html).toContain('1 Position');
		expect(html).toContain('Zwischensumme (gefiltert)');
		expect(html).toContain('€ 20');
		expect(html).not.toContain('€ 30');
	});

	it('blendet die Chips auf der Kategorie-Achse aus — dort sind sie redundant', () => {
		expect(render(rows, 'category')).not.toContain('data-chip="');
	});

	it('lässt die Chip-Zeile weg, wenn die Gruppe nur eine Kategorie kennt', () => {
		expect(render([material({ category: 'Getränke' })])).not.toContain('data-chip="');
	});
});
