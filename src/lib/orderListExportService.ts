import * as XLSX from 'xlsx';
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { POSTER_FONT } from '@/lib/pdfFonts';
import {
	POSTER_MARGIN,
	createPosterDoc,
	drawPosterFooter,
	drawPosterHead,
	drawSectionHeading,
	drawStamp,
	posterTableEnd,
	posterTableTheme
} from '@/lib/pdfPoster';
import { formatEuro } from '@/lib/money';
import {
	axisLabel,
	buildOrderListFilename,
	orderListColumns,
	orderListRowCells,
	type OrderListAxis,
	type OrderListGroup
} from '@/lib/orderList';

export interface OrderListMeta {
	festivalName: string;
	axis: OrderListAxis;
	/** Defaults to now. */
	date?: Date;
}

const PAPER_TITLE = 'Bestellliste';

function formatDate(date: Date): string {
	return format(date, 'dd.MM.yyyy');
}

/** PDF column widths (mm); Bezeichnung takes the remaining width ('auto'). */
function pdfColumnStyles(axis: OrderListAxis): Record<number, { cellWidth: number | 'auto' }> {
	return axis === 'station'
		? {
			0: { cellWidth: 'auto' }, // Bezeichnung
			1: { cellWidth: 38 },     // Lieferant
			2: { cellWidth: 60 },     // Menge (inkl. Einheit und Gebinde)
		}
		: {
			0: { cellWidth: 'auto' }, // Bezeichnung
			1: { cellWidth: 70 },     // Menge (inkl. Einheit und Gebinde)
		};
}

// ── PDF ───────────────────────────────────────────────────────

/**
 * Zeichnet eine Bestellung aufs laufende Blatt: Sektionszeile mit Gruppe und
 * Datum, Frachtbrief-Tabelle, darunter Positionszahl und Bestellwert.
 *
 * Die Bausteine kommen aus `pdfPoster` (#110, ADR 0012) — dieses Papier bringt
 * keine eigene Grafik mit.
 */
function drawSection(doc: jsPDF, group: OrderListGroup, meta: OrderListMeta, y: number): void {
	const pageWidth = doc.internal.pageSize.getWidth();
	const usableWidth = pageWidth - POSTER_MARGIN * 2;

	let top = drawSectionHeading(doc, {
		x: POSTER_MARGIN,
		y,
		width: usableWidth,
		label: `${axisLabel(meta.axis)}: ${group.name}`,
		note: formatDate(meta.date ?? new Date())
	});
	top += 2;

	autoTable(doc, {
		...posterTableTheme({ fontSize: 9 }),
		startY: top,
		head: [orderListColumns(meta.axis)],
		body: group.rows.map((r) => orderListRowCells(r, meta.axis)),
		columnStyles: pdfColumnStyles(meta.axis)
	});

	const end = posterTableEnd(doc) + 6;
	const count = group.rows.length;
	drawStamp(doc, {
		x: POSTER_MARGIN,
		y: end,
		label: `${count} ${count === 1 ? 'Position' : 'Positionen'}`,
		tone: 'tinte'
	});

	// Bestellwert aus dem gemeinsamen Rechenmodul (#111, ADR 0006) — die Zeilen
	// selbst tragen keinen Preis, die Bestellung braucht trotzdem ihre Summe.
	drawStamp(doc, {
		x: pageWidth - POSTER_MARGIN,
		y: end,
		label: `Bestellwert ${formatEuro(group.orderedValue)}`,
		tone: group.withoutPrice > 0 ? 'rot' : 'gruen',
		align: 'right'
	});

	if (group.withoutPrice > 0) {
		doc.setFont(POSTER_FONT.body, 'normal');
		doc.setFontSize(8);
		doc.text(
			`${group.withoutPrice} Position(en) ohne Preis — der Bestellwert ist unvollständig.`,
			POSTER_MARGIN,
			end + 9
		);
	}
}

/** Baut eine einzelne Bestellung als Plakat. */
export function buildOrderListSinglePdf(group: OrderListGroup, meta: OrderListMeta): jsPDF {
	const doc = createPosterDoc({ orientation: 'portrait' });
	const y = drawPosterHead(doc, {
		title: meta.festivalName,
		subtitle: PAPER_TITLE,
		note: formatDate(meta.date ?? new Date())
	});
	drawSection(doc, group, meta, y);
	drawPosterFooter(doc, `${meta.festivalName} — ${PAPER_TITLE}`);
	return doc;
}

