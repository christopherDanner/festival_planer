import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PaperSheet, PaperSheetField, PaperSheetFields } from './PaperSheet';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `PaperSheet` ist der *Rahmen* eines Dialog-Papiers — Papier-Grund, 3px-Tinte-
   Rahmen, Versatz-Schatten, grüner Halftone-Kopf mit Akzentschrift-Titel,
   gelber Kopf-Knopf, klebende Fußleiste. `PaperSheetFields` ist sein Feldraster,
   `PaperSheetField` eine Feldzeile mit Versalien-Kleinlabel. Keiner trägt
   Inhalt oder kennt einen Radix-Dialog: der Rahmen wurde in #117 am
   Positions-Dialog festgelegt und liegt jetzt an *einer* Stelle, damit die
   Export-Dialoge (#119) dasselbe Papier bedrucken. */

const render = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe('PaperSheet — Plakat-Rahmen der Dialoge', () => {
	it('ist ein Zettel: Papier-Grund, 3px-Tinte-Rahmen, Versatz-Schatten', () => {
		const html = render(<PaperSheet title="Materialliste exportieren">Inhalt</PaperSheet>);
		expect(html).toContain('bg-papier');
		expect(html).toContain('border-3');
		expect(html).toContain('border-tinte');
		expect(html).toContain('shadow-versatz');
	});

	it('trägt einen grünen Halftone-Kopf mit Titel in der Akzentschrift', () => {
		const html = render(<PaperSheet title="Materialliste exportieren">Inhalt</PaperSheet>);
		// `poster` ist das Halftone-Rezept des Toolkits (ADR 0003).
		expect(html).toContain('poster');
		expect(html).toContain('font-display');
		expect(html).toContain('Materialliste exportieren');
	});

	it('reicht den Titel-Baustein des Dialogs durch', () => {
		const html = render(
			<PaperSheet title="Titel" TitleTag={(props) => <h1 {...props} />}>
				Inhalt
			</PaperSheet>
		);
		expect(html).toContain('<h1');
	});

	it('setzt den Kopf-Knopf nur, wo es einen Rückweg gibt', () => {
		expect(render(<PaperSheet title="T">Inhalt</PaperSheet>)).not.toContain('Schließen');
		const html = render(
			<PaperSheet title="T" onClose={() => {}}>
				Inhalt
			</PaperSheet>
		);
		expect(html).toContain('Schließen');
		expect(html).toContain('bg-gelb');
	});

	it('klebt die Fußleiste unten, wo eine übergeben wird', () => {
		expect(render(<PaperSheet title="T">Inhalt</PaperSheet>)).not.toContain('sticky bottom-0');
		expect(
			render(
				<PaperSheet title="T" footer={<button>OK</button>}>
					Inhalt
				</PaperSheet>
			)
		).toContain('sticky bottom-0');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(
			render(
				<PaperSheet title="T" onClose={() => {}} footer={<span>Fuß</span>}>
					Inhalt
				</PaperSheet>
			)
		).not.toContain('rounded');
	});
});

describe('PaperSheetFields / PaperSheetField', () => {
	it('stellt die Felder ab 900px zweispaltig', () => {
		expect(render(<PaperSheetFields>x</PaperSheetFields>)).toContain('min-[900px]:grid-cols-2');
	});

	it('beschriftet als Versalien-Kleinlabel (800, .06em)', () => {
		const html = render(
			<PaperSheetField label="Was exportieren?" htmlFor="feld">
				<input id="feld" />
			</PaperSheetField>
		);
		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
		expect(html).toContain('for="feld"');
	});

	it('legt ein breites Feld über beide Spalten des Rasters', () => {
		expect(render(<PaperSheetField label="L">x</PaperSheetField>)).not.toContain('col-span-2');
		expect(render(<PaperSheetField label="L" wide>x</PaperSheetField>)).toContain(
			'min-[900px]:col-span-2'
		);
	});

	it('trägt den Hinweis unter dem Baustein, wenn es einen gibt', () => {
		expect(render(<PaperSheetField label="L">x</PaperSheetField>)).not.toContain(
			'Erst mit Gebinde'
		);
		expect(
			render(
				<PaperSheetField label="L" hint="Erst mit Gebinde">
					x
				</PaperSheetField>
			)
		).toContain('Erst mit Gebinde');
	});
});
