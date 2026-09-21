import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import ShareZettel from './ShareZettel';
import { helper } from '@/lib/__tests__/shiftFixtures';

/* Seam dieses Tests (#109, vor dem ersten Test festgehalten): `ShareZettel` ist
   der Zettel des Teilen-Dialogs — Modus-Umschalter, Personen-Marken, Vorschau
   und die vier Ausgaben. Er ist gesteuert; Zustand und Text hält `ShareDialog`,
   den Wortlaut des Textes setzt `shiftPlanText`. Hier zählt nur die
   Handschrift. */

const noop = () => {};

const HELPERS = [
	helper({ id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }),
	helper({ id: 'h2', first_name: 'Maria', last_name: 'Leitner' })
];

const render = (over: Partial<React.ComponentProps<typeof ShareZettel>> = {}) =>
	renderToStaticMarkup(
		<ShareZettel
			mode="full"
			onModeChange={noop}
			helpers={HELPERS}
			selectedHelperId={null}
			onSelectHelper={noop}
			previewText="SCHICHTPLAN\nStadlfest 2026"
			onCopy={noop}
			onWhatsApp={noop}
			onPdf={noop}
			onExcel={noop}
			onCancel={noop}
			{...over}
		/>
	);

describe('ShareZettel — Handschrift', () => {
	it('sitzt im Plakat-Rahmen mit Versatz-Schatten', () => {
		const html = render();

		expect(html).toContain('Schichtplan teilen');
		expect(html).toMatch(/border-3 border-tinte[^"]*shadow-versatz/);
	});

	it('setzt den Modus als invertierten Umschalter, nicht als zwei Knöpfe', () => {
		const html = render();

		expect(html).toContain('role="radiogroup"');
		expect(html).toContain('Ganzer Plan');
		expect(html).toContain('Plan einer Person');
		// Invertiert: der gewählte Reiter trägt Tinte-Fläche und gelbe Schrift.
		expect(html).toMatch(/aria-checked="true"[^>]*bg-tinte text-gelb/);
	});

	it('fragt nach der Person erst im Personen-Modus', () => {
		expect(render()).not.toContain('Hochauer Franz');
		expect(render({ mode: 'helper' })).toContain('Hochauer Franz');
	});

	it('bietet die Personen als Marken an, nicht als Auswahlliste', () => {
		const html = render({ mode: 'helper', selectedHelperId: 'h2' });

		// Marken sind Knöpfe mit der Namens-Marke, kein Radix-Select-Auslöser.
		expect(html).not.toContain('role="combobox"');
		expect(html.match(/name-chip/g)).toHaveLength(2);
		expect(html).toMatch(/aria-pressed="true"[^>]*name-chip/);
	});

	it('setzt die Vorschau auf Papier-Fläche mit 2px Rahmen', () => {
		expect(render()).toMatch(/border-2 border-tinte bg-papier/);
	});

	it('sagt im Personen-Modus ohne Auswahl, was fehlt — statt einer leeren Fläche', () => {
		const html = render({ mode: 'helper', previewText: '' });

		expect(html).toContain('Person wählen');
		expect(html).not.toMatch(/border-2 border-tinte bg-papier/);
	});

	it('trägt die vier Ausgaben — Zwischenablage, WhatsApp, Excel, PDF', () => {
		const html = render();

		for (const key of ['copy', 'whatsapp', 'excel', 'pdf']) {
			expect(html).toContain(`data-share="${key}"`);
		}
	});

	it('sperrt die Text-Ausgaben ohne Text, lässt die Dateien aber zu', () => {
		// Ohne gewählte Person gibt es keinen Text — das Papier gibt es trotzdem.
		const html = render({ mode: 'helper', previewText: '' });

		expect(html).toMatch(/data-share="copy"[^>]*disabled/);
		expect(html).toMatch(/data-share="whatsapp"[^>]*disabled/);
		expect(html).not.toMatch(/data-share="pdf"[^>]*disabled/);
	});

	it('bringt genau einen Schließen-Knopf mit — den im Plakat-Kopf', () => {
		expect(render().match(/Schließen/g)).toHaveLength(1);
	});
});
