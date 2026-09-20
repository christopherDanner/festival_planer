import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POSTER_FONT } from '@/lib/pdfFonts';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `buildMaterialListPdf` und `buildOrderList*Pdf` sind die *Papiere* des
   Material-Bereichs. Sie bauen auf den Zeichen-Bausteinen aus #110 auf
   (ADR 0012: „Ein neues druckbares Papier baut auf pdfPoster.ts auf und bringt
   keine eigene Grafik mit") und rechnen nicht selbst — die Beträge kommen aus
   `materialCosts` (ADR 0006).

   Geprüft wird über die Zeichenaufrufe und die gesetzten Schriften, nicht über
   Rasterbilder — dieselbe Regel wie in `posterExports.test.ts`. */

const recorder = vi.hoisted(() => ({ printed: [] as { text: string; font: string }[] }));

vi.mock('@/lib/pdfPoster', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/pdfPoster')>();
	return {
		...actual,
		createPosterDoc: vi.fn((options: Parameters<typeof actual.createPosterDoc>[0]) => {
			const doc = actual.createPosterDoc(options);
			const print = doc.text.bind(doc);
			doc.text = ((...args: Parameters<typeof doc.text>) => {
				const font = (doc as unknown as { getFont(): { fontName: string } }).getFont().fontName;
				for (const line of Array.isArray(args[0]) ? args[0] : [args[0]]) {
					recorder.printed.push({ text: String(line), font });
				}
				return print(...args);
			}) as typeof doc.text;
			return doc;
		}),
		drawPosterHead: vi.fn(actual.drawPosterHead),
		drawPosterFooter: vi.fn(actual.drawPosterFooter),
		drawSectionHeading: vi.fn(actual.drawSectionHeading),
		drawStamp: vi.fn(actual.drawStamp)
	};
});

import * as poster from '@/lib/pdfPoster';
import {
	buildMaterialListPdf,
	buildMaterialListSheet,
	type MaterialListPaper
} from '@/lib/materialExportService';
import {
	buildOrderListCollectionPdf,
	buildOrderListSinglePdf
} from '@/lib/orderListExportService';
import { buildOrderList } from '@/lib/orderList';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

const POSTER_FONTS = [POSTER_FONT.body, POSTER_FONT.accent];
const DATE = new Date('2026-08-06T10:00:00Z');

function printed(): string[] {
	return recorder.printed.map((p) => p.text);
}

function fonts(): string[] {
	return [...new Set(recorder.printed.map((p) => p.font))].sort();
}

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'm-1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Stück',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 1,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		station: null,
		...over
	};
}

/** 10 € netto + 20 % = 12 € brutto; 5 bestellt → 60 €, 3 verbraucht → 36 €. */
const BIER = material({
	name: 'Bier',
	supplier: 'Brauerei Öhler',
	station_id: 's1',
	station: { id: 's1', name: 'Ausschank' },
	ordered_quantity: 5,
	actual_quantity: 3,
	unit_price: 10,
	tax_rate: 20
});

/** Ohne Preis — die Preislücke des Papiers. */
const ZELT = material({ id: 'm-2', name: 'Zelt', ordered_quantity: 1 });

function paper(over: Partial<MaterialListPaper> = {}): MaterialListPaper {
	return {
		festivalName: 'Stadlfest 2026',
		label: null,
		showStation: true,
		materials: [BIER, ZELT],
		date: DATE,
		...over
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	recorder.printed.length = 0;
});

