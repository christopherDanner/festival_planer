import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import ScheduleToolbar from './ScheduleToolbar';

/**
 * Die Werkzeugleiste des Ablaufplans (#122):
 * `[AUFGABEN 8/20 ▬▬▬] [+ AUFGABE] [+ PROGRAMMPUNKT] [PROGRAMMZETTEL] [AUFGABENLISTE]`.
 */

const noop = () => {};

const render = (done: number, all: number) =>
	renderToStaticMarkup(
		<ScheduleToolbar
			counts={{ all, open: all - done, done }}
			onAddTask={noop}
			onAddProgram={noop}
			onExportProgram={noop}
			onExportTasks={noop}
		/>
	);

describe('ScheduleToolbar — KPI-Maßband', () => {
	it('nennt die erledigten Aufgaben des ganzen Fests', () => {
		const html = render(8, 20);

		// Versalien setzt die Schrift, nicht der Text (`uppercase`).
		expect(html).toMatch(/uppercase[^>]*>Aufgaben</);
		expect(html).toContain('8/20');
	});

	it('schreibt den Wert rot, solange Aufgaben offen sind', () => {
		expect(render(8, 20)).toMatch(/text-rot[^>]*>8\/20/);
	});

	it('schreibt ihn grün, wenn alles abgehakt ist', () => {
		expect(render(20, 20)).toMatch(/text-gruen[^>]*>20\/20/);
	});

	it('stellt das Maßband auf dieselben Zahlen', () => {
		const html = render(8, 20);

		expect(html).toContain('aria-valuenow="8"');
		expect(html).toContain('aria-valuemax="20"');
	});
});

describe('ScheduleToolbar — Griffe', () => {
	it('trägt die vier Knöpfe des Bereichs', () => {
		const html = render(8, 20);

		expect(html).toContain('+ AUFGABE');
		expect(html).toContain('+ PROGRAMMPUNKT');
		expect(html).toContain('PROGRAMMZETTEL');
		expect(html).toContain('AUFGABENLISTE');
	});

	it('kennt weder „+ TAG" noch das alte Akkordeon-Vokabular', () => {
		const html = render(8, 20);

		expect(html).not.toContain('TAG');
		expect(html).not.toContain('Phase');
	});
});
