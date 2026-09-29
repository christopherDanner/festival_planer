/** Der Zustand der **Zuteil-Geste** im Schichtplan (#104) als Store ohne React
— Store-Muster wie der `materialCellEditor`: subscribe/getState, damit die
Regeln ohne Browser prüfbar bleiben.

Er hält, was zwischen Aufnehmen und Absetzen einer Marke gilt: welche Marke
gewählt ist (Antippen-Paar), welche am Zeiger hängt (HTML5-DnD), welches Ziel
gerade überfahren wird und welche Zeile rot pulst. Geprüft und gerechnet wird
nicht hier, sondern in `shiftAssignment` — beide Wege fragen dieselbe Regel, und
genau darum führen sie zum selben Ergebnis. */

import {
	checkAssignment,
	targetKey,
	type AssignSource,
	type AssignTarget,
	type RejectReason
} from '@/lib/shiftAssignment';
import type { Helper } from '@/lib/helperService';

/** Die abgelehnte Zeile samt Grund. `nonce` zählt die Ablehnungen hoch: wird
dieselbe Zeile zweimal hintereinander abgelehnt, wechselt sonst kein Wert, und
die Animation spränge nicht noch einmal an. */
export interface Rejection {
	rowKey: string;
	reason: RejectReason;
	kind: AssignTarget['kind'];
	nonce: number;
}

export interface AssignmentPickerSnapshot {
	/** Die gewählte Marke — gelb mit Versatz-Schatten. */
	picked: Helper | null;
	/** Die Marke am Zeiger. Sie wird nicht gelb: sie hängt sichtbar am Cursor. */
	dragged: Helper | null;
	/**
	 * **Scharf**: eine Marke ist gewählt, also werden *alle* freien Plätze zum
	 * Ziel. Das ist die eigentliche Orientierungshilfe (Entscheid 8 aus #68) —
	 * beim Ziehen zeigt stattdessen `overKey` auf das eine Ziel unter dem Zeiger.
	 */
	armed: boolean;
	/** Der Schlüssel der überfahrenen Zeile, die das Gezogene annähme. */
	overKey: string | null;
	/** Die Zeile, die gerade rot pulst — statt eines Toasts (#104). */
	rejected: Rejection | null;
}

export interface CreateAssignmentPickerOpts {
	/**
	 * Schreibt die Zuteilung weg. Wird nur gerufen, wenn `checkAssignment`
	 * zustimmt; `position` ist `null`, wo es keine Platznummern gibt.
	 */
	onAssign: (target: AssignTarget, helperId: string, position: number | null) => void;
	/**
	 * Die Listen, gegen die geprüft wird — als **Geber**, weil der Store über
	 * Renderzyklen hinweg lebt und zwischen Aufnehmen und Absetzen einer Marke
	 * nachgeladen worden sein kann.
	 */
	source: () => AssignSource;
	/** Wie lange der Rot-Puls steht (DESIGN-VISION §4: 0,5 s). */
	pulseMs?: number;
}

export interface AssignmentPicker {
	/** Antippen einer Marke — noch einmal dieselbe heißt „doch nicht". */
	pick: (helper: Helper) => void;
	/** „Abbrechen" — die einzige andere Art, die Auswahl loszuwerden. */
	cancel: () => void;
	dragStart: (helper: Helper) => void;
	/** Räumt **immer** auf, auch wenn außerhalb jedes Ziels losgelassen wurde. */
	dragEnd: () => void;
	/**
	 * Der Zeiger steht über einem Ziel. Nimmt es an, hebt es sich hervor und die
	 * Antwort ist `true` — **nur dann** darf `dragover` `preventDefault`en, sonst
	 * sagt der Cursor die Unwahrheit (#104).
	 */
	dragOver: (target: AssignTarget) => boolean;
	dragLeave: (target: AssignTarget) => void;
	/** Der eine Griff beider Wege: angetippter Platz **und** Fallenlassen. */
	assign: (target: AssignTarget) => void;
	getState: () => AssignmentPickerSnapshot;
	subscribe: (listener: () => void) => () => void;
}

const DEFAULT_PULSE_MS = 500;

export function createAssignmentPicker(opts: CreateAssignmentPickerOpts): AssignmentPicker {
	const pulseMs = opts.pulseMs ?? DEFAULT_PULSE_MS;
	const listeners = new Set<() => void>();
	let picked: Helper | null = null;
	let dragged: Helper | null = null;
	let overKey: string | null = null;
	let rejected: Rejection | null = null;
	let nonce = 0;
	let cached: AssignmentPickerSnapshot | null = null;

	function notify() {
		cached = null;
		for (const listener of listeners) listener();
	}

	/** Wer in der Hand ist: beim Ziehen die gezogene Marke, sonst die gewählte. */
	function inHand(): Helper | null {
		return dragged ?? picked;
	}

	return {
		pick(helper) {
			picked = picked?.id === helper.id ? null : helper;
			notify();
		},
		cancel() {
			picked = null;
			notify();
		},
		dragStart(helper) {
			dragged = helper;
			notify();
		},
		dragEnd() {
			dragged = null;
			overKey = null;
			notify();
		},
		dragOver(target) {
			// Ohne gezogene Marke ist nichts zu übernehmen: ein bloßer Klick auf eine
			// Zeile soll sie nicht hervorheben.
			if (!dragged || checkAssignment(target, dragged.id, opts.source()).outcome !== 'ok') {
				return false;
			}
			const key = targetKey(target);
			if (overKey !== key) {
				overKey = key;
				notify();
			}
			return true;
		},
		dragLeave(target) {
			if (overKey !== targetKey(target)) return;
			overKey = null;
			notify();
		},
		assign(target) {
			const helper = inHand();
			if (!helper) return;

			const verdict = checkAssignment(target, helper.id, opts.source());
			if (verdict.outcome === 'ok') {
				opts.onAssign(target, helper.id, verdict.position);
				picked = null;
				rejected = null;
				notify();
				return;
			}

			// Die Auswahl **bleibt**: der Grund steht am Ort, und wer daneben
			// gegriffen hat, soll den nächsten Platz antippen können, ohne die Marke
			// noch einmal zu suchen.
			rejected = {
				rowKey: targetKey(target),
				reason: verdict.reason,
				kind: target.kind,
				nonce: ++nonce
			};
			// Nur der eigene Puls wird abgeräumt: ein zweiter, der inzwischen
			// angesprungen ist, hat seinen eigenen Wecker.
			const mine = nonce;
			setTimeout(() => {
				if (rejected?.nonce !== mine) return;
				rejected = null;
				notify();
			}, pulseMs);
			notify();
		},
		getState() {
			if (cached) return cached;
			cached = { picked, dragged, armed: picked !== null, overKey, rejected };
			return cached;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
	};
}
