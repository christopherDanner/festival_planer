import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
	buildSponsoringExportFilename,
	buildSponsoringExportRows,
	SPONSORING_EXPORT_COLUMNS
} from '@/lib/sponsoringExport';
import type { SponsoringOverviewRow } from '@/lib/sponsoringTotals';

export interface SponsoringExportMeta {
	festivalName: string;
	/** Defaults to now. */
	date?: Date;
}

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

/** Exportiert die Sponsoring-Übersicht eines Fests als PDF. */
export function exportSponsoringOverviewPdf(
	rows: SponsoringOverviewRow[],
	meta: SponsoringExportMeta
): void {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 14;
	let y = 15;

	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text(meta.festivalName, pageWidth / 2, y, { align: 'center' });
	y += 6;

	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.text('Sponsoring-Übersicht', pageWidth / 2, y, { align: 'center' });
	y += 7;

	doc.setFontSize(10);
	doc.text(format(meta.date ?? new Date(), 'dd.MM.yyyy'), pageWidth - margin, y, {
		align: 'right'
	});
	y += 5;

	const body = buildSponsoringExportRows(rows);
	autoTable(doc, {
		startY: y,
		head: [SPONSORING_EXPORT_COLUMNS],
		body,
		theme: 'grid',
		styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', valign: 'top', lineWidth: 0.2 },
		headStyles: { fillColor: [70, 70, 70], fontStyle: 'bold', halign: 'left' },
		columnStyles: {
			0: { cellWidth: 45 }, // Firma
			1: { cellWidth: 'auto' }, // Leistungen
			2: { cellWidth: 28, halign: 'right' } // Gesamt
		},
		didParseCell: (data) => {
			// Gesamtsumme-Zeile hervorheben
			if (data.section === 'body' && data.row.index === body.length - 1) {
				data.cell.styles.fontStyle = 'bold';
			}
		},
		margin: { left: margin, right: margin }
	});

	const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	doc.text(`${rows.length} Sponsoren`, margin, finalY);

	addPageNumbers(doc);
	doc.save(buildSponsoringExportFilename(meta.festivalName, 'pdf'));
}
