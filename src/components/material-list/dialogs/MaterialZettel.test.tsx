import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Station } from '@/lib/shiftService';
import { emptyMaterialForm, ZEILEN_HINWEIS, type MaterialForm } from '@/lib/materialDialogForm';
import MaterialZettel, { type MaterialZettelProps } from './MaterialZettel';

/* Seam dieses Tests (aus #117 abgeleitet, vor dem ersten Test festgehalten):
   MaterialZettel ist der *Zettel* des Positions-Dialogs — Plakat-Optik,
   Feldschnitt, Beschriftungen, Fußleiste. Er ist gesteuert (`form` rein,
   `onChange` raus) und kennt weder Radix-Dialog noch Supabase; das Öffnen,
   der Formularzustand und das Speichern liegen in MaterialDialog, die
   Rechen- und Schnittregeln in `materialDialogForm`. */

const noop = () => {};

const STATIONS: Station[] = [
	{ id: 's1', festival_id: 'f1', name: 'Ausschank', required_people: 2 } as Station,
	{ id: 's2', festival_id: 'f1', name: 'Küche', required_people: 3 } as Station
];

const props = (over: Partial<MaterialZettelProps> = {}): MaterialZettelProps => ({
	mode: 'create',
	form: emptyMaterialForm(),
	onChange: noop,
	stations: STATIONS,
	categorySuggestions: ['Getränke'],
	supplierSuggestions: ['Brauerei Schwechat'],
	onCancel: noop,
	onSave: noop,
	...over
});

const render = (over: Partial<MaterialZettelProps> = {}) =>
	renderToStaticMarkup(<MaterialZettel {...props(over)} />);

/** Der Zettel steckt in keinem Portal — für Attribut-Fragen reicht ein
Wegwerf-Element statt eines gemounteten Baums. */
const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

const gefuellt = (over: Partial<MaterialForm> = {}): MaterialForm => ({
	...emptyMaterialForm(),
	name: 'Bier',
	ordered_quantity: '300',
	...over
});

