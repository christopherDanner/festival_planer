import { describe, expect, it, vi } from 'vitest';
import type jsPDF from 'jspdf';
import { POSTER_FONT } from '@/lib/pdfFonts';
import {
	POSTER_COLOR,
	POSTER_LINE,
	createPosterDoc,
	drawPosterFooter,
	drawPosterHead,
	drawRuler,
	drawSectionHeading,
	drawStamp,
	posterTableTheme,
	rulerFillFraction,
	truncateToWidth
} from '@/lib/pdfPoster';

interface Call {
	name: string;
	args: unknown[];
}

/**
 * Zeichnet nicht wirklich, sondern schreibt jeden Strich mit — die Bausteine
 * werden über ihre Absicht geprüft, nicht über gerasterte Pixel.
 */
function recordStrokes(doc: jsPDF): Call[] {
	const calls: Call[] = [];
	const recorded = [
		'rect',
		'circle',
		'line',
		'lines',
		'text',
		'setFillColor',
		'setDrawColor',
		'setTextColor',
		'setLineWidth',
		'setFont',
		'setFontSize',
		'setCharSpace',
		'setPage'
	] as const;
	for (const name of recorded) {
		vi.spyOn(doc as unknown as Record<string, () => unknown>, name).mockImplementation(
			(...args: unknown[]) => {
				calls.push({ name, args });
				return doc;
			}
		);
	}
	return calls;
}

const of = (calls: Call[], name: string) => calls.filter((call) => call.name === name);
const argsOf = (calls: Call[], name: string) => of(calls, name).map((call) => call.args);

describe('createPosterDoc', () => {
	it('liefert ein Dokument mit angemeldeten Plakat-Schriften und Tinte als Textfarbe', () => {
		const doc = createPosterDoc({ orientation: 'landscape' });

		expect(doc.getFontList()[POSTER_FONT.body]).toEqual(expect.arrayContaining(['normal', 'bold']));
		expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
	});
});

describe('drawPosterHead', () => {
	it('druckt einen grünen Halftone-Kopf mit hartem Tinte-Rahmen und Oswald-Titel', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		const bottom = drawPosterHead(doc, { title: 'Stadlfest 2026', subtitle: 'Schichtplan' });

		expect(argsOf(calls, 'setFillColor')).toContainEqual([...POSTER_COLOR.gruen]);
		expect(argsOf(calls, 'rect').some((args) => args[4] === 'F')).toBe(true);
		// Halftone: weiße Punkte 12 % Deckung, auf Grün vorgemischt.
		expect(of(calls, 'circle').length).toBeGreaterThan(20);
		expect(argsOf(calls, 'setFillColor')).toContainEqual([...POSTER_COLOR.halftone]);
		// Harter Rahmen: 2.5px Tinte.
		expect(argsOf(calls, 'setDrawColor')).toContainEqual([...POSTER_COLOR.tinte]);
		expect(argsOf(calls, 'setLineWidth')).toContainEqual([POSTER_LINE.container]);
		expect(argsOf(calls, 'rect').some((args) => args[4] === 'S')).toBe(true);
		// Titel in Versalien, Akzentschrift.
		expect(argsOf(calls, 'setFont')).toContainEqual([POSTER_FONT.accent, 'normal']);
		expect(argsOf(calls, 'text').some((args) => args[0] === 'STADLFEST 2026')).toBe(true);
		expect(argsOf(calls, 'text').some((args) => args[0] === 'SCHICHTPLAN')).toBe(true);
		expect(bottom).toBeGreaterThan(0);
	});

	it('setzt die rechte Randnotiz in Gelb auf das Grün', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		drawPosterHead(doc, { title: 'Stadlfest 2026', note: '05.08.2026' });

		expect(argsOf(calls, 'setTextColor')).toContainEqual([...POSTER_COLOR.gelb]);
		expect(argsOf(calls, 'text').some((args) => args[0] === '05.08.2026')).toBe(true);
	});
});

describe('rulerFillFraction', () => {
	it('rechnet den Ist-Anteil am Soll', () => {
		expect(rulerFillFraction(3, 4)).toBeCloseTo(0.75);
		expect(rulerFillFraction(0, 4)).toBe(0);
	});

	it('deckelt bei voll besetzt und behandelt ein Soll von 0 als voll', () => {
		expect(rulerFillFraction(7, 4)).toBe(1);
		expect(rulerFillFraction(0, 0)).toBe(1);
		expect(rulerFillFraction(-1, 4)).toBe(0);
	});
});

describe('drawRuler', () => {
	it('füllt das Maßband anteilig in Gelb und zieht die Ist-Marke in Tinte', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		drawRuler(doc, { x: 10, y: 20, width: 40, value: 1, max: 4 });

		const yellowRect = argsOf(calls, 'rect').find(
			(args) => args[4] === 'F' && args[2] === 40 * 0.25
		);
		expect(yellowRect).toBeDefined();
		expect(argsOf(calls, 'setFillColor')).toContainEqual([...POSTER_COLOR.gelbFill]);
		// Zehntel-Striche der Skala plus Ist-Marke.
		expect(of(calls, 'line').length).toBeGreaterThan(9);
		expect(argsOf(calls, 'setLineWidth')).toContainEqual([POSTER_LINE.container]);
	});

	it('lässt die Füllung bei einem Soll von 0 weg statt durchs Papier zu laufen', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		drawRuler(doc, { x: 10, y: 20, width: 40, value: 0, max: 0 });

		expect(argsOf(calls, 'rect').every((args) => (args[2] as number) <= 40)).toBe(true);
	});
});

