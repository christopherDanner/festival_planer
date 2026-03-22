import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

export interface MaterialExportOptions {
	festivalName: string;
	materials: FestivalMaterialWithStation[];
	filterLabel?: string;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

function formatCurrency(value: number | null | undefined): string {
	if (value == null) return '';
	return value.toFixed(2);
}

function calculatePrices(m: FestivalMaterialWithStation): { net: number | null; gross: number | null } {
	if (m.unit_price == null) return { net: null, gross: null };
	if (m.tax_rate == null) return { net: m.unit_price, gross: m.unit_price };
	if (m.price_is_net) {
		return {
			net: m.unit_price,
			gross: Math.round(m.unit_price * (1 + m.tax_rate / 100) * 100) / 100
		};
	} else {
		return {
			net: Math.round(m.unit_price / (1 + m.tax_rate / 100) * 100) / 100,
			gross: m.unit_price
		};
	}
}

function getGesamt(m: FestivalMaterialWithStation): number | null {
	if (m.unit_price == null) return null;
	const prices = calculatePrices(m);
	const grossPrice = prices.gross ?? m.unit_price;
	const qty = m.actual_quantity ?? m.ordered_quantity;
	return qty * grossPrice;
}

function buildFilename(festivalName: string, suffix: string, filterLabel?: string): string {
	const base = sanitizeFilename(festivalName);
	if (filterLabel) {
		return `${base}_Materialliste_${sanitizeFilename(filterLabel)}.${suffix}`;
	}
	return `${base}_Materialliste.${suffix}`;
}

// ── Excel Export ──────────────────────────────────────────────

export function exportMaterialsToExcel(options: MaterialExportOptions): void {
	const { festivalName, materials, filterLabel } = options;
	const wb = XLSX.utils.book_new();

	const headers = [
		'Name', 'Kategorie', 'Lieferant', 'Station', 'Einheit', 'Verpackung',
		'Menge/VE', 'Bestellt', 'Ist-Menge', 'Netto (€)', 'Brutto (€)', 'MwSt %', 'Gesamt (€)', 'Notizen'
	];

	const rows: (string | number | null)[][] = [];
	rows.push(headers);

	let totalCost = 0;

	for (const m of materials) {
		const gesamt = getGesamt(m);
		if (gesamt != null) totalCost += gesamt;
		const prices = calculatePrices(m);

		rows.push([
			m.name,
			m.category || '',
			m.supplier || '',
			m.station?.name || '',
			m.unit,
			m.packaging_unit || '',
			m.amount_per_packaging ?? '',
			m.ordered_quantity,
			m.actual_quantity ?? '',
			prices.net != null ? prices.net : '',
			prices.gross != null ? prices.gross : '',
			m.tax_rate != null ? m.tax_rate : '',
			gesamt != null ? gesamt : '',
			m.notes || '',
		]);
	}

	// Summary row
	rows.push([]);
	rows.push([`Gesamt: ${materials.length} Positionen`, '', '', '', '', '', '', '', '', '', '', '', totalCost > 0 ? totalCost : '', '']);

	const ws = XLSX.utils.aoa_to_sheet(rows);

	ws['!cols'] = [
		{ wch: 28 },  // Name
		{ wch: 16 },  // Kategorie
		{ wch: 20 },  // Lieferant
		{ wch: 18 },  // Station
		{ wch: 10 },  // Einheit
		{ wch: 14 },  // Verpackung
		{ wch: 10 },  // Menge/VE
		{ wch: 10 },  // Bestellt
		{ wch: 12 },  // Ist-Menge
		{ wch: 14 },  // Netto
		{ wch: 14 },  // Brutto
		{ wch: 10 },  // MwSt %
		{ wch: 12 },  // Gesamt
		{ wch: 24 },  // Notizen
	];

	XLSX.utils.book_append_sheet(wb, ws, 'Materialliste');
	XLSX.writeFile(wb, buildFilename(festivalName, 'xlsx', filterLabel));
}

// ── PDF Export ────────────────────────────────────────────────

export function exportMaterialsToPdf(options: MaterialExportOptions): void {
	const { festivalName, materials, filterLabel } = options;
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 14;
	let y = 15;

	// Title
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text(festivalName, pageWidth / 2, y, { align: 'center' });
	y += 6;

	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	const subtitle = filterLabel ? `Materialliste — ${filterLabel}` : 'Materialliste';
	doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
	y += 8;

	// Table
	const head = [['Name', 'Kat.', 'Lieferant', 'Station', 'Bestellt', 'Ist-Menge', 'Netto', 'Brutto', 'Gesamt']];

	let totalCost = 0;
	const body = materials.map(m => {
		const gesamt = getGesamt(m);
		if (gesamt != null) totalCost += gesamt;
		const prices = calculatePrices(m);

		return [
			m.name,
			m.category || '',
			m.supplier || '',
			m.station?.name || '',
			String(m.ordered_quantity),
			m.actual_quantity != null ? String(m.actual_quantity) : '',
			prices.net != null ? formatCurrency(prices.net) : '',
			prices.gross != null ? formatCurrency(prices.gross) : '',
			gesamt != null ? formatCurrency(gesamt) : '',
		];
	});

	autoTable(doc, {
		startY: y,
		head,
		body,
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
			overflow: 'linebreak',
			valign: 'top',
			lineWidth: 0.2,
		},
		headStyles: {
			fillColor: [70, 70, 70],
			fontStyle: 'bold',
			fontSize: 8,
			halign: 'center',
			cellPadding: 2,
		},
		columnStyles: {
			0: { cellWidth: 28 },   // Name
			1: { cellWidth: 16 },   // Kat.
			2: { cellWidth: 22 },   // Lieferant
			3: { cellWidth: 20 },   // Station
			4: { cellWidth: 14, halign: 'right' },  // Bestellt
			5: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },  // Ist-Menge
			6: { cellWidth: 16, halign: 'right' },  // Netto
			7: { cellWidth: 16, halign: 'right' },  // Brutto
			8: { cellWidth: 16, halign: 'right' },  // Gesamt
		},
		margin: { left: margin, right: margin },
		didParseCell: (hookData) => {
			// Highlight Ist-Menge column
			if (hookData.section === 'body' && hookData.column.index === 5) {
				const text = hookData.cell.raw as string;
				if (text) {
					hookData.cell.styles.fillColor = [235, 245, 255];
					hookData.cell.styles.textColor = [30, 64, 120];
				}
			}
		},
		didDrawPage: (hookData) => {
			// Page footer with page numbers
			const pageCount = (doc as any).internal.getNumberOfPages();
			const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
			doc.setFontSize(8);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(130, 130, 130);
			doc.text(
				`Seite ${currentPage} von ${pageCount}`,
				pageWidth / 2,
				pageHeight - 8,
				{ align: 'center' }
			);
			doc.setTextColor(0, 0, 0);
		},
	});

	// Summary below table
	const finalY = (doc as any).lastAutoTable.finalY + 8;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	const summaryParts = [`${materials.length} Positionen`];
	if (totalCost > 0) {
		summaryParts.push(`Gesamtkosten: ${totalCost.toFixed(2)} €`);
	}
	doc.text(summaryParts.join('  |  '), margin, finalY);

	doc.save(buildFilename(festivalName, 'pdf', filterLabel));
}
