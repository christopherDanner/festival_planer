import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { emptyShiftForm, type ShiftForm } from '@/lib/shiftDialogForm';
import type { Station } from '@/lib/shiftService';
import ShiftZettel, { type ShiftZettelProps } from './ShiftZettel';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   `ShiftZettel` ist der *Zettel* des Schicht-Dialogs — Plakat-Optik,
   Feldschnitt, Beschriftungen, Fußleiste. Gesteuert wie der Station-Zettel;
   die Regeln (Pflichtfelder, Mitternacht, Abgabe) liegen in
   `shiftDialogForm`, das Öffnen in `StationShiftDialog`. */

const noop = () => {};

const STATION = { id: 's1', festival_id: 'f1', name: 'Ausschank', required_people: 2 } as Station;

const props = (over: Partial<ShiftZettelProps> = {}): ShiftZettelProps => ({
	mode: 'create',
	form: emptyShiftForm(STATION),
	stationName: STATION.name,
	onChange: noop,
	onCancel: noop,
	onSave: noop,
	...over
});

const render = (over: Partial<ShiftZettelProps> = {}) =>
	renderToStaticMarkup(<ShiftZettel {...props(over)} />);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

const gefuellt = (over: Partial<ShiftForm> = {}): ShiftForm => ({
	...emptyShiftForm(STATION),
	name: 'Frühschoppen',
	start_date: '2026-07-25',
	start_time: '11:00',
	end_time: '15:00',
	...over
});

describe('ShiftZettel — Plakat-Optik', () => {
	it('ist ein Zettel: Papier-Grund, Tinte-Rahmen, Versatz-Schatten', () => {
		const html = render();

		expect(html).toContain('bg-papier');
		expect(html).toContain('border-3');
		expect(html).toContain('border-tinte');
		expect(html).toContain('shadow-versatz');
	});

	it('nennt im Plakat-Kopf die Station, für die die Schicht entsteht', () => {
		const html = render();

		expect(html).toContain('poster');
		expect(html).toContain('font-display');
		expect(html).toContain('Neue Schicht für Ausschank');
	});

	it('nennt beim Bearbeiten die Schicht, nicht das Anlegen', () => {
		const html = render({ mode: 'edit', form: gefuellt() });

		expect(html).toContain('Schicht bearbeiten');
		expect(html).not.toContain('Neue Schicht');
	});

	it('beschriftet die Felder als Versalien-Kleinlabels (800, .06em)', () => {
		const html = render();

		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
	});

	it('setzt den Fokus als 2px-Tinte-Outline mit Versatz — an jedem Feld', () => {
		const host = parse(render());

		for (const id of [
			'shift-name',
			'shift-start-date',
			'shift-start-time',
			'shift-end-date',
			'shift-end-time',
			'shift-required'
		]) {
			expect(host.querySelector(`#${id}`)?.className).toContain('focus-visible:outline-tinte');
		}
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});

describe('ShiftZettel — Feldschnitt', () => {
	it('führt Name, Startdatum, Startzeit, Enddatum, Endzeit und Soll-Personen', () => {
		const html = render();

		for (const feld of [
			'Name',
			'Startdatum',
			'Startzeit',
			'Enddatum',
			'Endzeit',
			'Soll-Personen'
		]) {
			expect(html).toContain(feld);
		}
	});

	it('erklärt das Enddatum als das, wofür es da ist — Mitternacht', () => {
		expect(render()).toContain('Mitternacht');
	});

	it('bestätigt die Nachtschicht, sobald das Enddatum abweicht', () => {
		const html = render({ form: gefuellt({ start_time: '23:00', end_time: '02:00', end_date: '2026-07-26' }) });

		// Der Zettel sagt vorab, wie die Zeile im Fokus-Kasten heißen wird.
		expect(html).toContain('23–02 +1');
		expect(html).toContain('Starttag');
	});

	it('schweigt zur Nachtschicht, solange das Enddatum der Starttag ist', () => {
		expect(render({ form: gefuellt({ end_date: '2026-07-25' }) })).not.toContain('+1');
	});
});

describe('ShiftZettel — Fußleiste', () => {
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

	it('sperrt ein Enddatum vor dem Startdatum', () => {
		const knopf = parse(render({ form: gefuellt({ end_date: '2026-07-24' }) })).querySelector(
			'[data-zettel="speichern"]'
		);

		expect(knopf?.hasAttribute('disabled')).toBe(true);
	});

	it('bietet neben dem Speichern immer einen Rückweg', () => {
		const html = render();

		expect(html).toContain('Abbrechen');
		expect(html).toContain('Schließen');
	});
});
