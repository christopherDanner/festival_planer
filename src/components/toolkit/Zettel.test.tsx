import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { Zettel, ZettelField } from './Zettel';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `Zettel` ist der *Rahmen* eines Dialog-Papiers — Papier-Grund, 3px-Tinte-
   Rahmen, Versatz-Schatten, grüner Halftone-Kopf mit Akzentschrift-Titel,
   gelber Kopf-Knopf, klebende Fußleiste. `ZettelField` ist eine Feldzeile mit
   Versalien-Kleinlabel. Beide tragen keinen Inhalt und kennen keinen Radix-
   Dialog: der Rahmen wurde in #117 am Positions-Dialog festgelegt und liegt
   jetzt an *einer* Stelle, damit die Export-Dialoge (#119) dasselbe Papier
   bedrucken. */

const render = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe('Zettel — Plakat-Rahmen der Dialoge', () => {
	it('ist ein Zettel: Papier-Grund, 3px-Tinte-Rahmen, Versatz-Schatten', () => {
		const html = render(<Zettel title="Materialliste exportieren">Inhalt</Zettel>);
		expect(html).toContain('bg-papier');
		expect(html).toContain('border-3');
		expect(html).toContain('border-tinte');
		expect(html).toContain('shadow-versatz');
	});

	it('trägt einen grünen Halftone-Kopf mit Titel in der Akzentschrift', () => {
		const html = render(<Zettel title="Materialliste exportieren">Inhalt</Zettel>);
		// `poster` ist das Halftone-Rezept des Toolkits (ADR 0003).
		expect(html).toContain('poster');
		expect(html).toContain('font-display');
		expect(html).toContain('Materialliste exportieren');
	});

	it('reicht den Titel-Baustein des Dialogs durch', () => {
		const html = render(
			<Zettel title="Titel" TitleTag={(props) => <h1 {...props} />}>
				Inhalt
			</Zettel>
		);
		expect(html).toContain('<h1');
	});

	it('setzt den Kopf-Knopf nur, wo es einen Rückweg gibt', () => {
		expect(render(<Zettel title="T">Inhalt</Zettel>)).not.toContain('Schließen');
		const html = render(
			<Zettel title="T" onClose={() => {}}>
				Inhalt
			</Zettel>
		);
		expect(html).toContain('Schließen');
		expect(html).toContain('bg-gelb');
	});

	it('klebt die Fußleiste unten, wo eine übergeben wird', () => {
		expect(render(<Zettel title="T">Inhalt</Zettel>)).not.toContain('sticky bottom-0');
		expect(render(<Zettel title="T" footer={<button>OK</button>}>Inhalt</Zettel>)).toContain(
			'sticky bottom-0'
		);
	});

	it('bleibt ohne runde Ecken', () => {
		expect(
			render(
				<Zettel title="T" onClose={() => {}} footer={<span>Fuß</span>}>
					Inhalt
				</Zettel>
			)
		).not.toContain('rounded');
	});
});

describe('ZettelField — Feldzeile mit Versalien-Kleinlabel', () => {
	it('beschriftet als Versalien-Kleinlabel (800, .06em)', () => {
		const html = render(
			<ZettelField label="Was exportieren?" htmlFor="feld">
				<input id="feld" />
			</ZettelField>
		);
		expect(html).toContain('font-extrabold');
		expect(html).toContain('tracking-[.06em]');
		expect(html).toContain('for="feld"');
	});

	it('trägt den Hinweis unter dem Baustein, wenn es einen gibt', () => {
		expect(render(<ZettelField label="L">x</ZettelField>)).not.toContain('Erst mit Gebinde');
		expect(
			render(
				<ZettelField label="L" hint="Erst mit Gebinde">
					x
				</ZettelField>
			)
		).toContain('Erst mit Gebinde');
	});
});
