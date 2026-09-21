import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RowEditBulkBar from './RowEditBulkBar';

const noop = () => {};

const render = (open: number, dirty: number) =>
	renderToStaticMarkup(
		<RowEditBulkBar open={open} dirty={dirty} onSaveAll={noop} onCancelAll={noop} />
	);

/** Der sichtbare Text ohne Markup — die Leiste setzt Zahlen und Wörter aus
mehreren Elementen zusammen. */
function text(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

describe('RowEditBulkBar — die Sammel-Fußleiste (#115)', () => {
	it('zählt offene und geänderte Zeilen', () => {
		expect(text(render(3, 2))).toContain('3 Zeilen offen, davon 2 geändert');
	});

	it('lässt „davon n geändert" weg, solange nichts geändert ist', () => {
		const html = render(3, 0);
		expect(text(html)).toContain('3 Zeilen offen');
		expect(text(html)).not.toContain('geändert');
	});

	it('spricht von einer Zeile im Singular', () => {
		expect(text(render(1, 1))).toContain('1 Zeile offen, davon 1 geändert');
	});

	it('bietet Verwerfen und Speichern an und nennt im Knopf, wie viele es trifft', () => {
		const html = render(3, 2);
		expect(text(html)).toContain('ALLE VERWERFEN');
		expect(text(html)).toContain('ALLE 3 SPEICHERN');
	});

	it('erklärt bei leerer Leiste, wie man eine Zeile öffnet', () => {
		const html = render(0, 0);
		expect(text(html)).toContain('Keine Zeile in Bearbeitung');
		expect(text(html)).toContain('Mehrere Zeilen gleichzeitig möglich');
		expect(text(html)).not.toContain('SPEICHERN');
	});

	it('klebt am unteren Rand — beim Nachtragen von 76 Positionen scrollt die Tabelle, nicht der Knopf', () => {
		expect(render(2, 1)).toContain('sticky');
	});
});
