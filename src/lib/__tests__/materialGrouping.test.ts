/* Seams dieses Slices (#113) — getestet wird nur hier:

   src/lib/materialGrouping.ts   groupMaterials · searchMaterials · resolveActiveGroupId
                                 groupCategories · filterByCategory · resolveActiveCategory
                                 prefillFromGroup
   MaterialListHeader            Werkzeugleiste: Modus, Suche, + Position
   MaterialAxisBar               Achsen-Umschalter
   MaterialGroupTabs             Reiter-Streifen: Name · Anzahl · € · Preislücken
   MaterialGroupBox              Gruppen-Kasten samt Kategorie-Chips
   MaterialTotals                Bereichskopf: Bestellt € / Verbraucht €
   MaterialTable                 Station-Spalte nur abseits der Stations-Achse,
                                 Fuß „Zwischensumme (gefiltert)"                  */

import { describe, it, expect } from 'vitest';
import {
	groupMaterials,
	searchMaterials,
	resolveActiveGroupId,
	groupCategories,
	filterByCategory,
	resolveActiveCategory,
	prefillFromGroup,
	categoryChipLabel,
	NO_CATEGORY,
	NO_CATEGORY_KEY,
	type GroupableMaterial
} from '../materialGrouping';

function material(over: Partial<GroupableMaterial> = {}): GroupableMaterial {
	return {
		name: 'Bier',
		category: 'Getränke',
		supplier: 'Brauerei Zipf',
		station: { id: 's1', name: 'Ausschank' },
		ordered_quantity: 1,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		...over
	};
}

describe('groupMaterials — die vier Achsen', () => {
	it('legt je Station eine Gruppe an, in Reihenfolge des Namens', () => {
		const groups = groupMaterials(
			[
				material({ name: 'Semmeln', station: { id: 's2', name: 'Grillstation' } }),
				material({ name: 'Bier', station: { id: 's1', name: 'Ausschank' } }),
				material({ name: 'Radler', station: { id: 's1', name: 'Ausschank' } })
			],
			'station'
		);

		expect(groups.map((g) => g.name)).toEqual(['Ausschank', 'Grillstation']);
		expect(groups[0].materials.map((m) => m.name)).toEqual(['Bier', 'Radler']);
	});

	it('legt je Lieferant eine Gruppe an — die Achse der Bestellliste', () => {
		const groups = groupMaterials(
			[
				material({ name: 'Bier', supplier: 'Brauerei Zipf' }),
				material({ name: 'Senf', supplier: 'Metro' }),
				material({ name: 'Ketchup', supplier: 'Metro' })
			],
			'supplier'
		);

		expect(groups.map((g) => [g.name, g.count])).toEqual([
			['Brauerei Zipf', 1],
			['Metro', 2]
		]);
	});

	it('legt je Kategorie eine Gruppe an', () => {
		const groups = groupMaterials(
			[material({ category: 'Verbrauch' }), material({ category: 'Getränke' })],
			'category'
		);

		expect(groups.map((g) => g.name)).toEqual(['Getränke', 'Verbrauch']);
	});

	it('gibt bei ALLE genau einen Kasten über alle Positionen', () => {
		const groups = groupMaterials(
			[
				material({ name: 'Bier', station: { id: 's1', name: 'Ausschank' } }),
				material({ name: 'Senf', station: { id: 's2', name: 'Grillstation' } })
			],
			'all'
		);

		expect(groups).toHaveLength(1);
		expect(groups[0].count).toBe(2);
		expect(groups[0].unassigned).toBe(false);
	});
});

