import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialTable, { MaterialMobileCard } from './MaterialTable';
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

const renderTable = (materials: FestivalMaterialWithStation[], showStation?: boolean) =>
	renderToStaticMarkup(
		<MaterialTable
			materials={materials}
			showStation={showStation}
			onEdit={noop}
			onDelete={noop}
			onCopy={noop}
			onUpdateField={noop}
			onUpdateFields={noop}
		/>
	);

const renderCard = (material: FestivalMaterialWithStation, showStation: boolean) =>
	renderToStaticMarkup(
		<MaterialMobileCard
			material={material}
			showStation={showStation}
			onEdit={noop}
			onDelete={noop}
			onCopy={noop}
			onUpdateField={noop}
			onUpdateFields={noop}
		/>
	);

/** Die Beschriftungen der Spaltenköpfe in ihrer Reihenfolge. */
function headers(html: string): string[] {
	return [...html.matchAll(/<th[^>]*>(.*?)<\/th>/gs)].map((m) =>
		m[1].replace(/<[^>]+>/g, '').trim()
	);
}

describe('MaterialTable — die elf Spalten (#114)', () => {
	it('trägt die Spalten des Entscheids in ihrer Reihenfolge', () => {
		expect(headers(renderTable([material()], false))).toEqual([
			'Material',
			'Lieferant',
			'Gebinde',
			'Bestellt',
			'Verbraucht',
			'Δ',
			'MwSt',
			'Netto €',
			'Brutto €',
			'Gesamt €',
			'Aktionen'
		]);
	});

	it('schiebt die Station dazu, solange die Arbeitsliste nicht nach Station gruppiert', () => {
		const rows = [material({ station: { id: 's1', name: 'Ausschank' } })];
		const html = renderTable(rows, true);

		expect(headers(html)[1]).toBe('Station');
		expect(headers(html)).toHaveLength(12);
		expect(html).toContain('Ausschank');
	});

	it('lässt die Spalte im Stations-Kasten weg — dort wäre sie redundant', () => {
		const rows = [material({ station: { id: 's1', name: 'Ausschank' } })];
		const html = renderTable(rows, false);

		expect(html).not.toContain('Ausschank');
		expect(headers(html)).not.toContain('Station');
	});

	it('lässt die Station auch auf der Handy-Karte weg', () => {
		const row = material({ station: { id: 's1', name: 'Ausschank' } });
		expect(renderCard(row, false)).not.toContain('Ausschank');
		expect(renderCard(row, true)).toContain('Ausschank');
	});
});

describe('MaterialTable — nur lesend (#114)', () => {
	const rows = [material({ ordered_quantity: 10, unit_price: 2, tax_rate: 20, price_is_net: true })];

	it('macht keine Zelle tippbar — Eingaben gehören in den Zeilenmodus und den Dialog', () => {
		const html = renderTable(rows);

		expect(html).not.toContain('<input');
		expect(html).not.toContain('<select');
		expect(html).not.toContain('contenteditable');
		expect(html).not.toContain('Klicken zum Bearbeiten');
	});

	it('bietet je Zeile das Drei-Punkt-Menü an — der einzige Weg aus der Zeile heraus', () => {
		expect(renderTable(rows)).toContain('Menü für Bier');
	});
});