describe('buildMaterialListPdf — Materialliste in Plakat-Optik', () => {
	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		buildMaterialListPdf(paper());

		expect(printed().length).toBeGreaterThan(0);
		expect(fonts()).toEqual([...POSTER_FONTS].sort());
	});

	it('trägt Plakat-Kopf mit Druckdatum und die getönte Fußzeile mit Seitenzähler', () => {
		buildMaterialListPdf(paper());

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				title: 'Stadlfest 2026',
				subtitle: 'Materialliste',
				note: '06.08.2026'
			})
		);
		expect(poster.drawPosterFooter).toHaveBeenCalled();
		expect(printed()).toContain('Stadlfest 2026 — Materialliste — Seite 1/1');
	});

	it('nennt die Gruppe im Untertitel, wenn das Papier eine Gruppe zeigt', () => {
		buildMaterialListPdf(paper({ label: 'Ausschank' }));

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ subtitle: 'Materialliste — Ausschank' })
		);
	});

	it('zeigt die Station als Spalte nur, wo die Achse sie nicht schon gesetzt hat', () => {
		buildMaterialListPdf(paper({ showStation: true }));
		expect(printed()).toContain('Station');

		vi.clearAllMocks();
		recorder.printed.length = 0;
		buildMaterialListPdf(paper({ showStation: false, label: 'Ausschank' }));
		expect(printed()).not.toContain('Station');
	});

	it('lässt die Spalte „Neue Menge" leer — sie wird von Hand eingetragen', () => {
		buildMaterialListPdf(paper());

		expect(printed()).toContain('Neue Menge');
		// Bestellt und Verbraucht stehen als Zahl da, die neue Menge nicht.
		expect(printed()).toContain('5');
		expect(printed()).toContain('3');
	});

	it('trägt Bestellwert und Verbrauchswert aus dem gemeinsamen Rechenmodul', () => {
		buildMaterialListPdf(paper());

		expect(poster.drawSectionHeading).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: 'Summen', note: '2 Positionen' })
		);
		expect(printed()).toContain('Bestellt € 60   ·   Verbraucht € 36');
	});

	it('stempelt die Preislücke, und nur wenn es eine gibt', () => {
		buildMaterialListPdf(paper());
		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: '1 ohne Preis', tone: 'rot' })
		);

		vi.clearAllMocks();
		recorder.printed.length = 0;
		buildMaterialListPdf(paper({ materials: [BIER] }));
		expect(poster.drawStamp).not.toHaveBeenCalled();
	});

	it('bleibt auch ohne Positionen ein Papier', () => {
		buildMaterialListPdf(paper({ materials: [] }));

		expect(printed()).toContain('Bestellt € 0   ·   Verbraucht € 0');
	});

	it('hält den Summenblock über der Fußzeile, egal wo die Tabelle endet', () => {
		// A4 ist 297mm hoch; die getönte Fußzeile liegt in den letzten 10mm, der
		// Summenblock braucht 18mm. Bei irgendeiner dieser Zeilenzahlen endet die
		// Tabelle knapp über dem Blattende — dann muss der Block umbrechen.
		const OBERKANTE_FUSSZEILE = 297 - 10 - 18;
		const oberkanten: number[] = [];

		for (const count of [1, 30, 33, 36, 39, 42, 45, 60, 200]) {
			vi.clearAllMocks();
			recorder.printed.length = 0;
			const materials = Array.from({ length: count }, (_, i) =>
				material({ id: `m-${i}`, name: `Position ${i}`, ordered_quantity: 1 })
			);

			buildMaterialListPdf(paper({ materials }));

			const summenY = vi.mocked(poster.drawSectionHeading).mock.calls.at(-1)?.[1].y ?? Infinity;
			expect(summenY).toBeLessThanOrEqual(OBERKANTE_FUSSZEILE);
			oberkanten.push(summenY);
		}

		// Ohne diese zwei Zeilen könnte der Umbruch nie greifen und der Test
		// trotzdem grün sein: einmal steht der Block direkt unter der Tabelle,
		// einmal oben auf einem neuen Blatt.
		expect(Math.max(...oberkanten)).toBeGreaterThan(100);
		expect(Math.min(...oberkanten)).toBeLessThan(40);
	});
});

