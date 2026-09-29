/** Die zwei Papiere des Ablaufplans auf Papier (#126).
Der Bereich hat zwei Publika, also zwei Exporte statt eines Auswahl-Dialogs:
der **Programmzettel** geht als Aushang ans Publikum, die **Aufgabenliste** ist
die interne Kopie des Bildschirms. Was darauf steht, entscheiden
`buildProgramSheet` und `buildWorklist` — dieselben Rechnungen, die auch die
zwei Papiere am Schreibtisch füllen. Hier wird nur gezeichnet. */

import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { POSTER_FONT } from '@/lib/pdfFonts';
import {
	POSTER_COLOR,
	POSTER_MARGIN,
	createPosterDoc,
	drawCheckbox,
	drawPosterFooter,
	drawPosterHead,
	drawSectionHeading,
	drawStamp,
	posterTableEnd,
	posterTableTheme,
	setPosterInk
} from '@/lib/pdfPoster';
import type { ProgramSheet, ProgramSheetRow } from '@/lib/scheduleProgramSheet';
import {
	worklistDayNote,
	type Worklist,
	type WorklistPhaseGroup,
	type WorklistTask
} from '@/lib/scheduleWorklist';

/** Rand, den die getönte Fußzeile samt Luft unter einem Block braucht. */
const FOOTER_SPACE = 14;

/** Breite der Zeitspalte in mm — sie steht auf beiden Papieren fest. */
const TIME_COLUMN = 18;

/** Neue Seite, sobald der angefangene Block nicht mehr sinnvoll drauf passt. */
function breakIfTight(doc: jsPDF, y: number, needed: number): number {
	if (y <= doc.internal.pageSize.getHeight() - FOOTER_SPACE - needed) return y;
	doc.addPage();
	return POSTER_MARGIN;
}

