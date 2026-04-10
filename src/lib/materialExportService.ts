import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

export interface MaterialExportOptions {
	festivalName: string;
	materials: FestivalMaterialWithStation[];
	filterLabel?: string;
	isStationFiltered?: boolean;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

function buildFilename(festivalName: string, suffix: string, filterLabel?: string): string {
	const base = sanitizeFilename(festivalName);
	if (filterLabel) {
		return `${base}_Materialliste_${sanitizeFilename(filterLabel)}.${suffix}`;
	}
	return `${base}_Materialliste.${suffix}`;
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

// ── Excel Export ──────────────────────────────────────────────

export function exportMaterialsToExcel(options: MaterialExportOptions): void {
	const { festivalName, materials, filterLabel, isStationFiltered } = options;
	const wb = XLSX.utils.book_new();

	const rows: (string | number | null)[][] = [];

	// Headers — omit Station column when filtered by station
	const headers = isStationFiltered
		? ['Name', 'Lieferant', 'Einheit', 'Verpackung', 'Menge/VE', 'Bestellt', 'Verbraucht', 'Neue Menge']
		: ['Name', 'Lieferant', 'Station', 'Einheit', 'Verpackung', 'Menge/VE', 'Bestellt', 'Verbraucht', 'Neue Menge'];

	// Total approximate character width of the table — used to wrap the explanation text
	// so it doesn't get clipped (xlsx free edition does not support wrapText cell styles).
	const totalCharWidth = isStationFiltered
		? 28 + 20 + 10 + 14 + 10 + 10 + 12 + 14
		: 28 + 20 + 18 + 10 + 14 + 10 + 10 + 12 + 14;
	const maxCharsPerLine = Math.floor(totalCharWidth * 0.95);

	// Title rows
	const subtitle = filterLabel ? `Materialliste — ${filterLabel}` : 'Materialliste';
	rows.push([festivalName]);
	rows.push([subtitle]);
	rows.push([]); // empty row

	// Explanation text — wrapped manually into multiple rows
	const explanationLines = wrapText(EXPLANATION_TEXT(festivalName), maxCharsPerLine);
	const explanationStartRow = rows.length;
	for (const line of explanationLines) {
		rows.push([line]);
	}
	const explanationEndRow = rows.length - 1;

	rows.push([]); // empty row before table
	rows.push(headers);

	for (const m of materials) {
		const row = isStationFiltered
			? [
				m.name,
				m.supplier || '',
				m.unit,
				m.packaging_unit || '',
				m.amount_per_packaging ?? '',
				m.ordered_quantity,
				m.actual_quantity ?? '',
				'', // Neue Menge — empty for user to fill in
			]
			: [
				m.name,
				m.supplier || '',
				m.station?.name || '',
				m.unit,
				m.packaging_unit || '',
				m.amount_per_packaging ?? '',
				m.ordered_quantity,
				m.actual_quantity ?? '',
				'', // Neue Menge
			];
		rows.push(row);
	}

	// Summary row
	rows.push([]);
	rows.push([`Gesamt: ${materials.length} Positionen`]);

	const ws = XLSX.utils.aoa_to_sheet(rows);

	// Column widths
	ws['!cols'] = isStationFiltered
		? [
			{ wch: 28 }, // Name
			{ wch: 20 }, // Lieferant
			{ wch: 10 }, // Einheit
			{ wch: 14 }, // Verpackung
			{ wch: 10 }, // Menge/VE
			{ wch: 10 }, // Bestellt
			{ wch: 12 }, // Verbraucht
			{ wch: 14 }, // Neue Menge
		]
		: [
			{ wch: 28 }, // Name
			{ wch: 20 }, // Lieferant
			{ wch: 18 }, // Station
			{ wch: 10 }, // Einheit
			{ wch: 14 }, // Verpackung
			{ wch: 10 }, // Menge/VE
			{ wch: 10 }, // Bestellt
			{ wch: 12 }, // Verbraucht
			{ wch: 14 }, // Neue Menge
		];

	// Merge title, subtitle and each explanation line across the full table width
	const colCount = headers.length;
	const merges = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, // title
		{ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }, // subtitle
	];
	for (let r = explanationStartRow; r <= explanationEndRow; r++) {
		merges.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
	}
	ws['!merges'] = merges;

	XLSX.utils.book_append_sheet(wb, ws, 'Materialliste');
	XLSX.writeFile(wb, buildFilename(festivalName, 'xlsx', filterLabel));
}

// ── PDF Export ────────────────────────────────────────────────

export function exportMaterialsToPdf(options: MaterialExportOptions): void {
	const { festivalName, materials, filterLabel, isStationFiltered } = options;
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

	// Explanation text
	doc.setFontSize(9);
	doc.setFont('helvetica', 'italic');
	const explanationLines = doc.splitTextToSize(EXPLANATION_TEXT(festivalName), pageWidth - margin * 2);
	doc.text(explanationLines, margin, y);
	y += explanationLines.length * 4 + 4;

	// Table columns — omit Station when filtered
	const head = isStationFiltered
		? [['Name', 'Lieferant', 'Einheit', 'VE', 'Menge/VE', 'Bestellt', 'Verbraucht', 'Neue Menge']]
		: [['Name', 'Lieferant', 'Station', 'Einheit', 'VE', 'Menge/VE', 'Bestellt', 'Verbraucht', 'Neue Menge']];

	const body = materials.map(m => {
		const baseRow = [
			m.name,
			m.supplier || '',
			...(isStationFiltered ? [] : [m.station?.name || '']),
			m.unit,
			m.packaging_unit || '',
			m.amount_per_packaging != null ? String(m.amount_per_packaging) : '',
			String(m.ordered_quantity),
			m.actual_quantity != null ? String(m.actual_quantity) : '',
			'', // Neue Menge — empty
		];
		return baseRow;
	});

	// Column style indices shift based on whether station is shown
	const neueMengeIdx = isStationFiltered ? 7 : 8;
	const istMengeIdx = isStationFiltered ? 6 : 7;

	const usableWidth = pageWidth - margin * 2;

	const columnStyles: Record<number, any> = isStationFiltered
		? {
			0: { cellWidth: 36 },  // Name
			1: { cellWidth: 26 },  // Lieferant
			2: { cellWidth: 16 },  // Einheit
			3: { cellWidth: 18 },  // VE
			4: { cellWidth: 20, halign: 'right' },  // Menge/VE
			5: { cellWidth: 20, halign: 'right' },  // Bestellt
			6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },  // Verbraucht
			7: { cellWidth: 24, halign: 'right' },  // Neue Menge
		}
		: {
			0: { cellWidth: 30 },  // Name
			1: { cellWidth: 24 },  // Lieferant
			2: { cellWidth: 20 },  // Station
			3: { cellWidth: 16 },  // Einheit
			4: { cellWidth: 16 },  // VE
			5: { cellWidth: 18, halign: 'right' },  // Menge/VE
			6: { cellWidth: 18, halign: 'right' },  // Bestellt
			7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },  // Verbraucht
			8: { cellWidth: 20, halign: 'right' },  // Neue Menge
		};

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
			cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
		},
		columnStyles,
		margin: { left: margin, right: margin },
		tableWidth: usableWidth,
		didParseCell: (hookData) => {
			if (hookData.section === 'body') {
				// Highlight Verbraucht column in light blue
				if (hookData.column.index === istMengeIdx) {
					const text = hookData.cell.raw as string;
					if (text) {
						hookData.cell.styles.fillColor = [235, 245, 255];
						hookData.cell.styles.textColor = [30, 64, 120];
					}
				}
				// Highlight Neue Menge column in light yellow
				if (hookData.column.index === neueMengeIdx) {
					hookData.cell.styles.fillColor = [255, 253, 230];
				}
			}
		},
		didDrawPage: () => {
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
	doc.text(`${materials.length} Positionen`, margin, finalY);

	doc.save(buildFilename(festivalName, 'pdf', filterLabel));
}