describe('MaterialTable — feste Spaltenbreiten (#114)', () => {
	const rows = [material(), material({ id: 'mat2', name: 'Wein' })];

	it('setzt die Breiten im colgroup, statt sie vom Inhalt bestimmen zu lassen', () => {
		// Auflage aus #114: im Zeilenmodus (#115) werden Zellen zu Eingabefeldern —
		// mit inhaltsabhängiger Breite verschöbe sich dabei jede Spalte.
		const html = renderTable(rows, false);

		expect(html).toContain('table-fixed');
		expect(html).toContain('<colgroup>');
		expect(html.match(/<col /g)).toHaveLength(11);
	});

	it('gibt der Station ihre eigene Breite, statt die elf zu stauchen', () => {
		expect(renderTable(rows, true).match(/<col /g)).toHaveLength(12);
	});

	it('lässt den Kasten scrollen, statt unter die gemessene Mindestbreite zu gehen', () => {
		// Gemessen: ~1.085 px für elf Spalten, im ~1.136 px breiten Arbeitsbereich
		// ohne Querscrollen (#114).
		expect(renderTable(rows, false)).toContain('min-width:1085px');
		expect(renderTable(rows, false)).toContain('overflow-x-auto');
	});

	it('bleibt mit Station gleich breit — sie bekommt ihren Anteil aus den Textspalten', () => {
		// Sonst stünde die Tabelle auf den Achsen LIEFERANT/KATEGORIE/ALLE
		// dauerhaft im Querscroll.
		expect(renderTable(rows, true)).toContain('min-width:1085px');
	});

	it('hält jede Zeile auf 56 px — im Zeilenmodus wächst sie sonst und schiebt alles nach unten', () => {
		expect(renderTable(rows, false).match(/h-\[56px\]/g)).toHaveLength(2);
	});
});

describe('MaterialTable — die Zellen einer Zeile (#114)', () => {
	/** 4 Fass à 50 Liter bestellt, 3 verbraucht. */
	const fass = {
		unit: 'Liter',
		packaging_unit: 'Fass',
		amount_per_packaging: 50,
		ordered_quantity: 4,
		actual_quantity: 3
	};

	it('nennt das Material fett und darunter seine Kategorie-Marke', () => {
		const html = renderTable([material({ name: 'Bier', category: 'Getränke' })], false);
		expect(html).toContain('font-bold');
		expect(html).toContain('Bier');
		expect(html).toContain('Getränke');
	});

	it('setzt einen Strich, wo kein Lieferant erfasst ist', () => {
		expect(renderTable([material({ supplier: null })], false)).toContain('–');
		expect(renderTable([material({ supplier: 'Metro' })], false)).toContain('Metro');
	});

	it('nennt das Gebinde als „Menge Einheit pro Gebinde"', () => {
		expect(renderTable([material(fass)], false)).toContain('50 Liter pro Fass');
	});

	it('zeigt Mengen in Basiseinheiten und darunter die Gebinde-Umrechnung', () => {
		const html = renderTable([material(fass)], false);
		expect(html).toContain('200'); // 4 Fass à 50 Liter
		expect(html).toContain('→ 4 × Fass');
		expect(html).toContain('150'); // 3 Fass verbraucht
		expect(html).toContain('→ 3 × Fass');
	});

	it('lässt Verbraucht einen Strich, solange nichts nachgetragen ist', () => {
		const html = renderTable([material({ ...fass, actual_quantity: null })], false);
		expect(html).not.toContain('→ 3 × Fass');
	});

	it('färbt Mehrverbrauch rot und Minderverbrauch grün', () => {
		const preis = { unit_price: 2, tax_rate: null, price_is_net: false };
		const mehr = renderTable([material({ ...preis, ordered_quantity: 30, actual_quantity: 35 })], false);
		const weniger = renderTable([material({ ...preis, ordered_quantity: 30, actual_quantity: 25 })], false);

		expect(mehr).toContain('+5');
		expect(mehr).toContain('text-rot');
		expect(weniger).toContain('-5');
		expect(weniger).toContain('text-gruen');
		expect(weniger).not.toContain('text-rot');
	});

	it('schreibt den Steuersatz aus und nennt eine Position ohne ihn „keine"', () => {
		expect(renderTable([material({ tax_rate: 20 })], false)).toContain('20 %');
		expect(renderTable([material({ tax_rate: null })], false)).toContain('keine');
	});

	it('trennt Netto und Brutto — mit Steuersatz zwei Beträge, ohne ihn zweimal derselbe', () => {
		const mitMwSt = renderTable(
			[material({ unit_price: 10, tax_rate: 20, price_is_net: true, ordered_quantity: 1 })],
			false
		);
		expect(mitMwSt).toContain('10,00'); // netto
		expect(mitMwSt).toContain('12,00'); // brutto, 10 € + 20 %

		const ohneMwSt = renderTable(
			[material({ unit_price: 12, tax_rate: null, ordered_quantity: 1 })],
			false
		);
		// Netto, Brutto, Gesamt der einen Zeile — und die Zwischensumme im Fuß
		expect(ohneMwSt.match(/12,00/g)).toHaveLength(4);
	});
});

