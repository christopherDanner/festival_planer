import * as XLSX from 'xlsx';
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { POSTER_FONT } from '@/lib/pdfFonts';
import {
	POSTER_COLOR,
	POSTER_LINE,
	POSTER_MARGIN,
	createPosterDoc,
	drawPosterFooter,
	drawPosterHead,
	drawRuler,
	drawSectionHeading,
	drawStamp,
	posterTableTheme
} from '@/lib/pdfPoster';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';

export interface ExportData {
	festivalName: string;
	festivalDate: string;
	stations: Station[];
	stationShifts: StationShift[];
	assignments: ShiftAssignmentWithMember[];
	stationMembers: StationMemberWithDetails[];
}

function formatShiftTime(shift: StationShift): string {
	const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
	const startDate = new Date(shift.start_date);
	const day = days[startDate.getDay()];
	const dateStr = startDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
	const startTime = shift.start_time.slice(0, 5);
	const endTime = shift.end_time.slice(0, 5);
	return `${day} ${dateStr} ${startTime}–${endTime}`;
}

function getMemberName(member?: { first_name: string; last_name: string }): string {
	if (!member) return '';
	return `${member.last_name} ${member.first_name}`;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

/** Build per-station column data */
function buildStationColumns(data: ExportData) {
	return data.stations.map(station => {
		const stMembers = data.stationMembers
			.filter(sm => sm.station_id === station.id)
			.map(sm => getMemberName(sm.member))
			.filter(Boolean);

		const shifts = data.stationShifts.filter(s => s.station_id === station.id);
		const shiftBlocks = shifts.map(shift => {
			const assignedNames = data.assignments
				.filter(a => a.station_shift_id === shift.id)
				.map(a => getMemberName(a.member))
				.filter(Boolean);
			return {
				label: `${shift.name} (${formatShiftTime(shift)})`,
				filled: assignedNames.length,
				required: shift.required_people,
				names: assignedNames,
			};
		});

		const responsible = station.responsible_member
			? getMemberName(station.responsible_member)
			: null;

		return {
			station,
			responsible,
			stationMemberNames: stMembers,
			shiftBlocks,
		};
	});
}

// ── Excel Export ──────────────────────────────────────────────

export function exportToExcel(data: ExportData): void {
	const wb = XLSX.utils.book_new();
	const columns = buildStationColumns(data);

	// ── Sheet 1: Station columns ──
	const totalCols = columns.length * 2 - 1;
	const grid: (string | null)[][] = [];

	// Row 0: Title
	const titleRow: (string | null)[] = Array(Math.max(totalCols, 1)).fill(null);
	titleRow[0] = `${data.festivalName} — ${data.festivalDate}`;
	grid.push(titleRow);
	grid.push(Array(totalCols).fill(null));

	// Build each column's rows
	const colRows: string[][] = columns.map(col => {
		const rows: string[] = [];
		rows.push(col.station.name);
		if (col.responsible) {
			rows.push(`Leitung: ${col.responsible}`);
		}
		rows.push(`${assignedPeople(col)}/${col.station.required_people} Personen`);
		rows.push('');

		if (col.stationMemberNames.length > 0) {
			for (const name of col.stationMemberNames) rows.push(name);
			rows.push('');
		}

		for (const block of col.shiftBlocks) {
			rows.push(block.label);
			rows.push(`${block.filled}/${block.required} besetzt`);
			if (block.names.length > 0) {
				for (const name of block.names) rows.push(name);
			} else {
				rows.push('– keine –');
			}
			rows.push('');
		}

		return rows;
	});

	const maxRows = Math.max(...colRows.map(r => r.length));

	for (let r = 0; r < maxRows; r++) {
		const row: (string | null)[] = [];
		for (let c = 0; c < columns.length; c++) {
			if (c > 0) row.push(null);
			row.push(colRows[c][r] ?? null);
		}
		grid.push(row);
	}

	const ws = XLSX.utils.aoa_to_sheet(grid);

	const colWidths: { wch: number }[] = [];
	for (let c = 0; c < columns.length; c++) {
		if (c > 0) colWidths.push({ wch: 2 });
		colWidths.push({ wch: 30 });
	}
	ws['!cols'] = colWidths;

	if (totalCols > 1) {
		ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
	}

	XLSX.utils.book_append_sheet(wb, ws, 'Schichtplan');

	XLSX.writeFile(wb, `${sanitizeFilename(data.festivalName)}_Schichtplan.xlsx`);
}

// ── PDF Export ────────────────────────────────────────────────

/** Personen, die insgesamt auf einer Station stehen (Station + Schichten). */
function assignedPeople(column: ReturnType<typeof buildStationColumns>[number]): number {
	return (
		column.stationMemberNames.length +
		column.shiftBlocks.reduce((sum, block) => sum + block.names.length, 0)
	);
}

/**
 * Besetzungs-Leiste: je Station ein Maßband mit Ist/Soll und ein Stempel, der
 * Klartext spricht („VOLL BESETZT" / „3 FEHLEN", DESIGN-VISION §4).
 *
 * @returns y-Kante unter der Leiste.
 */
function drawStaffingBars(
	doc: jsPDF,
	columns: ReturnType<typeof buildStationColumns>,
	startY: number
): number {
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const width = pageWidth - POSTER_MARGIN * 2;
	let y = drawSectionHeading(doc, {
		x: POSTER_MARGIN,
		y: startY,
		width,
		label: 'Besetzung',
		note: `${columns.length} Stationen`
	});
	y += 2;

	for (const column of columns) {
		if (y > pageHeight - 24) {
			doc.addPage();
			y = POSTER_MARGIN;
		}
		const assigned = assignedPeople(column);
		const required = column.station.required_people;
		const missing = Math.max(0, required - assigned);

		doc.setFont(POSTER_FONT.accent, 'normal');
		doc.setFontSize(11);
		doc.setTextColor(...POSTER_COLOR.tinte);
		doc.text(column.station.name.toUpperCase(), POSTER_MARGIN, y + 4.2);

		drawRuler(doc, {
			x: POSTER_MARGIN + width * 0.24,
			y: y + 0.6,
			width: width * 0.38,
			value: assigned,
			max: required,
			height: 4.5
		});

		doc.setFont(POSTER_FONT.body, 'bold');
		doc.setFontSize(8.5);
		doc.text(`${assigned}/${required} Personen`, POSTER_MARGIN + width * 0.64, y + 4.2);

		drawStamp(doc, {
			x: POSTER_MARGIN + width * 0.79,
			y,
			label: missing > 0 ? `${missing} fehlen` : 'Voll besetzt',
			tone: missing > 0 ? 'rot' : 'gruen'
		});

		y += 7.5;
	}

	return y + 4;
}

/** Baut den Einsatzplan als Plakat; das Speichern macht {@link exportToPdf}. */
export function buildShiftPlanPdf(data: ExportData): jsPDF {
	const doc = createPosterDoc({ orientation: 'landscape' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = POSTER_MARGIN;

	let y = drawPosterHead(doc, {
		title: data.festivalName,
		subtitle: 'Einsatzplan',
		note: data.festivalDate,
		height: 20
	});

	// ── Station columns as table ──
	const columns = buildStationColumns(data);
	y = drawStaffingBars(doc, columns, y);
	y = drawSectionHeading(doc, {
		x: margin,
		y,
		width: pageWidth - margin * 2,
		label: 'Schichten'
	});
	y += 2;
	const head = columns.map(col => col.station.name);

	const colLines: string[][] = columns.map(col => {
		const lines: string[] = [];
		if (col.responsible) {
			lines.push(`Leitung: ${col.responsible}`);
		}
		// Ist/Soll steht schon als Maßband in der Besetzungs-Leiste.

		/* Leerzeile nur zwischen zwei Blöcken — sonst beginnt die Spalte mit
		einer leeren Zeile, die quer durch alle Stationen läuft. */
		const separate = () => {
			if (lines.length > 0) lines.push('');
		};

		if (col.stationMemberNames.length > 0) {
			separate();
			for (const name of col.stationMemberNames) lines.push(name);
		}

		for (const block of col.shiftBlocks) {
			separate();
			lines.push(block.label);
			lines.push(`${block.filled}/${block.required} besetzt`);
			if (block.names.length > 0) {
				for (const name of block.names) lines.push(name);
			} else {
				lines.push('– keine –');
			}
		}

		return lines;
	});

	const maxLines = Math.max(...colLines.map(l => l.length));
	const bodyRows: string[][] = [];
	for (let r = 0; r < maxLines; r++) {
		bodyRows.push(colLines.map(lines => lines[r] ?? ''));
	}

	const usableWidth = pageWidth - margin * 2;
	const colWidth = usableWidth / columns.length;

	const theme = posterTableTheme();
	autoTable(doc, {
		...theme,
		startY: y,
		head: [head],
		body: bodyRows,
		styles: { ...theme.styles, fontSize: 7.5, cellWidth: 'wrap' },
		headStyles: {
			...theme.headStyles,
			// Stationsnamen sind ein Fall für die Akzentschrift (Vision §4).
			font: POSTER_FONT.accent,
			fontStyle: 'normal',
			fontSize: 11,
			halign: 'center'
		},
		// Die Zeilen sind hier Textzeilen, keine Datensätze — Wechseltönung
		// würde quer durch die Stationsspalten laufen.
		alternateRowStyles: { fillColor: [...POSTER_COLOR.weiss] },
		columnStyles: Object.fromEntries(
			columns.map((_, i) => [i, { cellWidth: colWidth, minCellWidth: 30 }])
		),
		tableWidth: usableWidth,
		didParseCell: (hookData) => {
			if (hookData.section !== 'body') return;
			const text = hookData.cell.raw as string;
			// Zähler und Leitung treten hinter die Namen zurück …
			if (/^\d+\/\d+ besetzt$/.test(text) || text.startsWith('Leitung:')) {
				hookData.cell.styles.textColor = [...POSTER_COLOR.tinteSoft];
				hookData.cell.styles.fontSize = 6.8;
			}
			// … die Schicht selbst ist die Zwischenzeile der Spalte:
			// „Name (Do 01.01 08:00–16:00)".
			if (/\(\w{2}\s\d{2}\.\d{2}/.test(text)) {
				hookData.cell.styles.fontStyle = 'bold';
				hookData.cell.styles.fontSize = 7.5;
				hookData.cell.styles.fillColor = [...POSTER_COLOR.fusszeile];
			}
			if (text === '– keine –') {
				hookData.cell.styles.textColor = [...POSTER_COLOR.rot];
			}
		}
	});

	drawPosterFooter(doc, `${data.festivalName} — Einsatzplan`);
	return doc;
}

export function exportToPdf(data: ExportData): void {
	buildShiftPlanPdf(data).save(`${sanitizeFilename(data.festivalName)}_Schichtplan.pdf`);
}