describe('buildMaterialListSheet — Excel-Zeilen der Materialliste', () => {
	it('lässt die Mengen Zahlen bleiben — die Datei ist zum Weiterrechnen gedacht', () => {
		const { rows } = buildMaterialListSheet(paper({ materials: [BIER] }));
		const bierRow = rows.find((r) => r[0] === 'Bier');

		// Bestellt und Verbraucht als Zahl, nicht als Text.
		expect(bierRow).toContain(5);
		expect(bierRow).toContain(3);
		expect(bierRow).not.toContain('5');
		expect(bierRow).not.toContain('3');
	});

	it('trägt Kopf, Erklärtext und dieselben Summen wie das Papier', () => {
		const { rows, cols, merges } = buildMaterialListSheet(paper());
		const flat = rows.map((r) => r.join(' | '));

		expect(flat[0]).toBe('Stadlfest 2026');
		expect(flat[1]).toBe('Materialliste');
		expect(flat.join('\n')).toContain('Neue Menge');
		expect(flat).toContain('Bestellt € 60 · Verbraucht € 36');
		expect(flat).toContain('1 ohne Preis');
		// Titel und Erklärzeilen laufen über die ganze Tabellenbreite.
		expect(cols).toHaveLength(9);
		expect(merges[0]).toEqual({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
	});

	it('lässt die Station-Spalte weg, wo die Achse sie schon gesetzt hat', () => {
		const { rows, cols } = buildMaterialListSheet(
			paper({ showStation: false, label: 'Station: Ausschank' })
		);

		expect(cols).toHaveLength(8);
		expect(rows.some((r) => r.includes('Station'))).toBe(false);
	});
});

describe('buildOrderList*Pdf — Bestellliste in Plakat-Optik', () => {
	const materials = [
		BIER,
		material({ id: 'm-3', name: 'Kohle', supplier: 'Metro', ordered_quantity: 2, unit_price: 5 }),
		// Bestellmenge 0 — steht auf keiner Bestellliste (CONTEXT.md).
		material({ id: 'm-4', name: 'Wein', supplier: 'Brauerei Öhler', ordered_quantity: 0 })
	];
	const meta = { festivalName: 'Stadlfest 2026', axis: 'supplier' as const, date: DATE };

	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		const [group] = buildOrderList(materials, 'supplier');
		buildOrderListSinglePdf(group, meta);

		expect(printed().length).toBeGreaterThan(0);
		expect(fonts()).toEqual([...POSTER_FONTS].sort());
	});

	it('trägt Plakat-Kopf, Gruppen-Sektionszeile und Fußzeile mit Seitenzähler', () => {
		const [group] = buildOrderList(materials, 'supplier');
		buildOrderListSinglePdf(group, meta);

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ subtitle: 'Bestellliste', note: '06.08.2026' })
		);
		expect(poster.drawSectionHeading).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: 'Lieferant: Brauerei Öhler', note: '06.08.2026' })
		);
		expect(printed()).toContain('Stadlfest 2026 — Bestellliste — Seite 1/1');
		// Umlaute aus dem Latin-Subset landen unverstümmelt auf dem Papier.
		expect(printed()).toContain('Bier');
	});

	it('stempelt Positionszahl und Bestellwert der Gruppe', () => {
		const [group] = buildOrderList(materials, 'supplier');
		buildOrderListSinglePdf(group, meta);

		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: '1 Position' })
		);
		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: 'Bestellwert € 60', tone: 'gruen' })
		);
	});

	it('warnt am Bestellwert, wenn Positionen ohne Preis darin fehlen', () => {
		const groups = buildOrderList([material({ name: 'Kohle', ordered_quantity: 2 })], 'supplier');
		buildOrderListSinglePdf(groups[0], meta);

		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: 'Bestellwert € 0', tone: 'rot' })
		);
		expect(printed().join(' ')).toContain('ohne Preis');
	});

	it('gibt dem Sammeldokument eine Seite je Bestellung', () => {
		const groups = buildOrderList(materials, 'supplier');
		const doc = buildOrderListCollectionPdf(groups, meta);

		expect(groups).toHaveLength(2);
		// `getNumberOfPages` fehlt in den mitgelieferten jsPDF-Typen, existiert
		// aber zur Laufzeit — dieselbe Ausnahme wie in `pdfPoster`.
		expect((doc as typeof doc & { getNumberOfPages(): number }).getNumberOfPages()).toBe(2);
		expect(printed()).toContain('Stadlfest 2026 — Bestellliste — Seite 2/2');
	});
});
