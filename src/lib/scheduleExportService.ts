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
	posterTableEnd,
	posterTableTheme,
	setPosterInk
} from '@/lib/pdfPoster';
import type { ProgramSheet, ProgramSheetRow } from '@/lib/scheduleProgramSheet';
import {
	worklistDayNote,
	worklistEmptyText,
	type Worklist,
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

/**
 * Eine leise Zeile in Tinte-soft — Leerzustände, Zählungen, Fortsetzungen.
 * Beide Papiere sprechen ihre Nebensätze so.
 *
 * @returns y-Kante unter der Zeile.
 */
function drawQuietLine(doc: jsPDF, text: string, y: number, align: 'left' | 'right' = 'left'): number {
	doc.setFont(POSTER_FONT.body, 'normal');
	doc.setFontSize(8.5);
	setPosterInk(doc, POSTER_COLOR.tinteSoft);
	doc.text(text, align === 'right' ? POSTER_MARGIN + contentWidth(doc) : POSTER_MARGIN, y + 3, {
		align
	});
	setPosterInk(doc, POSTER_COLOR.tinte);
	return y + 6;
}

/**
 * Der Zwischentitel eines Ablauf-Tags, auf beiden Papieren derselbe: Oswald in
 * Grün mit gepunktetem Lineal, davor ein Seitenumbruch, wenn der Titel sonst
 * allein am Fuß stünde.
 *
 * @returns y-Kante unter dem Titel.
 */
function drawDayHeading(doc: jsPDF, day: { title: string; note?: string }, y: number): number {
	const top = breakIfTight(doc, y, 24);
	return (
		drawSectionHeading(doc, {
			x: POSTER_MARGIN,
			y: top + 2,
			width: contentWidth(doc),
			label: day.title,
			note: day.note,
			variant: 'day'
		}) + 2
	);
}

// ── Programmzettel ────────────────────────────────────────────

/** Wie das Papier heißt — in der Fußzeile und im Dateinamen (CONTEXT.md). */
const PROGRAM_PAPER = 'Programmzettel';

/** Was im Kopf steht: die Aufschrift des Aushangs, wie am Bildschirm (#123). */
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
		y = drawDayHeading(doc, day, y);

		for (const row of day.rows) {
			y = drawProgramRow(doc, row, y);
		}

		y += 4;
	}

	if (sheet.days.length === 0) {
		// Der Bildschirm sagt hier, wo der erste Punkt entsteht — auf Papier führt
		// kein Knopf mehr irgendwohin.
		y = drawQuietLine(doc, 'Noch kein Programmpunkt erfasst.', y + 2);
	}

	// Die Anzahl steht am Fuß, leise — wie am Bildschirm. Ein Stempel wäre die
	// lautere Geste und gehört dort keinem Punkt.
	y = breakIfTight(doc, y, 6);
	drawQuietLine(doc, sheet.count === 1 ? '1 Punkt' : `${sheet.count} Punkte`, y, 'right');

	drawPosterFooter(doc, `${festivalName} — ${PROGRAM_PAPER}`);
	return doc;
}

/** Lädt den Programmzettel als PDF herunter. */
export function exportProgramSheetToPdf(options: ProgramSheetExportOptions): void {
	buildProgramSheetPdf(options).save(
		`${sanitizeFilename(options.festivalName)}_${PROGRAM_PAPER}.pdf`
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
function drawPhaseHeading(doc: jsPDF, phase: string, note: string, y: number): number {
	const top = breakIfTight(doc, y, 20);

	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(8);
	setPosterInk(doc, POSTER_COLOR.tinteSoft);
	doc.text(phase.toUpperCase(), POSTER_MARGIN, top + 3);
	doc.text(note, POSTER_MARGIN + contentWidth(doc), top + 3, { align: 'right' });

	setPosterInk(doc, POSTER_COLOR.tinte);
	return top + 5;
}

/**
 * Die Aufgaben eines Blocks als Frachtbrief-Tabelle: Kästchen, Uhrzeit, Titel,
 * Verantwortlicher — die vier Spalten, die die Spec aufzählt. Die leise
 * Subzeile der Werkliste bleibt weg: sie ist die Notiz zur Aufgabe, und auf
 * einem Arbeitszettel zählt die Zeile, die man abhakt.
 *
 * @param continued Tag und Phase in Worten — sie stehen oben auf jeder
 * Folgeseite noch einmal, sonst hängen die Aufgaben dort ohne Zuordnung.
 *
 * @returns y-Kante unter der Tabelle.
 */
function drawTaskRows(
	doc: jsPDF,
	tasks: WorklistTask[],
	continued: string,
	startY: number
): number {
	const theme = posterTableTheme();
	autoTable(doc, {
		...theme,
		startY,
		margin: {
			left: POSTER_MARGIN,
			right: POSTER_MARGIN,
			// Platz für die Fortsetzungszeile am Kopf der Folgeseiten.
			top: POSTER_MARGIN + 6,
			bottom: FOOTER_SPACE
		},
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
		},
		didDrawPage: (hookData) => {
			// Der Spaltenkopf wiederholt sich von selbst, der Tages- und
			// Phasentitel nicht — ohne diese Zeile stünden die Aufgaben auf der
			// Folgeseite ohne Zuordnung.
			if (hookData.pageNumber > 1) drawQuietLine(doc, `${continued} (Fortsetzung)`, POSTER_MARGIN - 3);
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
		y = drawDayHeading(doc, { title: day.title, note: worklistDayNote(day) }, y);

		for (const group of day.groups) {
			// Aufgaben ohne Phase stehen direkt unter dem Tag, ohne Ersatztitel
			// (ADR 0007).
			if (group.phase) {
				y = drawPhaseHeading(doc, group.phase.name, `${group.done}/${group.total}`, y);
			}
			y = drawTaskRows(
				doc,
				group.tasks,
				group.phase ? `${day.title} · ${group.phase.name}` : day.title,
				y
			);
		}

		y += 3;
	}

	// Derselbe Satz wie am Bildschirm, wenn nichts übrig bleibt.
	if (worklist.days.length === 0) {
		y = drawQuietLine(doc, worklistEmptyText(worklist), y + 2);
	}

	// Dieselben drei Zahlen wie am Fuß der Werkliste — sie zählen den
	// Gesamtbestand des Fests, nicht die gedruckten Zeilen.
	y = breakIfTight(doc, y, 6);
	drawQuietLine(
		doc,
		`${worklist.footer.openBefore} offen vor dem Fest · ${worklist.footer.openAfter} in der Nachbereitung · ${worklist.counts.done} von ${worklist.counts.all} erledigt`,
		y
	);

	drawPosterFooter(doc, `${festivalName} — ${TASK_TITLE}`);
	return doc;
}

/** Lädt die Aufgabenliste als PDF herunter. */
export function exportTaskListToPdf(options: TaskListExportOptions): void {
	buildTaskListPdf(options).save(`${sanitizeFilename(options.festivalName)}_${TASK_TITLE}.pdf`);
}
