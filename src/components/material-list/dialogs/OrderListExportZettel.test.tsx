import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildOrderList, planOrderListExport, type OrderListAxis } from '@/lib/orderList';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import OrderListExportZettel, { type OrderListExportZettelProps } from './OrderListExportZettel';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `OrderListExportZettel` ist der *Zettel* des Bestelllisten-Export-Dialogs —
   Plakat-Optik wie der Positions-Dialog (#117), Achse Lieferant/Station als
   Auswahl, die Zahlen der Bestellung, zwei Ausgabe-Knöpfe. Gesteuert; welche
   Positionen auf die Bestellliste kommen (nur Bestellmenge > 0) entscheidet
   `orderList`, nicht dieser Zettel. */

const noop = () => {};

function material(over: Partial<FestivalMaterialWithStation>): FestivalMaterialWithStation {
	return {
		id: over.name ?? 'm',
		festival_id: 'f1',
		station_id: null,
		name: 'Position',
		category: null,
		supplier: null,
		unit: 'Stück',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 1,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		station: null,
		...over
	};
}

const MATERIALS = [
	// 10 € netto + 20 % = 12 € brutto × 5 = 60 €
	material({ name: 'Bier', supplier: 'Huber', ordered_quantity: 5, unit_price: 10, tax_rate: 20 }),
	material({ name: 'Kohle', supplier: 'Maier', ordered_quantity: 2 }),
	// Bestellmenge 0 — steht auf keiner Bestellliste
	material({ name: 'Wein', supplier: 'Huber', ordered_quantity: 0, unit_price: 5 })
];

const props = (
	over: Partial<OrderListExportZettelProps> & { axis?: OrderListAxis } = {}
): OrderListExportZettelProps => {
	const axis = over.axis ?? 'supplier';
	const selectedKey = over.selectedKey ?? null;
	return {
		axis,
		onAxisChange: noop,
		selectedKey,
		onSelectedKeyChange: noop,
		groups: buildOrderList(MATERIALS, axis),
		plan: planOrderListExport(MATERIALS, axis, selectedKey),
		onPdf: noop,
		onExcel: noop,
		onCancel: noop,
		...over
	};
};

const render = (over: Partial<OrderListExportZettelProps> = {}) =>
	renderToStaticMarkup(<OrderListExportZettel {...props(over)} />);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

describe('OrderListExportZettel — Plakat-Optik', () => {
	it('ist ein Zettel: Papier-Grund, 3px-Tinte-Rahmen, Versatz-Schatten', () => {
		const html = render();
		expect(html).toContain('bg-papier');
		expect(html).toContain('border-3');
		expect(html).toContain('border-tinte');
		expect(html).toContain('shadow-versatz');
	});

	it('trägt einen grünen Halftone-Kopf mit Oswald-Titel', () => {
		const html = render();
		expect(html).toContain('poster');
		expect(html).toContain('font-display');
		expect(html).toContain('Bestellliste exportieren');
	});

	it('beschriftet die Felder als Versalien-Kleinlabels (800, .06em)', () => {
		const html = render();
		expect(html).toContain('Gruppiert nach');
		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
	});

	it('setzt den Fokus als 2px-Tinte-Outline mit Versatz', () => {
		const host = parse(render());
		expect(host.querySelector('#order-export-group')?.className).toContain(
			'focus-visible:outline-tinte'
		);
	});

	it('druckt mit dem gelben Primärknopf und bietet Excel daneben', () => {
		const host = parse(render());
		expect(host.querySelector('[data-export="pdf"]')?.className).toContain('bg-primary');
		expect(host.querySelector('[data-export="excel"]')?.textContent).toBe('Excel');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});

describe('OrderListExportZettel — Achse der Bestellliste', () => {
	it('gruppiert nach Lieferant oder Station, Lieferant zuerst', () => {
		const html = render();
		expect(html.indexOf('LIEFERANT')).toBeGreaterThan(-1);
		expect(html.indexOf('LIEFERANT')).toBeLessThan(html.indexOf('STATION'));
		// Die Achsen der Arbeitsliste, die es hier nicht gibt.
		expect(html).not.toContain('KATEGORIE');
	});

	it('nennt die Achse in der Auswahl „alle …"', () => {
		expect(render({ axis: 'supplier' })).toContain('Alle Lieferanten');
		expect(render({ axis: 'station' })).toContain('Alle Stationen');
	});

	it('zeigt die gewählte Gruppe samt Positionszahl', () => {
		expect(render({ selectedKey: 'Huber' })).toContain('Huber (1)');
	});

	it('sagt, dass nur Positionen mit Bestellmenge draufstehen', () => {
		expect(render()).toContain('Nur Positionen mit Bestellmenge');
	});
});

describe('OrderListExportZettel — Zahlen der Bestellung', () => {
	it('zeigt den Bestellwert aus dem Rechenmodul, ohne Verbrauchswert', () => {
		const html = render({ selectedKey: 'Huber' });
		expect(html).toContain('Bestellt €');
		expect(html).toContain('€ 60');
		// Die Bestellliste ist die Bestellung — verbraucht ist da noch nichts.
		expect(html).not.toContain('Verbraucht €');
	});

	it('zählt Einzeldateien und Sammeldokument', () => {
		// Zwei Lieferanten mit Bestellmenge + ein Sammeldokument.
		expect(render()).toContain('3 Dateien');
	});

	it('lässt die Position ohne Bestellmenge aus der Zählung', () => {
		expect(render()).toContain('2 Positionen');
	});

	it('stempelt die Preislücke', () => {
		expect(render()).toContain('1 ohne Preis');
	});

	it('sperrt beide Knöpfe, wo nichts bestellt ist', () => {
		const host = parse(
			renderToStaticMarkup(
				<OrderListExportZettel
					{...props()}
					groups={[]}
					plan={planOrderListExport([], 'supplier', null)}
				/>
			)
		);
		expect(host.querySelector('[data-export="pdf"]')?.hasAttribute('disabled')).toBe(true);
		expect(host.querySelector('[data-export="excel"]')?.hasAttribute('disabled')).toBe(true);
		expect(host.textContent).toContain('Nichts zu exportieren');
	});
});
