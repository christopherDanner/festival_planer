import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Ruler } from './Ruler';

describe('Ruler', () => {
	it('setzt die Marke ohne eigene Angabe auf den Ist-Wert', () => {
		const html = renderToStaticMarkup(<Ruler value={4400} max={8800} />);
		expect(html).toContain('width:50%');
		expect(html.match(/left:50%/g)).toHaveLength(1);
	});

	it('setzt die Marke auf ihre eigene Position, unabhängig von der Füllung', () => {
		const html = renderToStaticMarkup(<Ruler value={4400} max={8800} mark={2200} />);
		expect(html).toContain('width:50%');
		expect(html).toContain('left:25%');
	});

	it('beschriftet die Marke', () => {
		const html = renderToStaticMarkup(
			<Ruler value={4850} max={4850} mark={4400} markLabel="Vorjahr" />
		);
		expect(html).toContain('Vorjahr');
	});

	it('nimmt einen eigenen Vorlesetext statt des abgeleiteten', () => {
		const html = renderToStaticMarkup(
			<Ruler value={4850} max={4850} mark={4400} valueText="€ 4.850, Vorjahr € 4.400" />
		);
		expect(html).toContain('aria-valuetext="€ 4.850, Vorjahr € 4.400"');
		expect(html).not.toContain('fehlen');
	});
});