describe('MaterialZettel — Plakat-Optik', () => {
	it('ist ein Zettel: Papier-Grund, Tinte-Rahmen, Versatz-Schatten', () => {
		const html = render();
		expect(html).toContain('bg-papier');
		expect(html).toContain('border-3');
		expect(html).toContain('border-tinte');
		expect(html).toContain('shadow-versatz');
	});

	it('trägt einen grünen Halftone-Kopf mit Oswald-Titel', () => {
		const html = render();
		// `poster` ist das Halftone-Rezept des Toolkits (ADR 0003).
		expect(html).toContain('poster');
		expect(html).toContain('font-display');
		expect(html).toContain('Neue Position');
	});

	it('nennt beim Bearbeiten die Position, nicht das Anlegen', () => {
		const html = render({ mode: 'edit', form: gefuellt() });
		expect(html).toContain('Position bearbeiten');
		expect(html).not.toContain('Neue Position');
	});

	it('beschriftet die Felder als Versalien-Kleinlabels (800, .06em)', () => {
		const html = render();
		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
	});

	it('setzt den Fokus als 2px-Tinte-Outline mit Versatz', () => {
		const html = render();
		expect(html).toContain('focus-visible:outline-tinte');
		expect(html).toContain('focus-visible:outline-offset-2');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});

describe('MaterialZettel — Stammdaten-Schnitt', () => {
	const EDIT = { mode: 'edit', form: gefuellt() } as const;

	it('zeigt beim Bearbeiten genau die Stammdaten', () => {
		const html = render(EDIT);
		for (const feld of [
			'Bezeichnung',
			'Kategorie',
			'Station',
			'Lieferant',
			'Gebinde',
			'Einheit',
			'Notiz'
		]) {
			expect(html).toContain(feld);
		}
	});

	it('lässt Mengen und Preise beim Bearbeiten weg — die macht die Zeile', () => {
		const html = render(EDIT);
		expect(html).not.toContain('Bestellt');
		expect(html).not.toContain('Verbraucht');
		expect(html).not.toContain('MwSt');
		expect(html).not.toContain('Preisbasis');
	});

	it('erklärt die Lücke an Ort und Stelle', () => {
		expect(render(EDIT)).toContain(ZEILEN_HINWEIS);
	});

	it('macht eine neue Position in einem Zug vollständig', () => {
		const html = render();
		expect(html).toContain('Bestellt');
		expect(html).toContain('Verbraucht');
		expect(html).toContain('MwSt');
		expect(html).toContain('Preisbasis');
		// Beim Anlegen sind die Felder da — der Hinweis wäre dann falsch.
		expect(html).not.toContain(ZEILEN_HINWEIS);
	});

	it('bietet die Bezugsgröße des Preises erst mit Gebinde an', () => {
		expect(render()).not.toContain('Preis bezieht sich auf');
		const mitGebinde = render({ form: gefuellt({ packaging_unit: 'Fass', unit: 'Liter' }) });
		expect(mitGebinde).toContain('Preis bezieht sich auf');
	});

	it('beschriftet „Stück je Gebinde“ mit den echten Einheiten, sobald es welche gibt', () => {
		expect(render()).toContain('Stück je Gebinde');
		expect(render({ form: gefuellt({ unit: 'Liter', packaging_unit: 'Fass' }) })).toContain(
			'Liter je Fass'
		);
	});

	it('sperrt „Stück je Gebinde“, solange kein Gebinde gewählt ist', () => {
		const feld = parse(render()).querySelector('#mat-amount-per');
		expect(feld?.hasAttribute('disabled')).toBe(true);
		const mitGebinde = parse(render({ form: gefuellt({ packaging_unit: 'Fass' }) })).querySelector(
			'#mat-amount-per'
		);
		expect(mitGebinde?.hasAttribute('disabled')).toBe(false);
	});
});

describe('MaterialZettel — Anlegen von Station und Kategorie', () => {
	it('behält „+ Station“, wo eine Station angelegt werden darf', () => {
		expect(render({ onCreateStation: async () => STATIONS[0] })).toContain('+ Station');
	});

	it('bietet es nicht an, wo es keinen Weg dorthin gibt', () => {
		expect(render({ onCreateStation: undefined })).not.toContain('+ Station');
	});

	it('führt Kategorie und Lieferant als anlegbare Auswahl', () => {
		const host = parse(render());
		expect(host.querySelector('#mat-category')?.getAttribute('role')).toBe('combobox');
		expect(host.querySelector('#mat-supplier')?.getAttribute('role')).toBe('combobox');
	});
});

describe('MaterialZettel — Fußleiste', () => {
	it('speichert mit dem gelben Primärknopf', () => {
		const knopf = parse(render({ form: gefuellt() })).querySelector('[data-zettel="speichern"]');
		expect(knopf?.className).toContain('bg-primary');
	});

	it('sperrt das Speichern, solange die Pflichtfelder fehlen', () => {
		const leer = parse(render()).querySelector('[data-zettel="speichern"]');
		expect(leer?.hasAttribute('disabled')).toBe(true);
		const voll = parse(render({ form: gefuellt() })).querySelector('[data-zettel="speichern"]');
		expect(voll?.hasAttribute('disabled')).toBe(false);
	});

	it('lässt eine bestehende Position ohne Bestellmenge speichern', () => {
		const knopf = parse(
			render({ mode: 'edit', form: { ...emptyMaterialForm(), name: 'Bier' } })
		).querySelector('[data-zettel="speichern"]');
		expect(knopf?.hasAttribute('disabled')).toBe(false);
	});

	it('bietet neben dem Speichern immer einen Rückweg', () => {
		const html = render();
		expect(html).toContain('Abbrechen');
		expect(html).toContain('Schließen');
	});
});
