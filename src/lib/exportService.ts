import * as XLSX from 'xlsx';
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { POSTER_FONT } from '@/lib/pdfFonts';
import {
	POSTER_COLOR,
	POSTER_MARGIN,
	createPosterDoc,
	drawPosterFooter,
	drawPosterHead,
	drawRuler,
	drawSectionHeading,
	drawStamp,
	posterTableEnd,
	posterTableTheme,
	setPosterInk,
	truncateToWidth
} from '@/lib/pdfPoster';
import {
	buildStationBoards,
	slotLabel,
	stationMetaText,
	type BoardRow,
	type ShiftPlanSource,
	type StationBoard
} from '@/lib/shiftBoard';
import type { StationShift } from '@/lib/shiftService';

export interface ExportData extends ShiftPlanSource {
	festivalName: string;
	festivalDate: string;
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

function getHelperName(helper?: { first_name: string; last_name: string }): string {
	if (!helper) return '';
	return `${helper.last_name} ${helper.first_name}`;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

/** Build per-station column data */
function buildStationColumns(data: ExportData) {
	return data.stations.map(station => {
		const stHelpers = data.stationHelpers
			.filter(sm => sm.station_id === station.id)
			.map(sm => getHelperName(sm.helper))
			.filter(Boolean);

		const shifts = data.stationShifts.filter(s => s.station_id === station.id);
		const shiftBlocks = shifts.map(shift => {
			const assignedNames = data.assignments
				.filter(a => a.station_shift_id === shift.id)
				.map(a => getHelperName(a.helper))
				.filter(Boolean);
			return {
				label: `${shift.name} (${formatShiftTime(shift)})`,
				filled: assignedNames.length,
				required: shift.required_people,
				names: assignedNames,
			};
		});

		const responsible = station.responsible_helper
			? getHelperName(station.responsible_helper)
			: null;

		return {
			station,
			responsible,
			stationHelperNames: stHelpers,
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
		const totalAssigned =
			col.stationHelperNames.length + col.shiftBlocks.reduce((s, b) => s + b.names.length, 0);
		rows.push(`${totalAssigned}/${col.station.required_people} Personen`);
		rows.push('');

		if (col.stationHelperNames.length > 0) {
			for (const name of col.stationHelperNames) rows.push(name);
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

/** Rand, den die getönte Fußzeile samt Luft unter einer Tabelle braucht. */
const FOOTER_SPACE = 14;

/** Breitenanteil der Meta-Zeile im Stations-Kopf; rechts daneben stehen
Maßband und Stempel. */
const META_WIDTH = 0.52;

/** Spaltenbreiten der Schicht-Tabelle in mm; die Plätze nehmen den Rest. */
const COL_TIME = 28;
const COL_SHIFT = 34;
const COL_OPEN = 22;

/** Neue Seite, sobald der angefangene Block nicht mehr sinnvoll drauf passt. */
function breakIfTight(doc: jsPDF, y: number, needed: number): number {
	if (y <= doc.internal.pageSize.getHeight() - FOOTER_SPACE - needed) return y;
	doc.addPage();
	return POSTER_MARGIN;
}

/**
 * Kopf eines Stations-Blocks: Name und Soll/Ist als Sektionszeile, darunter Ort
 * und Leitung, daneben Maßband und Stempel („VOLL BESETZT" / „3 FEHLEN",
 * DESIGN-VISION §4).
 *
 * @returns y-Kante unter dem Kopf.
 */
function drawStationHead(doc: jsPDF, board: StationBoard, startY: number): number {
	const width = doc.internal.pageSize.getWidth() - POSTER_MARGIN * 2;
	let y = drawSectionHeading(doc, {
		x: POSTER_MARGIN,
		y: startY,
		width,
		label: board.station.name,
		note: `${board.assigned}/${board.required} Personen`
	});
	y += 1.5;

	const meta = stationMetaText(board);
	if (meta) {
		doc.setFont(POSTER_FONT.body, 'normal');
		doc.setFontSize(8.5);
		setPosterInk(doc, POSTER_COLOR.tinteSoft);
		// Die Zeile darf nicht ins Maßband laufen — lieber gekürzt als überdruckt.
		doc.text(truncateToWidth(doc, meta, width * META_WIDTH), POSTER_MARGIN, y + 3.6);
	}

	drawRuler(doc, {
		x: POSTER_MARGIN + width * 0.56,
		y: y + 0.4,
		width: width * 0.2,
		value: board.assigned,
		max: board.required,
		height: 4.5
	});

	// Rechts angeschlagen: die Stempelbreite hängt am Wortlaut, der Rahmen soll
	// trotzdem am Seitenrand enden.
	drawStamp(doc, {
		x: POSTER_MARGIN + width,
		y,
		label: board.open > 0 ? `${board.open} fehlen` : 'Voll besetzt',
		tone: board.open > 0 ? 'rot' : 'gruen',
		align: 'right'
	});

	return y + 8;
}

/** Tages-Zwischentitel in der Akzentschrift, rechts die Zähler des Tages —
derselbe Wortlaut wie auf der Werkbank. */
function drawDayHeading(
	doc: jsPDF,
	day: { title: string; shiftCount: number; open: number },
	y: number
): number {
	const width = doc.internal.pageSize.getWidth() - POSTER_MARGIN * 2;

	doc.setFont(POSTER_FONT.accent, 'normal');
	doc.setFontSize(11);
	setPosterInk(doc, POSTER_COLOR.gruen);
	doc.text(day.title.toUpperCase(), POSTER_MARGIN, y + 3.5);

	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(8);
	setPosterInk(doc, POSTER_COLOR.tinteSoft);
	const shifts = `${day.shiftCount} ${day.shiftCount === 1 ? 'Schicht' : 'Schichten'}`;
	doc.text(
		`${shifts} · ${day.open > 0 ? `${day.open} offen` : 'voll besetzt'}`,
		POSTER_MARGIN + width,
		y + 3.5,
		{ align: 'right' }
	);

	setPosterInk(doc, POSTER_COLOR.tinte);
	return y + 5.5;
}

/**
 * Die Schicht-Zeilen eines Tages als Frachtbrief-Tabelle: Zeit, Schicht, das
 * durchnummerierte Platz-Raster und der Offen-Zähler. Fehlende Besetzungen
 * beschriftet `slotLabel` als offen — eine Lücke, die niemand sieht, füllt auch
 * niemand.
 *
 * @returns y-Kante unter der Tabelle.
 */
function drawShiftRows(doc: jsPDF, rows: BoardRow[], startY: number): number {
	const theme = posterTableTheme();
	autoTable(doc, {
		...theme,
		startY,
		margin: { left: POSTER_MARGIN, right: POSTER_MARGIN, top: POSTER_MARGIN, bottom: FOOTER_SPACE },
		head: [['Zeit', 'Schicht', 'Besetzung', 'Offen']],
		body: rows.map((row) => [
			row.time,
			row.shift ? row.shift.name : 'Keine Schichten',
			row.slots.map(slotLabel).join('\n'),
			row.open > 0 ? `${row.open} offen` : 'voll'
		]),
		columnStyles: {
			// Uhrzeiten sind ein Fall für die Akzentschrift (Vision §4).
			0: { cellWidth: COL_TIME, halign: 'center', font: POSTER_FONT.accent, fontSize: 10 },
			1: { cellWidth: COL_SHIFT },
			2: { cellWidth: 'auto' },
			3: { cellWidth: COL_OPEN, halign: 'center', fontStyle: 'bold' }
		},
		didParseCell: (hookData) => {
			if (hookData.section !== 'body') return;
			const row = rows[hookData.row.index];
			// Die Pseudo-Zeile „GANZES FEST" ist keine Uhrzeit und braucht den
			// Platz von zwei — in der Zeit-Spalte darum eine Stufe kleiner.
			if (hookData.column.index === 0 && !row.shift) hookData.cell.styles.fontSize = 7.5;
			// Der Offen-Zähler trägt die Ampel der Zeile (Werkbank: „1 OFFEN"/„VOLL").
			if (hookData.column.index === 3) {
				hookData.cell.styles.textColor = [
					...(row.open > 0 ? POSTER_COLOR.rot : POSTER_COLOR.gruen)
				];
			}
		}
	});
	return posterTableEnd(doc) + 4;
}

/**
 * Baut den Schichtplan als Plakat; das Speichern macht {@link exportToPdf}.
 *
 * Gegliedert wird wie auf der Fokus-Werkbank: **Station → Tag → Schicht →
 * Plätze**, im Hochformat. Die früheren Stationsspalten nebeneinander sind
 * dasselbe Layout, das die Werkbank abgeschafft hat (#102) — wer den Ausdruck
 * daneben legte, fand sich nicht zurecht (#109).
 *
 * Die volle Plakat-Optik (Oswald-Titel je Station, grüner Halftone-Kopf,
 * Maßbänder als Kasten-Rahmen) ist ausdrücklich nicht hier: sie wird einmal für
 * alle drei Papiere gelöst.
 */
export function buildShiftPlanPdf(data: ExportData): jsPDF {
	const doc = createPosterDoc({ orientation: 'portrait' });
	const width = doc.internal.pageSize.getWidth() - POSTER_MARGIN * 2;

	let y = drawPosterHead(doc, {
		title: data.festivalName,
		subtitle: 'Schichtplan',
		note: data.festivalDate,
		height: 20
	});

	for (const board of buildStationBoards(data)) {
		// Ein Stations-Kopf allein am Seitenfuß hilft niemandem — er nimmt die
		// erste Zeile seiner Tabelle mit.
		y = breakIfTight(doc, y, 38);
		y = drawStationHead(doc, board, y);

		for (const day of board.days) {
			y = breakIfTight(doc, y, 26);
			y = drawDayHeading(doc, day, y);
			y = drawShiftRows(doc, day.rows, y);
		}

		// Eine Station ohne Schichten plant eine Ebene höher: ein Platz-Raster
		// über das ganze Fest (Entscheid 1 aus #68).
		if (board.wholeFestRow) {
			y = drawShiftRows(doc, [board.wholeFestRow], y);
		}

		if (board.members.length > 0) {
			// Die Tabelle darf bis dicht an die Fußzeile laufen — die Zeile darunter
			// läge sonst darin.
			y = breakIfTight(doc, y, 6);
			doc.setFont(POSTER_FONT.body, 'normal');
			doc.setFontSize(8);
			setPosterInk(doc, POSTER_COLOR.tinteSoft);
			doc.text(
				truncateToWidth(doc, `Ohne Schicht: ${board.members.map((m) => m.name).join(', ')}`, width),
				POSTER_MARGIN,
				y + 2.8
			);
			setPosterInk(doc, POSTER_COLOR.tinte);
			y += 6;
		}

		y += 4;
	}

	drawPosterFooter(doc, `${data.festivalName} — Schichtplan`);
	return doc;
}

export function exportToPdf(data: ExportData): void {
	buildShiftPlanPdf(data).save(`${sanitizeFilename(data.festivalName)}_Schichtplan.pdf`);
}
