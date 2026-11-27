/** Die Reihenfolge der Phasen eines Ablauf-Tags (#124).

Einträge reiht die Uhrzeit, Phasen die Hand — sie tragen keine Uhrzeit
(ADR 0007). Das ⋮ am Phasen-Zwischentitel schiebt sie um genau einen Platz;
hier steht, ob das noch geht und was danach gilt. `reorderSchedulePhases`
schreibt das Ergebnis weg. */

import type { SchedulePhase } from '@/lib/scheduleService';

export type PhaseDirection = 'up' | 'down';

/** Die geschriebene Reihenfolge: je Phase ihr neuer Platz. */
export interface PhaseOrder {
	id: string;
	sort_order: number;
}

/** Der Platz, auf den die Phase ziehen würde — `-1`, wenn es keinen gibt. */
function targetIndex(
	phases: SchedulePhase[],
	phaseId: string,
	direction: PhaseDirection
): number {
	const index = phases.findIndex((phase) => phase.id === phaseId);
	if (index === -1) return -1;
	const target = direction === 'up' ? index - 1 : index + 1;
	return target >= 0 && target < phases.length ? target : -1;
}

/** Ob der Griff im Menü etwas bewirken kann — am Rand der Reihe steht er grau. */
export function canMovePhase(
	phases: SchedulePhase[],
	phaseId: string,
	direction: PhaseDirection
): boolean {
	return targetIndex(phases, phaseId, direction) !== -1;
}

/**
 * Die Phase um einen Platz schieben und die ganze Reihe neu durchnummerieren —
 * `[]`, wo nichts zu schieben ist.
 *
 * Durchnummeriert wird lückenlos ab 0, auch wo die gespeicherten Werte
 * doppelt oder krumm sind: `getScheduleDays` sortiert nach `sort_order`, und
 * zwei Phasen mit derselben Zahl stünden sonst in beliebiger Reihenfolge.
 */
export function movePhase(
	phases: SchedulePhase[],
	phaseId: string,
	direction: PhaseDirection
): PhaseOrder[] {
	const target = targetIndex(phases, phaseId, direction);
	if (target === -1) return [];

	const index = phases.findIndex((phase) => phase.id === phaseId);
	const reihe = [...phases];
	[reihe[index], reihe[target]] = [reihe[target], reihe[index]];

	return reihe.map((phase, sort_order) => ({ id: phase.id, sort_order }));
}
