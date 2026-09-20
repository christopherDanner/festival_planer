import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import MaterialCardFooterBar from './MaterialCardFooterBar';

const noop = () => {};

const render = (open: number, dirty: number) =>
	renderToStaticMarkup(
		<MaterialCardFooterBar open={open} dirty={dirty} onSaveAll={noop} onDiscardAll={noop} />
	);

function text(html: string): string {
	return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

describe('MaterialCardFooterBar — die Sammel-Fußleiste (#116)', () => {
	it('bleibt weg, solange höchstens eine Karte offen ist — dort genügen ✓ und ✕', () => {
		expect(render(0, 0)).toBe('');
		expect(render(1, 1)).toBe('');
	});

	it('zählt offene und darunter geänderte Karten', () => {
		expect(text(render(3, 2))).toContain('3 Karten offen, davon 2 geändert');
	});

	it('bietet beide Wege über alle offenen Karten an', () => {
		const html = render(3, 2);

		expect(text(html)).toContain('Alle verwerfen');
		expect(text(html)).toContain('Alle 3 speichern');
		// Versalien setzt die Handschrift, nicht der Wortlaut (DESIGN-VISION §4).
		expect(html).toContain('uppercase');
	});

	it('klebt über der Fest-Tab-Leiste, statt sie zu verdecken', () => {
		const html = render(2, 1);

		expect(html).toContain('fixed');
		expect(html).toContain('safe-area-inset-bottom');
	});

	it('steht in Gelb — sie ist die offene Handlung, nicht eine Aufschrift', () => {
		expect(render(2, 1)).toContain('bg-gelb');
	});
});