describe('MaterialTable — Preislücke (#114)', () => {
	it('stempelt in Netto und Brutto ein rot gestricheltes FEHLT', () => {
		const html = renderTable([material({ unit_price: null, ordered_quantity: 4 })], false);

		expect(html.match(/Fehlt/g)).toHaveLength(2);
		expect(html).toContain('border-dashed');
		expect(html).toContain('border-rot');
	});

	it('lässt Gesamt leer und die Position aus der Zwischensumme heraus', () => {
		const html = renderTable(
			[
				material({ id: 'a', unit_price: 10, tax_rate: null, ordered_quantity: 2 }),
				material({ id: 'b', name: 'Eis', unit_price: null, ordered_quantity: 4 })
			],
			false
		);

		expect(html).toContain('20,00'); // Zeilensumme und Zwischensumme der bepreisten Zeile
		expect(html).not.toContain('40,00');
	});
});

describe('MaterialTable — Zwischensumme im Fuß', () => {
	it('nennt den Fuß „Zwischensumme (gefiltert)" — er summiert die sichtbaren Zeilen', () => {
		const html = renderTable([material({ unit_price: 10, ordered_quantity: 2 })], false);
		expect(html).toContain('Zwischensumme (gefiltert)');
		expect(html).not.toContain('Gesamtkosten');
	});

	it('steht auch dann, wenn keine Position einen Preis trägt — der Kopf des Kastens tut es auch', () => {
		const html = renderTable([material({ unit_price: null })], false);
		expect(html).toContain('Zwischensumme (gefiltert)');
		expect(html).toContain('0,00');
	});

	it('summiert brutto über die übergebenen (gefilterten) Positionen', () => {
		const html = renderTable([
			material({ id: 'a', unit_price: 2, tax_rate: 20, price_is_net: true, ordered_quantity: 10 }),
			material({ id: 'b', name: 'Wein', unit_price: 3, ordered_quantity: 5 })
		], false);
		expect(html).toContain('39,00'); // 2 netto → 2,40 brutto × 10, plus 3 × 5
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
			material({ id: 'b', name: 'Wein', ordered_quantity: 5, unit_price: 3.3, tax_rate: 10, price_is_net: false }),
			// ohne Steuersatz → 1,50 × 7 = 10,50
			material({ id: 'c', name: 'Saft', ordered_quantity: 7, unit_price: 1.5, tax_rate: null }),
			// ohne Preis → zählt nicht mit
			material({ id: 'd', name: 'Eis', ordered_quantity: 4, unit_price: null })
		], false);
		expect(html).toContain('51,00');
	});

	it('läuft nicht gegen die Zeilensummen auseinander (drei Positionen à 0,105 €)', () => {
		const html = renderTable([
			material({ id: 'a', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'b', name: 'Wein', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'c', name: 'Saft', unit_price: 0.105, ordered_quantity: 1 })
		], false);
		// je Zeile die gerundete Zeilensumme — dazu dreimal derselbe Netto- und
		// Bruttopreis, macht neun Treffer
		expect(html.match(/0,11/g)).toHaveLength(9);
		expect(html).toContain('0,33'); // Zwischensumme = Σ der Zeilen, kein Cent Abweichung
	});
});
