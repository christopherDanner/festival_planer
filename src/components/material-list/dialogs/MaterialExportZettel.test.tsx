import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { planMaterialExport } from '@/lib/materialExportPlan';
import type { GroupableMaterial } from '@/lib/materialGrouping';
import MaterialExportZettel, { type MaterialExportZettelProps } from './MaterialExportZettel';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `MaterialExportZettel` ist der *Zettel* des Materiallisten-Export-Dialogs —
   Plakat-Optik wie der Positions-Dialog (#117), die Achse aus #113 als
   Auswahl, die Zahlen der Auswahl und die zwei Ausgabe-Knöpfe. Er ist
   gesteuert (Achse und Gruppe rein, Handler raus) und kennt weder Radix-Dialog
   noch jsPDF; geplant wird in `materialExportPlan`, gedruckt in
   `materialExportService`. */

const noop = () => {};

const MATERIALS: GroupableMaterial[] = [
	{
		name: 'Bier',
		category: 'Getränke',
		supplier: 'Huber',
		station: { id: 's1', name: 'Ausschank' },
		// 10 € netto + 20 % = 12 € brutto; 5 bestellt → 60 €, 3 verbraucht → 36 €.
		ordered_quantity: 5,
		actual_quantity: 3,
		unit_price: 10,
		tax_rate: 20,
		price_is_net: true
	},
	{
		name: 'Zelt',
		category: null,
		supplier: null,
		station: null,
		ordered_quantity: 1,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true
	}
];

const props = (over: Partial<MaterialExportZettelProps> = {}): MaterialExportZettelProps => ({
	axis: 'station',
	onAxisChange: noop,
	groupId: null,
	onGroupChange: noop,
	plan: planMaterialExport(MATERIALS, over.axis ?? 'station', over.groupId ?? null),
	onPdf: noop,
	onExcel: noop,
	onCancel: noop,
	...over
});

const render = (over: Partial<MaterialExportZettelProps> = {}) =>
	renderToStaticMarkup(<MaterialExportZettel {...props(over)} />);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

describe('MaterialExportZettel — Plakat-Optik', () => {
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
		expect(html).toContain('Materialliste exportieren');
	});

	it('beschriftet die Felder als Versalien-Kleinlabels (800, .06em)', () => {
		const html = render();
		expect(html).toContain('Sortiert nach');
		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
	});

	it('setzt den Fokus als 2px-Tinte-Outline mit Versatz', () => {
		const host = parse(render());
		expect(host.querySelector('#mat-export-group')?.className).toContain(
			'focus-visible:outline-tinte'
		);
		expect(host.querySelector('[data-export="pdf"]')?.className).toContain(
			'focus-visible:outline-offset-2'
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

	it('bietet neben dem Exportieren immer einen Rückweg', () => {
		const html = render();
		expect(html).toContain('Abbrechen');
		expect(html).toContain('Schließen');
	});
});

describe('MaterialExportZettel — Achse und Gruppe', () => {
	it('lässt entlang der vier Achsen der Arbeitsliste wählen', () => {
		const html = render();
		for (const label of ['STATION', 'LIEFERANT', 'KATEGORIE', 'ALLE']) {
			expect(html).toContain(label);
		}
	});

	it('nennt die Gruppen der Achse samt Anzahl in der Auswahl', () => {
		const html = render({ axis: 'station' });
		expect(html).toContain('Alle Gruppen (einzelne Dateien)');
		// Radix setzt nur den gewählten Wert in den Trigger; die Liste hängt im
		// Portal. Geprüft wird darum, was der Zettel anbietet.
		expect(render({ axis: 'station', groupId: 'station:s1' })).toContain('Ausschank (1)');
	});

	it('fragt auf der Achse ALLE nicht nach der Gruppe — es gibt nur eine', () => {
		expect(render({ axis: 'all' })).not.toContain('mat-export-group');
	});
});

describe('MaterialExportZettel — Zahlen der Auswahl', () => {
	it('zeigt Bestellwert und Verbrauchswert aus dem Rechenmodul', () => {
		const html = render({ axis: 'all' });
		expect(html).toContain('Bestellt €');
		expect(html).toContain('€ 60');
		expect(html).toContain('Verbraucht €');
		expect(html).toContain('€ 36');
	});

	it('sagt, wie viele Dateien entstehen, sobald es mehr als eine ist', () => {
		expect(render({ axis: 'station', groupId: null })).toContain('2 Dateien');
		expect(render({ axis: 'all' })).not.toContain('Dateien');
	});

	it('stempelt die Preislücke der Auswahl', () => {
		expect(render({ axis: 'all' })).toContain('1 ohne Preis');
	});

	it('sperrt beide Knöpfe, wo es nichts zu exportieren gibt', () => {
		const host = parse(
			renderToStaticMarkup(
				<MaterialExportZettel
					{...props({ plan: planMaterialExport([], 'station', null) })}
				/>
			)
		);
		expect(host.querySelector('[data-export="pdf"]')?.hasAttribute('disabled')).toBe(true);
		expect(host.querySelector('[data-export="excel"]')?.hasAttribute('disabled')).toBe(true);
		expect(host.textContent).toContain('Nichts zu exportieren');
	});
});
