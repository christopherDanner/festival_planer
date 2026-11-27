/** Die Regeln des **Zuteilens** im Schichtplan (#104): wohin ein Helfer darf,
auf welche Platznummer er kommt und warum er abgelehnt wird.

Ein Modul, weil Ziehen und Antippen „zum selben Ergebnis" führen müssen — zwei
Wege, die je ihre eigene Prüfung mitbringen, driften auseinander, sobald einer
von beiden angefasst wird. Reines Logikmodul ohne React; den Zustand der Geste
(gewählte Marke, überfahrenes Ziel, Rot-Puls) hält `shiftAssignmentPicker`. */

import type {
	ShiftAssignment,
	StationHelper,
	StationShift
} from '@/lib/shiftService';

/**
 * Wohin ein Helfer gesetzt wird. Die beiden Fälle sind die zwei
 * Besetzungs-Ebenen des Datenmodells: ein nummerierter Platz in einer Schicht
 * oder die Mitgliedschaft in einer Station (Entscheid 1 aus #68).
 */
export type AssignTarget =
	| { kind: 'shift'; shiftId: string }
	| { kind: 'station'; stationId: string };

/**
 * Warum eine Zuteilung abgelehnt wird. Die ersten beiden sind die **fachlichen**
 * Ablehnungen: sie melden sich als 0,5-s-Rot-Puls am Ziel, nicht als Toast — der
 * Grund ist am Ort selbsterklärend (#104). `gone` kann nur eintreten, wenn die
 * Schicht zwischen Anzeige und Griff verschwunden ist; dann gibt es auch keine
 * Zeile mehr, an der etwas pulsen könnte.
 */
export type RejectReason = 'full' | 'duplicate' | 'gone';

/**
 * Das Urteil über einen Zuteilungs-Versuch. `position` ist die Platznummer in
 * der Schicht — `null` bei einer Stationsmitgliedschaft, die keine führt.
 *
 * Die Fälle heißen `'ok'` und `'rejected'` und nicht `ok: true | false`: das
 * Projekt läuft ohne `strictNullChecks`, und dort verengt ein boolescher
 * Unterscheider die Union nicht — jeder Zugriff auf `reason` wäre ein Fehler.
 * Dieselbe Regel wie beim `DialogState` des Schichtplans.
 */
export type AssignVerdict =
	| { outcome: 'ok'; position: number | null }
	| { outcome: 'rejected'; reason: RejectReason };

/** Die Listen, gegen die geprüft wird — der Stand **im Augenblick des Griffs**,
nicht der beim Aufnehmen der Marke. */
export interface AssignSource {
	stationShifts: StationShift[];
	assignments: ShiftAssignment[];
	stationHelpers: StationHelper[];
}

/**
 * Der Schlüssel eines Ziels — zugleich die Kennung der Zeile, an der es im
 * Fokus-Kasten hängt (`BoardRow.id`). Scharfer Zustand, Ziel-Hervorhebung und
 * Rot-Puls merken sich diesen einen String; dass er aus dem Ziel selbst fällt,
 * hält beide Seiten zusammen.
 */
export function targetKey(target: AssignTarget): string {
	return target.kind === 'shift' ? target.shiftId : `station:${target.stationId}`;
}

/**
 * Darf dieser Helfer auf dieses Ziel? Die eine Prüfung für beide Wege —
 * Fallenlassen und Antippen fragen sie, darum führen sie zum selben Ergebnis.
 *
 * Steht der Helfer schon drin, ist **das** die Antwort, auch wenn die Schicht
 * ohnehin voll ist: „schon drin" erklärt, warum gerade *dieser* Helfer nicht
 * geht. Die Stationsmitgliedschaft kennt kein Soll, das sie ablehnen könnte —
 * ihre einzige Ablehnung ist die Doppelung.
 */
export function checkAssignment(
	target: AssignTarget,
	helperId: string,
	source: AssignSource
): AssignVerdict {
	if (target.kind === 'station') {
		const members = source.stationHelpers.filter((m) => m.station_id === target.stationId);
		if (members.some((m) => m.helper_id === helperId)) {
			return { outcome: 'rejected', reason: 'duplicate' };
		}
		return { outcome: 'ok', position: null };
	}

	const shift = source.stationShifts.find((s) => s.id === target.shiftId);
	if (!shift) return { outcome: 'rejected', reason: 'gone' };

	const taken = source.assignments.filter((a) => a.station_shift_id === shift.id);
	if (taken.some((a) => a.helper_id === helperId)) {
		return { outcome: 'rejected', reason: 'duplicate' };
	}
	if (taken.length >= shift.required_people) return { outcome: 'rejected', reason: 'full' };
	return { outcome: 'ok', position: nextFreePosition(taken) };
}

/**
 * Der Wortlaut einer Ablehnung. Der Rot-Puls ist für das Auge; diesen Satz
 * bekommt, wer ihn nicht sieht — er steht als `role="status"` am Ziel, nicht
 * als Toast (Research #54: Status per `aria-live` ansagen).
 */
export function rejectText(reason: RejectReason, kind: AssignTarget['kind']): string {
	const ort = kind === 'shift' ? 'Schicht' : 'Station';
	if (reason === 'full') return `Diese ${ort} ist bereits vollständig besetzt.`;
	if (reason === 'duplicate') return `Dieser Helfer steht schon in dieser ${ort}.`;
	return `Diese ${ort} gibt es nicht mehr.`;
}

/** Die kleinste freie Platznummer einer Schicht, 1-basiert. Lücken werden
gefüllt: wer Platz 2 verlässt, hinterlässt eine 2, keine 4. */
export function nextFreePosition(assignments: { position: number }[]): number {
	const used = assignments.map((a) => a.position).sort((a, b) => a - b);
	let next = 1;
	for (const position of used) {
		if (next === position) next++;
		else break;
	}
	return next;
}