describe('drawStamp', () => {
	it('stempelt Versalien schräg in einen Rahmen', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		drawStamp(doc, { x: 20, y: 30, label: 'Voll besetzt', tone: 'gruen' });

		const [text] = argsOf(calls, 'text');
		expect(text[0]).toBe('VOLL BESETZT');
		expect(text[3]).toMatchObject({ angle: expect.any(Number) });
		expect((text[3] as { angle: number }).angle).not.toBe(0);
		// Rahmen als gedrehtes Viereck, nicht als achsenparalleles rect.
		expect(of(calls, 'lines')).toHaveLength(1);
		expect(argsOf(calls, 'setDrawColor')).toContainEqual([...POSTER_COLOR.gruen]);
	});

	it('liest x als rechte Kante, wenn rechts angeschlagen wird', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		drawStamp(doc, { x: 100, y: 30, label: 'Voll besetzt', align: 'right' });

		// Der Rahmen beginnt links von der Anschlagkante und endet auf ihr.
		const [start] = of(calls, 'lines')[0].args.slice(1) as number[];
		expect(start).toBeLessThan(100);
		const spans = argsOf(calls, 'lines')[0][0] as [number, number][];
		const widest = Math.max(...spans.map(([dx]) => Math.abs(dx)));
		expect(start + widest).toBeCloseTo(100, 0);
	});

	it('nimmt Rot für den Fehlt-Stempel', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		drawStamp(doc, { x: 20, y: 30, label: '3 fehlen', tone: 'rot' });

		expect(argsOf(calls, 'setDrawColor')).toContainEqual([...POSTER_COLOR.rot]);
		expect(argsOf(calls, 'text')[0][0]).toBe('3 FEHLEN');
	});
});

describe('drawSectionHeading', () => {
	it('setzt die Zwischenzeile in Versalien über eine Punktraster-Linie', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const calls = recordStrokes(doc);

		const bottom = drawSectionHeading(doc, { x: 12, y: 40, width: 100, label: 'Aufbau' });

		expect(argsOf(calls, 'text')[0][0]).toBe('AUFBAU');
		expect(argsOf(calls, 'setFont')).toContainEqual([POSTER_FONT.body, 'bold']);
		expect(argsOf(calls, 'setCharSpace').length).toBeGreaterThan(0);
		expect(of(calls, 'circle').length).toBeGreaterThan(3);
		expect(bottom).toBeGreaterThan(40);
	});
});

describe('truncateToWidth', () => {
	it('lässt Text, der passt, unangetastet', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		expect(truncateToWidth(doc, 'AUSSCHANK', 100)).toBe('AUSSCHANK');
	});

	it('kürzt mit Auslassungszeichen, bis der Text in die Breite passt', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		const long = 'AUSSCHANK BIERZELT HINTEN BEIM STADL';

		const cut = truncateToWidth(doc, long, 20);

		expect(cut).not.toBe(long);
		expect(cut.endsWith('…')).toBe(true);
		expect(doc.getTextWidth(cut)).toBeLessThanOrEqual(20);
	});
});

describe('posterTableTheme', () => {
	it('bedruckt Tabellen mit den eingebetteten Schriften, Tinte-Gitter und grünem Kopf', () => {
		const theme = posterTableTheme();

		expect(theme.styles?.font).toBe(POSTER_FONT.body);
		expect(theme.styles?.lineColor).toEqual([...POSTER_COLOR.tinte]);
		expect(theme.headStyles?.font).toBe(POSTER_FONT.body);
		expect(theme.headStyles?.fillColor).toEqual([...POSTER_COLOR.gruen]);
		expect(theme.headStyles?.textColor).toEqual([...POSTER_COLOR.weiss]);
		expect(theme.theme).toBe('grid');
	});

	it('nimmt eine Zellengröße an und hält den Kopf eine halbe Stufe größer', () => {
		const theme = posterTableTheme({ fontSize: 7.5 });

		expect(theme.styles?.fontSize).toBe(7.5);
		expect(theme.headStyles?.fontSize).toBe(8);
	});
});

describe('drawPosterFooter', () => {
	it('setzt auf jede Seite die getönte Fußzeile mit Seitenzähler', () => {
		const doc = createPosterDoc({ orientation: 'portrait' });
		doc.addPage();
		const calls = recordStrokes(doc);

		drawPosterFooter(doc, 'Stadlfest 2026 — Einsatzplan');

		const printed = argsOf(calls, 'text').map((args) => args[0]);
		expect(printed).toContain('Stadlfest 2026 — Einsatzplan — Seite 1/2');
		expect(printed).toContain('Stadlfest 2026 — Einsatzplan — Seite 2/2');
		expect(argsOf(calls, 'setFillColor')).toContainEqual([...POSTER_COLOR.fusszeile]);
		expect(of(calls, 'setPage')).toHaveLength(2);
	});
});