/** Baut das Sammeldokument: eine Bestellung je Seite. */
export function buildOrderListCollectionPdf(
	groups: OrderListGroup[],
	meta: OrderListMeta
): jsPDF {
	const doc = createPosterDoc({ orientation: 'portrait' });
	groups.forEach((group, i) => {
		if (i > 0) doc.addPage();
		const y = drawPosterHead(doc, {
			title: meta.festivalName,
			subtitle: PAPER_TITLE,
			note: formatDate(meta.date ?? new Date())
		});
		drawSection(doc, group, meta, y);
	});
	drawPosterFooter(doc, `${meta.festivalName} — ${PAPER_TITLE}`);
	return doc;
}

export function exportOrderListSinglePdf(group: OrderListGroup, meta: OrderListMeta): void {
	buildOrderListSinglePdf(group, meta).save(
		buildOrderListFilename(meta.festivalName, 'pdf', meta.axis, group)
	);
}

export function exportOrderListCollectionPdf(groups: OrderListGroup[], meta: OrderListMeta): void {
	buildOrderListCollectionPdf(groups, meta).save(
		buildOrderListFilename(meta.festivalName, 'pdf', meta.axis, null)
	);
}

// ── Excel ─────────────────────────────────────────────────────

type Merge = { s: { r: number; c: number }; e: { r: number; c: number } };

/** Appends one group's block (titles + table + count + Bestellwert) to the row matrix; returns column merges added. */
function pushSectionRows(
	rows: (string | number)[][],
	group: OrderListGroup,
	meta: OrderListMeta
): Merge[] {
	const columns = orderListColumns(meta.axis);
	const lastCol = columns.length - 1;
	const merges: Merge[] = [];
	const titleRow = rows.length;
	rows.push([meta.festivalName]);
	rows.push([PAPER_TITLE]);
	const headerRow: (string | number)[] = new Array(columns.length).fill('');
	headerRow[0] = `${axisLabel(meta.axis)}: ${group.name}`;
	headerRow[lastCol] = formatDate(meta.date ?? new Date());
	rows.push(headerRow);
	merges.push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: lastCol } });
	merges.push({ s: { r: titleRow + 1, c: 0 }, e: { r: titleRow + 1, c: lastCol } });
	rows.push([]);
	rows.push(columns);
	for (const r of group.rows) rows.push(orderListRowCells(r, meta.axis));
	rows.push([`${group.rows.length} Positionen`]);
	rows.push([`Bestellwert ${formatEuro(group.orderedValue)}`]);
	if (group.withoutPrice > 0) rows.push([`${group.withoutPrice} ohne Preis`]);
	return merges;
}

function excelCols(axis: OrderListAxis): { wch: number }[] {
	return axis === 'station'
		? [{ wch: 36 }, { wch: 22 }, { wch: 34 }]
		: [{ wch: 40 }, { wch: 34 }];
}

export function exportOrderListSingleExcel(group: OrderListGroup, meta: OrderListMeta): void {
	const wb = XLSX.utils.book_new();
	const rows: (string | number)[][] = [];
	const merges = pushSectionRows(rows, group, meta);
	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!cols'] = excelCols(meta.axis);
	ws['!merges'] = merges;
	XLSX.utils.book_append_sheet(wb, ws, PAPER_TITLE);
	XLSX.writeFile(wb, buildOrderListFilename(meta.festivalName, 'xlsx', meta.axis, group));
}

export function exportOrderListCollectionExcel(groups: OrderListGroup[], meta: OrderListMeta): void {
	const wb = XLSX.utils.book_new();
	const rows: (string | number)[][] = [];
	const merges: Merge[] = [];
	groups.forEach((group, i) => {
		if (i > 0) {
			rows.push([]);
			rows.push([]); // blank separation between blocks
		}
		merges.push(...pushSectionRows(rows, group, meta));
	});
	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!cols'] = excelCols(meta.axis);
	ws['!merges'] = merges;
	XLSX.utils.book_append_sheet(wb, ws, PAPER_TITLE);
	XLSX.writeFile(wb, buildOrderListFilename(meta.festivalName, 'xlsx', meta.axis, null));
}