describe('groupMaterials — Gruppen ohne Zuordnung', () => {
	it('macht „Ohne Station" zur vollwertigen Gruppe am Ende des Streifens', () => {
		const groups = groupMaterials(
			[
				material({ name: 'Zelt', station: null }),
				material({ name: 'Bier', station: { id: 's1', name: 'Ausschank' } }),
				material({ name: 'Banner', station: null })
			],
			'station'
		);

		expect(groups.map((g) => g.name)).toEqual(['Ausschank', 'Ohne Station']);
		const ohne = groups[1];
		expect(ohne.unassigned).toBe(true);
		expect(ohne.count).toBe(2);
	});

	it('nennt die Lieferanten-Restgruppe „Kein Lieferant" und stellt sie hinter Z', () => {
		const groups = groupMaterials(
			[
				material({ supplier: null }),
				material({ supplier: 'Zeltverleih Brandt' }),
				material({ supplier: 'Metro' })
			],
			'supplier'
		);

		expect(groups.map((g) => g.name)).toEqual(['Metro', 'Zeltverleih Brandt', 'Kein Lieferant']);
	});

	it('behandelt einen leeren Lieferanten-Text wie keinen Lieferanten', () => {
		const groups = groupMaterials([material({ supplier: '  ' })], 'supplier');

		expect(groups.map((g) => g.name)).toEqual(['Kein Lieferant']);
	});

	it('nennt die Kategorie-Restgruppe „Ohne Kategorie"', () => {
		const groups = groupMaterials([material({ category: null })], 'category');

		expect(groups.map((g) => g.name)).toEqual(['Ohne Kategorie']);
	});

	it('hält gleichnamige Stationen auseinander, weil die Gruppe an der Station hängt', () => {
		const groups = groupMaterials(
			[
				material({ station: { id: 's1', name: 'Bar' } }),
				material({ station: { id: 's2', name: 'Bar' } })
			],
			'station'
		);

		expect(groups).toHaveLength(2);
		expect(groups[0].id).not.toBe(groups[1].id);
	});
});

describe('groupMaterials — die Zahlen eines Reiters', () => {
	it('summiert brutto über die Zeilenkosten der Gruppe', () => {
		// 2,00 netto + 20 % = 2,40 × 10 Verbraucht, plus 3,00 brutto × 5 Bestellt
		const groups = groupMaterials(
			[
				material({
					supplier: 'Metro',
					unit_price: 2,
					tax_rate: 20,
					price_is_net: true,
					ordered_quantity: 4,
					actual_quantity: 10
				}),
				material({ supplier: 'Metro', unit_price: 3, ordered_quantity: 5 })
			],
			'supplier'
		);

		expect(groups[0].total).toBe(39);
	});

	it('zählt die Preislücken und lässt sie aus der Summe heraus', () => {
		const groups = groupMaterials(
			[
				material({ supplier: 'Metro', unit_price: 10, ordered_quantity: 2 }),
				material({ supplier: 'Metro', unit_price: null, ordered_quantity: 7 })
			],
			'supplier'
		);

		expect(groups[0].withoutPrice).toBe(1);
		expect(groups[0].total).toBe(20);
	});
});

describe('searchMaterials', () => {
	it('sucht in Name, Lieferant, Kategorie und Station', () => {
		const rows = [
			material({ name: 'Bier Fass' }),
			material({ name: 'Semmeln', supplier: 'Bäckerei Ruf', category: 'Lebensmittel' }),
			material({ name: 'Kabeltrommel', station: { id: 's9', name: 'Lager/Technik' } })
		];

		expect(searchMaterials(rows, 'bier').map((m) => m.name)).toEqual(['Bier Fass']);
		expect(searchMaterials(rows, 'bäckerei').map((m) => m.name)).toEqual(['Semmeln']);
		expect(searchMaterials(rows, 'lebensmittel').map((m) => m.name)).toEqual(['Semmeln']);
		expect(searchMaterials(rows, 'technik').map((m) => m.name)).toEqual(['Kabeltrommel']);
	});

	it('gibt ohne Suchbegriff alles zurück', () => {
		const rows = [material(), material()];

		expect(searchMaterials(rows, '   ')).toHaveLength(2);
	});

	it('zählt in den Reitern mit — die Gruppe schrumpft auf die Treffer', () => {
		const rows = [
			material({ name: 'Bier Fass', supplier: 'Metro' }),
			material({ name: 'Senf', supplier: 'Metro' })
		];

		const groups = groupMaterials(searchMaterials(rows, 'bier'), 'supplier');
		expect(groups[0].count).toBe(1);
	});
});

