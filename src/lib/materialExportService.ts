import * as XLSX from 'xlsx';
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { POSTER_FONT } from '@/lib/pdfFonts';
import {
	POSTER_COLOR,
	POSTER_MARGIN,
	createPosterDoc,
	drawPosterFooter,
	drawPosterHead,
	drawSectionHeading,
	drawStamp,
	posterTableEnd,
	posterTableTheme
} from '@/lib/pdfPoster';
import { consumedValue, orderedValue, withoutPrice } from '@/lib/materialCosts';
import { formatEuro } from '@/lib/money';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

/** Ein Papier der Materialliste — eine Gruppe der Achse oder die ganze Liste
(geplant in `materialExportPlan`). */
export interface MaterialListPaper {
	festivalName: string;
	/** Untertitel-Zusatz („Ausschank"); `null` = gesamte Liste. */
	label: string | null;
	/** Station als Spalte — entfällt, wo die Achse sie schon gesetzt hat (#113). */
	showStation: boolean;
	materials: FestivalMaterialWithStation[];
	/** Druckdatum; Standard jetzt. */
	date?: Date;
}

const PAPER_TITLE = 'Materialliste';

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

function buildFilename(paper: MaterialListPaper, suffix: string): string {
	const base = sanitizeFilename(paper.festivalName);
	if (paper.label) {
		return `${base}_${PAPER_TITLE}_${sanitizeFilename(paper.label)}.${suffix}`;
	}
	return `${base}_${PAPER_TITLE}.${suffix}`;
}

/** Untertitel des Papiers: „Materialliste" bzw. „Materialliste — Ausschank". */
function subtitle(paper: MaterialListPaper): string {
	return paper.label ? `${PAPER_TITLE} — ${paper.label}` : PAPER_TITLE;
}

const EXPLANATION_TEXT = (festivalName: string) =>
	`Diese Liste zeigt die bestellten und tatsächlich verbrauchten Mengen des Festes „${festivalName}". ` +
	`Bitte trag in der Spalte „Neue Menge" die gewünschte Bestellmenge für das kommende Fest ein ` +
	`und gib die ausgefüllte Liste an den Festverantwortlichen zurück. ` +
	`Materialien, die noch nicht auf der Liste stehen, aber gebraucht werden, ` +
	`teile bitte einfach dem Festverantwortlichen mit.`;

/** Greedy word wrap for plain text into lines no longer than maxChars. */
function wrapText(text: string, maxChars: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		if (!current) {
			current = word;
		} else if (current.length + 1 + word.length <= maxChars) {
			current += ' ' + word;
		} else {
			lines.push(current);
			current = word;
		}
	}
	if (current) lines.push(current);
	return lines;
}

/**
 * Spaltenköpfe des Papiers. Preise stehen bewusst nicht darauf: die
 * Materialliste ist laut `CONTEXT.md` die Planungsliste mit Mengen und einer
 * leeren „Neue Menge"-Spalte. Die Geldsummen trägt der Fuß.
 */
function columns(paper: MaterialListPaper): string[] {
	return [
		'Bezeichnung',
		'Lieferant',
		...(paper.showStation ? ['Station'] : []),
		'Einheit',
		'Gebinde',
		'Menge/Gebinde',
		'Bestellt',
		'Verbraucht',
		'Neue Menge'
	];
}

function rowCells(m: FestivalMaterialWithStation, paper: MaterialListPaper): string[] {
	return [
		m.name,
		m.supplier || '',
		...(paper.showStation ? [m.station?.name || ''] : []),
		m.unit,
		m.packaging_unit || '',
		m.amount_per_packaging != null ? String(m.amount_per_packaging) : '',
		String(m.ordered_quantity),
		m.actual_quantity != null ? String(m.actual_quantity) : '',
		'' // Neue Menge — bleibt leer, sie wird von Hand eingetragen
	];
}

/** Spaltenindizes, die je nach Station-Spalte verrutschen. */
function columnIndexes(paper: MaterialListPaper): { consumed: number; newQuantity: number } {
	const last = columns(paper).length - 1;
	return { consumed: last - 1, newQuantity: last };
}

// ── PDF ───────────────────────────────────────────────────────

/** Spaltenbreiten in mm; die Bezeichnung nimmt den Rest. */
function pdfColumnStyles(paper: MaterialListPaper): Record<number, Record<string, unknown>> {
	const right = { halign: 'right' as const };
	const cells: Record<string, unknown>[] = [
		{ cellWidth: 'auto', fontStyle: 'bold' }, // Bezeichnung
		{ cellWidth: 26 }, // Lieferant
		...(paper.showStation ? [{ cellWidth: 22 }] : []), // Station
		{ cellWidth: 16 }, // Einheit
		{ cellWidth: 18 }, // Gebinde
		{ cellWidth: 20, ...right }, // Menge/Gebinde
		{ cellWidth: 18, ...right }, // Bestellt
		{ cellWidth: 20, ...right }, // Verbraucht
		{ cellWidth: 22, ...right } // Neue Menge
	];
	return Object.fromEntries(cells.map((style, index) => [index, style]));
}

/**
 * Baut die Materialliste als Plakat (#119): Papier und Bausteine kommen aus
 * `pdfPoster` (#110, ADR 0012) — grüner Halftone-Kopf, Frachtbrief-Tabelle,
 * getönte Fußzeile. Gespeichert wird in {@link exportMaterialListPdf}.
 */
