/** Der Schichtplan als Text — was der Teilen-Dialog in die Zwischenablage legt
und was WhatsApp weiterträgt (#109).

Gegliedert wird nicht hier, sondern in `shiftBoard`: **Station → Tag → Schicht →
Plätze**, in der Reihenfolge des Reiter-Streifens. Bildschirm, Papier und diese
Nachricht zeigen dadurch dasselbe Fest in derselben Ordnung; wer den Ausdruck
neben die Werkbank legt, findet sich zurecht. Dieses Modul setzt nur den
Wortlaut. */

import {
	buildStationBoards,
	slotLabel,
	stationMetaText,
	type BoardRow,
	type ShiftPlanSource,
	type StationBoard
} from '@/lib/shiftBoard';
import { helperName, type Helper } from '@/lib/helperService';

export interface ShiftPlanTextData extends ShiftPlanSource {
	festivalName: string;
	festivalDate: string;
}

/** Die Kopfzeile eines Stations-Blocks: `=== AUSSCHANK ===`. */
function stationHeading(board: StationBoard): string {
	return `=== ${board.station.name.toUpperCase()} ===`;
}

/** „Zelt Nord · Leitung: Hochauer Franz · 1/4 besetzt" — dieselben Angaben wie
der grüne Kopf des Fokus-Kastens. */
function stationMeta(board: StationBoard): string {
	return [stationMetaText(board), `${board.assigned}/${board.required} besetzt`]
		.filter(Boolean)
		.join(' · ');
}

/** „11–15 · Frühschoppen · 2 Plätze" — Zeit und Aufschrift der Werkbank-Zeile. */
function rowHeading(row: BoardRow): string {
	return `${row.time} · ${row.subtitle}`;
}

/** Die Plätze einer Zeile, eingerückt und durchnummeriert wie das Platz-Raster. */
function slotLines(row: BoardRow): string[] {
	return row.slots.map((slot) => `  ${slotLabel(slot)}`);
}

/** Die Zeilen eines Stations-Blocks, nach Tagen gegliedert. */
function boardLines(board: StationBoard): string[] {
	const lines: string[] = [stationHeading(board), stationMeta(board)];

	for (const day of board.days) {
		lines.push('', day.title);
		for (const row of day.rows) {
			lines.push(rowHeading(row), ...slotLines(row));
		}
	}

	if (board.wholeFestRow) {
		lines.push('', rowHeading(board.wholeFestRow), ...slotLines(board.wholeFestRow));
	}

	if (board.members.length > 0) {
		lines.push('', `Ohne Schicht: ${board.members.map((m) => m.name).join(', ')}`);
	}

	return lines;
}

/** Der ganze Plan als Nachricht. */
export function fullPlanText(data: ShiftPlanTextData): string {
	const lines = ['SCHICHTPLAN', data.festivalName, data.festivalDate];
	const boards = buildStationBoards(data);

	if (boards.length === 0) {
		lines.push('', 'Noch keine Station angelegt.');
	}
	for (const board of boards) {
		lines.push('', ...boardLines(board));
	}

	return lines.join('\n').trim();
}

/** Wo eine Person in einer Station steht: ihre Schichten je Tag und, wenn sie
ohne Schicht dabei ist, die Mitgliedschaft selbst. */
function helperBoardLines(board: StationBoard, helperId: string): { lines: string[]; count: number } {
	const lines: string[] = [];
	let count = 0;

	for (const day of board.days) {
		const rows = day.rows.filter((row) => row.slots.some((slot) => slot.helperId === helperId));
		if (rows.length === 0) continue;
		lines.push(day.title, ...rows.map(rowHeading));
		count += rows.length;
	}

	// Mit Schichten steht die Mitgliedschaft in der Fußzeile, ohne Schichten im
	// Platz-Raster — beide Male ist es dieselbe Aussage. Sie heißt hier bloß
	// „Stationsmitglied": wer zusätzlich Schichten hat, stünde sonst unter
	// seinen eigenen Zeiten als „ohne Schicht" da.
	const isMember =
		board.members.some((m) => m.helperId === helperId) ||
		Boolean(board.wholeFestRow?.slots.some((slot) => slot.helperId === helperId));
	if (isMember) {
		lines.push('Stationsmitglied');
		count += 1;
	}

	return { lines, count };
}

/** Der Plan einer einzelnen Person — dieselbe Gliederung, nur ihre Zeilen. */
export function helperPlanText(data: ShiftPlanTextData, helper: Helper): string {
	const lines = [
		'EINSATZPLAN',
		helperName(helper),
		`${data.festivalName} · ${data.festivalDate}`
	];
	let total = 0;

	for (const board of buildStationBoards(data)) {
		const { lines: own, count } = helperBoardLines(board, helper.id);
		if (count === 0) continue;
		lines.push('', stationHeading(board), ...own);
		total += count;
	}

	lines.push('', total === 0 ? 'Keine Zuweisungen.' : `Gesamt: ${total} ${total === 1 ? 'Zuweisung' : 'Zuweisungen'}`);
	return lines.join('\n').trim();
}