describe('resolveActiveGroupId', () => {
	it('bleibt auf der gewählten Gruppe, solange es sie gibt', () => {
		const groups = groupMaterials(
			[material({ supplier: 'Metro' }), material({ supplier: 'Lagerhaus' })],
			'supplier'
		);

		expect(resolveActiveGroupId(groups, groups[1].id)).toBe(groups[1].id);
	});

	it('fällt auf den ersten Reiter zurück, wenn die Gruppe wegfällt', () => {
		const groups = groupMaterials([material({ supplier: 'Metro' })], 'supplier');

		expect(resolveActiveGroupId(groups, 'supplier:Brennerei Lechner')).toBe(groups[0].id);
	});

	it('gibt ohne Gruppen null zurück', () => {
		expect(resolveActiveGroupId([], 'irgendwas')).toBeNull();
	});
});

describe('Kategorie-Chips im Kasten', () => {
	const rows = [
		material({ name: 'Bier', category: 'Getränke' }),
		material({ name: 'Senf', category: 'Lebensmittel' }),
		material({ name: 'Cola', category: 'Getränke' }),
		material({ name: 'Funkgerät', category: null })
	];

	it('nennt jede Kategorie der Gruppe einmal, die Restgruppe am Ende', () => {
		expect(groupCategories(rows)).toEqual(['Getränke', 'Lebensmittel', NO_CATEGORY_KEY]);
		expect(categoryChipLabel(NO_CATEGORY_KEY)).toBe(NO_CATEGORY);
		expect(categoryChipLabel('Getränke')).toBe('Getränke');
	});

	it('filtert die Gruppe auf eine Kategorie', () => {
		expect(filterByCategory(rows, 'Getränke').map((m) => m.name)).toEqual(['Bier', 'Cola']);
	});

	it('lässt ohne gewählten Chip alles stehen', () => {
		expect(filterByCategory(rows, null)).toHaveLength(4);
	});

	it('fängt mit dem Restgruppen-Chip die Positionen ohne Kategorie', () => {
		expect(filterByCategory(rows, NO_CATEGORY_KEY).map((m) => m.name)).toEqual(['Funkgerät']);
	});

	it('hält eine Kategorie, die wirklich „Ohne Kategorie" heißt, davon getrennt', () => {
		const heikel = [
			material({ name: 'Funkgerät', category: null }),
			material({ name: 'Erste-Hilfe-Koffer', category: NO_CATEGORY })
		];

		expect(groupCategories(heikel)).toEqual([NO_CATEGORY, NO_CATEGORY_KEY]);
		expect(filterByCategory(heikel, NO_CATEGORY).map((m) => m.name)).toEqual([
			'Erste-Hilfe-Koffer'
		]);
		expect(filterByCategory(heikel, NO_CATEGORY_KEY).map((m) => m.name)).toEqual(['Funkgerät']);
	});

	it('lässt den Chip fallen, wenn ihn die neue Gruppe nicht hat', () => {
		expect(resolveActiveCategory(['Getränke'], 'Lebensmittel')).toBeNull();
		expect(resolveActiveCategory(['Getränke'], 'Getränke')).toBe('Getränke');
		expect(resolveActiveCategory(['Getränke'], null)).toBeNull();
	});
});

describe('prefillFromGroup — „+ POSITION FÜR X" trägt die Gruppe vor', () => {
	it('setzt auf der Stations-Achse die Station der Gruppe', () => {
		const [gruppe] = groupMaterials([material({ station: { id: 's7', name: 'Kassa' } })], 'station');

		expect(prefillFromGroup(gruppe, 'station')).toEqual({ station_id: 's7' });
	});

	it('setzt auf der Lieferanten-Achse den Lieferanten', () => {
		const [gruppe] = groupMaterials([material({ supplier: 'Metro' })], 'supplier');

		expect(prefillFromGroup(gruppe, 'supplier')).toEqual({ supplier: 'Metro' });
	});

	it('setzt auf der Kategorie-Achse die Kategorie', () => {
		const [gruppe] = groupMaterials([material({ category: 'Verbrauch' })], 'category');

		expect(prefillFromGroup(gruppe, 'category')).toEqual({ category: 'Verbrauch' });
	});

	it('trägt bei der Restgruppe und bei ALLE nichts vor', () => {
		const [ohne] = groupMaterials([material({ station: null })], 'station');
		const [alle] = groupMaterials([material()], 'all');

		expect(prefillFromGroup(ohne, 'station')).toEqual({});
		expect(prefillFromGroup(alle, 'all')).toEqual({});
	});
});
