import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { autoAssignScope } from '@/lib/autoAssignScope';
import type { ShiftAssignment, Station, StationShift } from '@/lib/shiftService';
import AutoAssignZettel, { type AutoAssignZettelProps } from './AutoAssignZettel';

/* Seam dieses Tests (aus den Abnahmekriterien von #108 abgeleitet, vor dem
   ersten Test festgehalten): `AutoAssignZettel` ist der *Zettel* der
   Auto-Zuteilung — Plakat-Optik wie der Positions-Dialog (#117), die zwei
   Regler, der Erklärtext und die drei Handlungen. Er ist gesteuert (Umfang und
   Einstellung rein, Handler raus), rechnet nichts (`autoAssignScope`) und
   löscht nichts: `onClearRequest` stößt die Rückfrage an, mehr nicht. */

const noop = () => {};

const station = (over: Partial<Station> = {}): Station => ({
	id: 'st-1',
	festival_id: 'f1',
	name: 'Ausschank',
	required_people: 0,
	created_at: '',
	updated_at: '',
	...over
});

const shift = (id: string, stationId: string): StationShift =>
	({ id, festival_id: 'f1', station_id: stationId }) as StationShift;

const assignment = (id: string, stationId: string): ShiftAssignment =>
	({ id, festival_id: 'f1', station_id: stationId }) as ShiftAssignment;

const SHIFTS = [shift('sh-1', 'st-1'), shift('sh-2', 'st-2')];
const ASSIGNMENTS = [assignment('a-1', 'st-1'), assignment('a-2', 'st-2')];

const props = (over: Partial<AutoAssignZettelProps> = {}): AutoAssignZettelProps => ({
	scope: autoAssignScope(null, SHIFTS, ASSIGNMENTS),
	config: { minShiftsPerHelper: 1, maxShiftsPerHelper: 3, respectPreferences: true },
	onConfigChange: noop,
	onAssign: noop,
	onClearRequest: noop,
	onCancel: noop,
	isLoading: false,
	...over
});

const render = (over: Partial<AutoAssignZettelProps> = {}) =>
	renderToStaticMarkup(<AutoAssignZettel {...props(over)} />);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

const onlyStation = (over: Partial<AutoAssignZettelProps> = {}) =>
	render({ scope: autoAssignScope(station(), SHIFTS, ASSIGNMENTS), ...over });

describe('AutoAssignZettel — Plakat-Optik (Vision §4)', () => {
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
	});

	it('beschriftet die Regler als Versalien-Kleinlabels (800, .06em)', () => {
		const html = render();

		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
		expect(html).toContain('Min. Schichten pro Person');
		expect(html).toContain('Max. Schichten pro Person');
	});

	it('umrandet die Eingaben 2px in Tinte und setzt den Fokus als Tinte-Outline', () => {
		const host = parse(render());
		const min = host.querySelector('#auto-min-shifts');

		expect(min?.className).toContain('border-2');
		expect(min?.className).toContain('focus-visible:outline-tinte');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});

describe('AutoAssignZettel — Erklärtext', () => {
	it('sagt weiter, dass Wünsche bevorzugt und Schichten gleichmäßig verteilt werden', () => {
		const text = parse(render()).textContent ?? '';

		expect(text).toContain('Stationswünschen');
		expect(text).toContain('gleichmäßig');
	});

	it('steht auf der Papier-Fläche statt auf bg-muted', () => {
		// Die Hüllen tragen `hover:bg-muted`; gemeint ist die Fläche selbst.
		expect(parse(render()).querySelectorAll('[class~="bg-muted"]')).toHaveLength(0);
	});
});

describe('AutoAssignZettel — Handlungen', () => {
	it('teilt mit dem gelben Primärknopf zu', () => {
		const host = parse(render());

		expect(host.querySelector('[data-auto="zuteilen"]')?.className).toContain('bg-primary');
		expect(host.querySelector('[data-auto="zuteilen"]')?.textContent).toBe('Automatisch zuteilen');
	});

	it('sagt beim Zuteilen an, dass es läuft', () => {
		const host = parse(render({ isLoading: true }));
		const zuteilen = host.querySelector('[data-auto="zuteilen"]');

		expect(zuteilen?.textContent).toBe('Zuteilen...');
		expect(zuteilen?.hasAttribute('disabled')).toBe(true);
	});

	it('setzt den Lösch-Knopf rot und vom Rückweg ab — er steht nicht neben „Abbrechen"', () => {
		const host = parse(render());
		const loeschen = host.querySelector('[data-auto="loeschen"]');

		expect(loeschen?.className).toContain('border-rot');
		// `mr-auto` schiebt die Fußleiste auseinander: Zerstörerisches links,
		// Rückweg und Primäraktion rechts.
		expect(loeschen?.className).toContain('mr-auto');
	});

	it('sperrt den Lösch-Knopf, wo es nichts zu löschen gibt', () => {
		const host = parse(render({ scope: autoAssignScope(null, SHIFTS, []) }));

		expect(host.querySelector('[data-auto="loeschen"]')?.hasAttribute('disabled')).toBe(true);
	});

	it('bietet neben dem Zuteilen immer einen Rückweg', () => {
		expect(parse(render()).textContent).toContain('Abbrechen');
	});
});

describe('AutoAssignZettel — Umfang des Laufs', () => {
	it('trägt über dem Fest schlicht „Auto-Zuteilung" und den Knopf für alle', () => {
		const text = parse(render()).textContent ?? '';

		expect(text).toContain('Auto-Zuteilung');
		expect(text).not.toContain('nur Ausschank');
		expect(text).toContain('Alle Zuweisungen löschen');
	});

	it('nennt die Station im Titel, wenn der Lauf auf sie eingeschränkt ist', () => {
		expect(parse(onlyStation()).textContent).toContain('Auto-Zuteilung · nur Ausschank');
	});

	it('beschriftet den Lösch-Knopf im eingeschränkten Lauf auf die Station', () => {
		const host = parse(onlyStation());

		expect(host.querySelector('[data-auto="loeschen"]')?.textContent).toBe(
			'Zuweisungen dieser Station löschen'
		);
	});

	it('sagt im eingeschränkten Lauf, dass die Regler das ganze Fest zählen', () => {
		const text = parse(onlyStation()).textContent ?? '';

		// Sonst sammelte jemand in fünf Stationen je drei Schichten.
		expect(text).toContain('ganzen Fest');
	});
});
