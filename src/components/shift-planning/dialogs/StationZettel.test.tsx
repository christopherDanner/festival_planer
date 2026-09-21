import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { emptyStationForm, type StationForm } from '@/lib/shiftDialogForm';
import type { Helper } from '@/lib/helperService';
import StationZettel, { type StationZettelProps } from './StationZettel';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   `StationZettel` ist der *Zettel* des Station-Dialogs — Plakat-Optik,
   Feldschnitt, Beschriftungen, Fußleiste. Er ist gesteuert (`form` rein,
   `onChange` raus) und kennt weder Radix-Dialog noch Supabase; das Öffnen und
   der Formularzustand liegen in `StationDialog`, die Regeln in
   `shiftDialogForm`. */

const noop = () => {};

const HELPERS = [
	{ id: 'h1', first_name: 'Franz', last_name: 'Hochauer' },
	{ id: 'h2', first_name: 'Maria', last_name: 'Leitner' }
] as Helper[];

const props = (over: Partial<StationZettelProps> = {}): StationZettelProps => ({
	mode: 'create',
	form: emptyStationForm(),
	helpers: HELPERS,
	onChange: noop,
	onCancel: noop,
	onSave: noop,
	...over
});

const render = (over: Partial<StationZettelProps> = {}) =>
	renderToStaticMarkup(<StationZettel {...props(over)} />);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

const gefuellt = (over: Partial<StationForm> = {}): StationForm => ({
	...emptyStationForm(),
	name: 'Ausschank',
	...over
});

describe('StationZettel — Plakat-Optik', () => {
	it('ist ein Zettel: Papier-Grund, Tinte-Rahmen, Versatz-Schatten', () => {
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
		expect(html).toContain('Neue Station');
	});

	it('nennt beim Bearbeiten die Station, nicht das Anlegen', () => {
		const html = render({ mode: 'edit', form: gefuellt() });

		expect(html).toContain('Station bearbeiten');
		expect(html).not.toContain('Neue Station');
	});

	it('beschriftet die Felder als Versalien-Kleinlabels (800, .06em)', () => {
		const html = render();

		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
	});

	it('setzt den Fokus als 2px-Tinte-Outline mit Versatz — an jedem Feld', () => {
		const host = parse(render());

		for (const id of ['station-name', 'station-place', 'station-required', 'station-responsible']) {
			expect(host.querySelector(`#${id}`)?.className).toContain('focus-visible:outline-tinte');
		}
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});

describe('StationZettel — Feldschnitt', () => {
	it('führt Name, Ort, Soll-Personen und den Verantwortlichen', () => {
		const html = render();

		expect(html).toContain('Name');
		expect(html).toContain('Ort');
		expect(html).toContain('Soll-Personen');
		expect(html).toContain('Verantwortlicher');
	});

	it('markiert den Verantwortlichen mit der Krone aus der Bildsprache', () => {
		expect(render()).toContain('♛');
	});

	it('bietet die Helfer des Fests zur Wahl — Nachname zuerst', () => {
		expect(render({ form: gefuellt({ responsible_helper_id: 'h1' }) })).toContain('Hochauer Franz');
	});
});

describe('StationZettel — Fußleiste', () => {
	it('speichert mit dem gelben Primärknopf', () => {
		const knopf = parse(render({ form: gefuellt() })).querySelector('[data-zettel="speichern"]');

		expect(knopf?.className).toContain('bg-primary');
	});

	it('sperrt das Speichern, solange kein Name dasteht', () => {
		const leer = parse(render()).querySelector('[data-zettel="speichern"]');
		expect(leer?.hasAttribute('disabled')).toBe(true);

		const voll = parse(render({ form: gefuellt() })).querySelector('[data-zettel="speichern"]');
		expect(voll?.hasAttribute('disabled')).toBe(false);
	});

	it('bietet neben dem Speichern immer einen Rückweg', () => {
		const html = render();

		expect(html).toContain('Abbrechen');
		expect(html).toContain('Schließen');
	});
});