/** Die bedruckbare Breite zwischen den Seitenrändern. */
function contentWidth(doc: jsPDF): number {
	return doc.internal.pageSize.getWidth() - POSTER_MARGIN * 2;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

// ── Programmzettel ────────────────────────────────────────────

const PROGRAM_TITLE = 'Programm';

/** Zeilenhöhe von Titel und Beschreibung in mm. */
const PROGRAM_TITLE_LINE = 4.6;
const PROGRAM_DESCRIPTION_LINE = 3.6;

export interface ProgramSheetExportOptions {
	festivalName: string;
	/** Der Zettel, wie er am Bildschirm steht — ungefiltert, ein Aushang zeigt
	das ganze Fest (#126). */
	sheet: ProgramSheet;
}

/**
 * Eine Zeile des Aushangs: Uhrzeit in fester Spalte (Akzentschrift), daneben
 * der Titel und darunter die Beschreibung leise — wie am Bildschirm.
 *
 * Keine Frachtbrief-Tabelle: ein Aushang trägt kein Gitter. Umbruch und
 * Seitenwechsel macht darum diese Zeile selbst.
 *
 * @returns y-Kante unter der Zeile.
 */
function drawProgramRow(doc: jsPDF, row: ProgramSheetRow, startY: number): number {
	const textX = POSTER_MARGIN + TIME_COLUMN;
	const textWidth = contentWidth(doc) - TIME_COLUMN;

	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(10);
	const titleLines: string[] = doc.splitTextToSize(row.entry.title, textWidth);

	doc.setFont(POSTER_FONT.body, 'normal');
	doc.setFontSize(8.5);
	const descriptionLines: string[] = row.entry.description
		? doc.splitTextToSize(row.entry.description, textWidth)
		: [];

	const height =
		titleLines.length * PROGRAM_TITLE_LINE + descriptionLines.length * PROGRAM_DESCRIPTION_LINE;
	let y = breakIfTight(doc, startY, height + 2);

	if (row.time) {
		// Uhrzeiten sind ein Fall für die Akzentschrift (Vision §4). Ohne Zeit
		// bleibt die Spalte leer — auf einem Aushang wäre „ohne Zeit" nur Lärm.
		doc.setFont(POSTER_FONT.accent, 'normal');
		doc.setFontSize(11);
		setPosterInk(doc, POSTER_COLOR.tinte);
		doc.text(row.time, POSTER_MARGIN, y + 3.4);
	}

	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(10);
	setPosterInk(doc, POSTER_COLOR.tinte);
	doc.text(titleLines, textX, y + 3.4);
	y += titleLines.length * PROGRAM_TITLE_LINE;

	if (descriptionLines.length > 0) {
		doc.setFont(POSTER_FONT.body, 'normal');
		doc.setFontSize(8.5);
		setPosterInk(doc, POSTER_COLOR.tinteSoft);
		doc.text(descriptionLines, textX, y + 2.4);
		y += descriptionLines.length * PROGRAM_DESCRIPTION_LINE;
	}

	setPosterInk(doc, POSTER_COLOR.tinte);
	return y + 1.6;
}

/** Baut den Programmzettel als Plakat; das Speichern macht {@link exportProgramSheetToPdf}. */
export function buildProgramSheetPdf({
	festivalName,
	sheet
}: ProgramSheetExportOptions): jsPDF {
	const doc = createPosterDoc({ orientation: 'portrait' });
	let y = drawPosterHead(doc, { title: festivalName, subtitle: PROGRAM_TITLE });

	for (const day of sheet.days) {
		// Ein Tages-Zwischentitel allein am Seitenfuß hilft niemandem — er nimmt
		// seine erste Zeile mit.
		y = breakIfTight(doc, y, 22);
		y =
			drawSectionHeading(doc, {
				x: POSTER_MARGIN,
				y: y + 2,
				width: contentWidth(doc),
				label: day.title,
				accent: true,
				tone: 'gruen'
			}) + 2;

		for (const row of day.rows) {
			y = drawProgramRow(doc, row, y);
		}

		y += 4;
	}

	if (sheet.days.length === 0) {
		// Der Bildschirm sagt hier, wo der erste Punkt entsteht — auf Papier führt
		// kein Knopf mehr irgendwohin.
		doc.setFontSize(9);
		setPosterInk(doc, POSTER_COLOR.tinteSoft);
		doc.text('Noch kein Programmpunkt erfasst.', POSTER_MARGIN, y + 3);
		setPosterInk(doc, POSTER_COLOR.tinte);
		y += 8;
	}

	y = breakIfTight(doc, y, 8);
	drawStamp(doc, {
		x: POSTER_MARGIN,
		y: y + 2,
		label: sheet.count === 1 ? '1 Punkt' : `${sheet.count} Punkte`,
		tone: 'tinte'
	});

	drawPosterFooter(doc, `${festivalName} — ${PROGRAM_TITLE}`);
	return doc;
}

/** Lädt den Programmzettel als PDF herunter. */
export function exportProgramSheetToPdf(options: ProgramSheetExportOptions): void {
	buildProgramSheetPdf(options).save(
		`${sanitizeFilename(options.festivalName)}_${PROGRAM_TITLE}.pdf`
	);
}

// ── Aufgabenliste ─────────────────────────────────────────────

const TASK_TITLE = 'Aufgabenliste';

/** Spaltenbreiten der Aufgaben-Tabelle in mm; der Titel nimmt den Rest. */
const COL_CHECK = 8;
const COL_RESPONSIBLE = 38;

/** Kantenlänge des Kästchens in mm (17px der Vision). */
const CHECKBOX_SIZE = 4.5;

export interface TaskListExportOptions {
	festivalName: string;
	/** Die Werkliste, wie sie am Bildschirm steht — samt Filter, Zählern und
	Fußzeile. „Was du siehst, kommt raus" (#126). */
	worklist: Worklist;
}

/** Der leise Zwischentitel einer Phase mit `erledigt/gesamt`, wie am Bildschirm. */
function drawPhaseHeading(doc: jsPDF, group: WorklistPhaseGroup, y: number): number {
	const width = contentWidth(doc);

	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(8);
	setPosterInk(doc, POSTER_COLOR.tinteSoft);
	doc.text(group.phase!.name.toUpperCase(), POSTER_MARGIN, y + 3);
	doc.text(`${group.done}/${group.total}`, POSTER_MARGIN + width, y + 3, { align: 'right' });

	setPosterInk(doc, POSTER_COLOR.tinte);
	return y + 5;
}

/**
 * Die Aufgaben eines Blocks als Frachtbrief-Tabelle: Kästchen, Uhrzeit, Titel,
 * Verantwortlicher — die vier Spalten der Werkliste.
 *
 * @returns y-Kante unter der Tabelle.
 */
function drawTaskRows(doc: jsPDF, tasks: WorklistTask[], startY: number): number {
	const theme = posterTableTheme();
	autoTable(doc, {
		...theme,
		startY,
		margin: { left: POSTER_MARGIN, right: POSTER_MARGIN, top: POSTER_MARGIN, bottom: FOOTER_SPACE },
		head: [['', 'Zeit', 'Aufgabe', 'Verantwortlich']],
		body: tasks.map((task) => [
			'',
			task.time ?? 'ohne Zeit',
			task.entry.title,
			task.responsible ?? '—'
		]),
		columnStyles: {
			0: { cellWidth: COL_CHECK },
			// Uhrzeiten sind ein Fall für die Akzentschrift (Vision §4).
			1: { cellWidth: TIME_COLUMN, halign: 'center', font: POSTER_FONT.accent, fontSize: 10 },
			2: { cellWidth: 'auto' },
			3: { cellWidth: COL_RESPONSIBLE }
		},
		didParseCell: (hookData) => {
			if (hookData.section !== 'body') return;
			const task = tasks[hookData.row.index];
			// Erledigtes tritt zurück, statt zu verschwinden — wie die
			// durchgestrichene Zeile am Bildschirm.
			if (task?.done) hookData.cell.styles.textColor = [...POSTER_COLOR.tinteSoft];
			// Eine Aufgabe ohne Zeit steht am Ende ihrer Gruppe und sagt es leise.
			if (hookData.column.index === 1 && !task?.time) {
				hookData.cell.styles.font = POSTER_FONT.body;
				hookData.cell.styles.fontSize = 7;
			}
		},
		didDrawCell: (hookData) => {
			if (hookData.section !== 'body' || hookData.column.index !== 0) return;
			const task = tasks[hookData.row.index];
			if (!task) return;
			drawCheckbox(doc, {
				x: hookData.cell.x + (hookData.cell.width - CHECKBOX_SIZE) / 2,
				y: hookData.cell.y + 1.2,
				size: CHECKBOX_SIZE,
				done: task.done
			});
		}
	});
	return posterTableEnd(doc) + 4;
}

/** Baut die Aufgabenliste als Plakat; das Speichern macht {@link exportTaskListToPdf}. */
export function buildTaskListPdf({ festivalName, worklist }: TaskListExportOptions): jsPDF {
	const doc = createPosterDoc({ orientation: 'portrait' });
	let y = drawPosterHead(doc, {
		title: festivalName,
		subtitle: TASK_TITLE,
		// Der Kopf sagt, wonach gefiltert war — sonst behauptet das Blatt, es sei
		// der ganze Ablaufplan (#126).
		note: worklist.caption
	});

	for (const day of worklist.days) {
		y = breakIfTight(doc, y, 30);
		y =
			drawSectionHeading(doc, {
				x: POSTER_MARGIN,
				y: y + 2,
				width: contentWidth(doc),
				label: day.title,
				note: worklistDayNote(day),
				accent: true,
				tone: 'gruen'
			}) + 2;

		for (const group of day.groups) {
			// Aufgaben ohne Phase stehen direkt unter dem Tag, ohne Ersatztitel
			// (ADR 0007).
			if (group.phase) {
				y = breakIfTight(doc, y, 20);
				y = drawPhaseHeading(doc, group, y);
			}
			y = drawTaskRows(doc, group.tasks, y);
		}

		y += 3;
	}

	if (worklist.days.length === 0) {
		doc.setFontSize(9);
		setPosterInk(doc, POSTER_COLOR.tinteSoft);
		doc.text(
			worklist.counts.all === 0
				? 'Noch keine Aufgabe erfasst.'
				: 'Keine Aufgabe passt zu diesem Filter.',
			POSTER_MARGIN,
			y + 3
		);
		setPosterInk(doc, POSTER_COLOR.tinte);
		y += 8;
	}

	// Dieselben drei Zahlen wie am Fuß der Werkliste — sie zählen den
	// Gesamtbestand des Fests, nicht die gedruckten Zeilen.
	y = breakIfTight(doc, y, 6);
	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(8.5);
	setPosterInk(doc, POSTER_COLOR.tinteSoft);
	doc.text(
		`${worklist.footer.openBefore} offen vor dem Fest · ${worklist.footer.openAfter} in der Nachbereitung · ${worklist.counts.done} von ${worklist.counts.all} erledigt`,
		POSTER_MARGIN,
		y + 3
	);
	setPosterInk(doc, POSTER_COLOR.tinte);

	drawPosterFooter(doc, `${festivalName} — ${TASK_TITLE}`);
	return doc;
}

/** Lädt die Aufgabenliste als PDF herunter. */
export function exportTaskListToPdf(options: TaskListExportOptions): void {
	buildTaskListPdf(options).save(`${sanitizeFilename(options.festivalName)}_${TASK_TITLE}.pdf`);
}
