import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
	POSTER_COLOR,
	POSTER_MARGIN,
	createPosterDoc,
	drawPosterFooter,
	drawPosterHead,
	drawStamp,
	posterTableEnd,
	posterTableTheme
} from '@/lib/pdfPoster';
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

const PAPER_TITLE = 'Sponsoring-Übersicht';

/** Baut die Sponsoring-Übersicht als Plakat; gespeichert wird sie in {@link exportSponsoringOverviewPdf}. */
export function buildSponsoringOverviewPdf(
	rows: SponsoringOverviewRow[],
	meta: SponsoringExportMeta
): jsPDF {
	const doc = createPosterDoc({ orientation: 'portrait' });

	const y = drawPosterHead(doc, {
		title: meta.festivalName,
		subtitle: PAPER_TITLE,
		note: format(meta.date ?? new Date(), 'dd.MM.yyyy')
	});

	const body = buildSponsoringExportRows(rows);
	const theme = posterTableTheme({ fontSize: 9 });
	autoTable(doc, {
		...theme,
		startY: y,
		head: [SPONSORING_EXPORT_COLUMNS],
		body,
		columnStyles: {
			0: { cellWidth: 45, fontStyle: 'bold' }, // Firma
			1: { cellWidth: 'auto' }, // Leistungen
			2: { cellWidth: 28, halign: 'right' } // Gesamt
		},
		didParseCell: (data) => {
			// Gesamtsumme-Zeile ist die Kassa-Zeile: Gelb, wie die Auswahl im Bereich.
			if (data.section === 'body' && data.row.index === body.length - 1) {
				data.cell.styles.fontStyle = 'bold';
				data.cell.styles.fillColor = [...POSTER_COLOR.gelb];
			}
		}
	});

	drawStamp(doc, {
		x: POSTER_MARGIN,
		y: posterTableEnd(doc) + 6,
		label: rows.length === 1 ? '1 Sponsor' : `${rows.length} Sponsoren`,
		tone: 'tinte'
	});

	drawPosterFooter(doc, `${meta.festivalName} — ${PAPER_TITLE}`);
	return doc;
}

/** Exportiert die Sponsoring-Übersicht eines Fests als PDF. */
export function exportSponsoringOverviewPdf(
	rows: SponsoringOverviewRow[],
	meta: SponsoringExportMeta
): void {
	buildSponsoringOverviewPdf(rows, meta).save(
		buildSponsoringExportFilename(meta.festivalName, 'pdf')
	);
}