export function buildMaterialListPdf(paper: MaterialListPaper): jsPDF {
	const doc = createPosterDoc({ orientation: 'portrait' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const usableWidth = pageWidth - POSTER_MARGIN * 2;

	let y = drawPosterHead(doc, {
		title: paper.festivalName,
		subtitle: subtitle(paper),
		note: format(paper.date ?? new Date(), 'dd.MM.yyyy')
	});

	// Der Auftrag an den Leser steht über der Tabelle, nicht im Kleingedruckten.
	doc.setFont(POSTER_FONT.body, 'normal');
	doc.setFontSize(8.5);
	const soft = POSTER_COLOR.tinteSoft;
	doc.setTextColor(soft[0], soft[1], soft[2]);
	const explanation: string[] = doc.splitTextToSize(
		EXPLANATION_TEXT(paper.festivalName),
		usableWidth
	);
	doc.text(explanation, POSTER_MARGIN, y);
	y += explanation.length * 3.6 + 4;
	const ink = POSTER_COLOR.tinte;
	doc.setTextColor(ink[0], ink[1], ink[2]);

	const { consumed, newQuantity } = columnIndexes(paper);
	autoTable(doc, {
		...posterTableTheme({ fontSize: 8 }),
		startY: y,
		head: [columns(paper)],
		body: paper.materials.map((m) => rowCells(m, paper)),
		columnStyles: pdfColumnStyles(paper),
		tableWidth: usableWidth,
		didParseCell: (data) => {
			if (data.section !== 'body') return;
			// Verbraucht ist die nachgetragene Zahl — getönt wie eine Wertmarke.
			if (data.column.index === consumed && data.cell.raw) {
				data.cell.styles.fillColor = [...POSTER_COLOR.papierGetoent];
				data.cell.styles.fontStyle = 'bold';
			}
			// „Neue Menge" ist der freie Platz zum Eintragen — gelb wie die Auswahl.
			if (data.column.index === newQuantity) {
				data.cell.styles.fillColor = [...POSTER_COLOR.gelbFill];
			}
		}
	});

	const count = paper.materials.length;
	y = drawSectionHeading(doc, {
		x: POSTER_MARGIN,
		y: posterTableEnd(doc) + 8,
		width: usableWidth,
		label: 'Summen',
		note: `${count} ${count === 1 ? 'Position' : 'Positionen'}`
	});

	// Beträge aus dem gemeinsamen Rechenmodul (#111, ADR 0006) — sonst laufen
	// Bildschirm und Papier auseinander.
	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(10);
	doc.text(
		`Bestellt ${formatEuro(orderedValue(paper.materials))}   ·   Verbraucht ${formatEuro(
			consumedValue(paper.materials)
		)}`,
		POSTER_MARGIN,
		y + 4
	);

	const gaps = withoutPrice(paper.materials);
	if (gaps > 0) {
		drawStamp(doc, {
			x: pageWidth - POSTER_MARGIN,
			y: y + 0.5,
			label: `${gaps} ohne Preis`,
			tone: 'rot',
			align: 'right'
		});
	}

	drawPosterFooter(doc, `${paper.festivalName} — ${subtitle(paper)}`);
	return doc;
}

/** Exportiert ein Papier der Materialliste als PDF. */
export function exportMaterialListPdf(paper: MaterialListPaper): void {
	buildMaterialListPdf(paper).save(buildFilename(paper, 'pdf'));
}

// ── Excel ─────────────────────────────────────────────────────

type Merge = { s: { r: number; c: number }; e: { r: number; c: number } };

/** Spaltenbreiten der Tabelle in Zeichen — auch das Maß, an dem der Erklärtext
umbricht (die freie xlsx-Ausgabe kennt keinen Zellumbruch). */
function excelCols(paper: MaterialListPaper): { wch: number }[] {
	return [
		{ wch: 28 }, // Bezeichnung
		{ wch: 20 }, // Lieferant
		...(paper.showStation ? [{ wch: 18 }] : []), // Station
		{ wch: 10 }, // Einheit
		{ wch: 14 }, // Gebinde
		{ wch: 14 }, // Menge/Gebinde
		{ wch: 10 }, // Bestellt
		{ wch: 12 }, // Verbraucht
		{ wch: 14 } // Neue Menge
	];
}

/** Exportiert ein Papier der Materialliste als Excel-Datei. Dieselben Spalten
und dieselben Summen wie das PDF — nur ohne Plakat, weil eine Tabelle zum
Weiterrechnen gedacht ist. */
export function exportMaterialListExcel(paper: MaterialListPaper): void {
	const cols = excelCols(paper);
	const header = columns(paper);
	const maxCharsPerLine = Math.floor(cols.reduce((sum, c) => sum + c.wch, 0) * 0.95);

	const rows: (string | number | null)[][] = [];
	rows.push([paper.festivalName]);
	rows.push([subtitle(paper)]);
	rows.push([]);

	const explanationStart = rows.length;
	for (const line of wrapText(EXPLANATION_TEXT(paper.festivalName), maxCharsPerLine)) {
		rows.push([line]);
	}
	const explanationEnd = rows.length - 1;

	rows.push([]);
	rows.push(header);
	for (const m of paper.materials) rows.push(rowCells(m, paper));

	rows.push([]);
	rows.push([`${paper.materials.length} Positionen`]);
	rows.push([
		`Bestellt ${formatEuro(orderedValue(paper.materials))} · Verbraucht ${formatEuro(
			consumedValue(paper.materials)
		)}`
	]);
	const gaps = withoutPrice(paper.materials);
	if (gaps > 0) rows.push([`${gaps} ohne Preis`]);

	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!cols'] = cols;

	const lastCol = header.length - 1;
	const merges: Merge[] = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
	];
	for (let r = explanationStart; r <= explanationEnd; r++) {
		merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } });
	}
	ws['!merges'] = merges;

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, PAPER_TITLE);
	XLSX.writeFile(wb, buildFilename(paper, 'xlsx'));
}
