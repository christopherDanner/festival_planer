import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
	axisLabel,
	buildOrderListFilename,
	type OrderListAxis,
	type OrderListGroup,
} from '@/lib/orderList';

export interface OrderListMeta {
	festivalName: string;
	axis: OrderListAxis;
	/** Defaults to now. */
	date?: Date;
}

const PDF_HEAD = [['Bezeichnung', 'Menge', 'Einheit']];

function formatDate(date: Date): string {
	return format(date, 'dd.MM.yyyy');
}

// ── PDF ───────────────────────────────────────────────────────

function addPageNumbers(doc: jsPDF): void {
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(130, 130, 130);
		doc.text(`Seite ${i} von ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
		doc.setTextColor(0, 0, 0);
	}
}

/** Draws one group (header + table + "X Positionen" footer) starting at the top of the current page. */
function drawSection(doc: jsPDF, group: OrderListGroup, meta: OrderListMeta): void {
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 14;
	let y = 15;

	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text(meta.festivalName, pageWidth / 2, y, { align: 'center' });
	y += 6;

	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.text('Bestellliste', pageWidth / 2, y, { align: 'center' });
	y += 7;

	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	doc.text(`${axisLabel(meta.axis)}: ${group.name}`, margin, y);
	doc.setFont('helvetica', 'normal');
	doc.text(formatDate(meta.date ?? new Date()), pageWidth - margin, y, { align: 'right' });
	y += 5;

	autoTable(doc, {
		startY: y,
		head: PDF_HEAD,
		body: group.rows.map((r) => [r.name, String(r.quantity), r.unit]),
		theme: 'grid',
		styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', valign: 'top', lineWidth: 0.2 },
		headStyles: { fillColor: [70, 70, 70], fontStyle: 'bold', halign: 'left' },
		columnStyles: {
			0: { cellWidth: 'auto' },
			1: { cellWidth: 30, halign: 'right' },
			2: { cellWidth: 35 },
		},
		margin: { left: margin, right: margin },
	});

	const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	doc.text(`${group.rows.length} Positionen`, margin, finalY);
}

export function exportOrderListSinglePdf(group: OrderListGroup, meta: OrderListMeta): void {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	drawSection(doc, group, meta);
	addPageNumbers(doc);
	doc.save(buildOrderListFilename(meta.festivalName, 'pdf', meta.axis, group));
}

export function exportOrderListCollectionPdf(groups: OrderListGroup[], meta: OrderListMeta): void {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	groups.forEach((group, i) => {
		if (i > 0) doc.addPage();
		drawSection(doc, group, meta);
	});
	addPageNumbers(doc);
	doc.save(buildOrderListFilename(meta.festivalName, 'pdf', meta.axis, null));
}

// ── Excel ─────────────────────────────────────────────────────

/** Appends one group's block (titles + table + count) to the row matrix; returns column merges added. */
function pushSectionRows(
	rows: (string | number)[][],
	group: OrderListGroup,
	meta: OrderListMeta
): { s: { r: number; c: number }; e: { r: number; c: number } }[] {
	const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
	const titleRow = rows.length;
	rows.push([meta.festivalName]);
	rows.push(['Bestellliste']);
	rows.push([`${axisLabel(meta.axis)}: ${group.name}`, '', formatDate(meta.date ?? new Date())]);
	merges.push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: 2 } });
	merges.push({ s: { r: titleRow + 1, c: 0 }, e: { r: titleRow + 1, c: 2 } });
	rows.push([]);
	rows.push(['Bezeichnung', 'Menge', 'Einheit']);
	for (const r of group.rows) rows.push([r.name, r.quantity, r.unit]);
	rows.push([`${group.rows.length} Positionen`]);
	return merges;
}

const EXCEL_COLS = [{ wch: 40 }, { wch: 12 }, { wch: 16 }];

export function exportOrderListSingleExcel(group: OrderListGroup, meta: OrderListMeta): void {
	const wb = XLSX.utils.book_new();
	const rows: (string | number)[][] = [];
	const merges = pushSectionRows(rows, group, meta);
	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!cols'] = EXCEL_COLS;
	ws['!merges'] = merges;
	XLSX.utils.book_append_sheet(wb, ws, 'Bestellliste');
	XLSX.writeFile(wb, buildOrderListFilename(meta.festivalName, 'xlsx', meta.axis, group));
}

export function exportOrderListCollectionExcel(groups: OrderListGroup[], meta: OrderListMeta): void {
	const wb = XLSX.utils.book_new();
	const rows: (string | number)[][] = [];
	const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
	groups.forEach((group, i) => {
		if (i > 0) {
			rows.push([]);
			rows.push([]); // blank separation between blocks
		}
		merges.push(...pushSectionRows(rows, group, meta));
	});
	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!cols'] = EXCEL_COLS;
	ws['!merges'] = merges;
	XLSX.utils.book_append_sheet(wb, ws, 'Bestellliste');
	XLSX.writeFile(wb, buildOrderListFilename(meta.festivalName, 'xlsx', meta.axis, null));
}
