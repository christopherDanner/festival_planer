import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { Toolbar, ToolbarMetric } from './Toolbar';

/* Seam dieses Tests (aus #125 abgeleitet, vor dem ersten Test festgehalten):
   `Toolbar` ist der *Rahmen* einer Bereichs-Werkzeugleiste und `ToolbarMetric`
   ihre Kennzahl — beide tragen kein Bereichswissen. Geprüft wird hier der
   Umbruch am Handy: Die Kennzahl nimmt unter 900px die ganze erste Zeile, die
   Griffe stehen darunter; ab 900px teilt sie sich die Reihe wie bisher. Was in
   der Leiste *steht*, prüfen die Leisten der Bereiche (#122, #102). */

describe('Toolbar — der Rahmen', () => {
	it('bricht um, statt die Griffe aus dem Rahmen zu schieben', () => {
		expect(renderToStaticMarkup(<Toolbar>x</Toolbar>)).toContain('flex-wrap');
	});
});

describe('ToolbarMetric — die Kennzahl', () => {
	const html = renderToStaticMarkup(<ToolbarMetric label="Aufgaben" value={8} max={20} />);
	/** Der öffnende Tag des Kastens selbst — das Maßband darin ist immer breit. */
	const kasten = html.slice(0, html.indexOf('>'));

	it('nimmt am Handy die ganze erste Zeile — die Griffe stehen darunter', () => {
		expect(kasten).toContain('w-full');
	});

	it('teilt sich die Reihe ab 900px wie bisher', () => {
		expect(kasten).toContain('min-[900px]:w-auto');
		expect(kasten).toContain('min-[900px]:flex-1');
		expect(kasten).toContain('min-[900px]:min-w-[250px]');
	});

	it('nennt Aufschrift, Stand und stellt das Maßband darauf', () => {
		expect(html).toContain('Aufgaben');
		expect(html).toContain('8/20');
		expect(html).toContain('aria-valuenow="8"');
	});
});
