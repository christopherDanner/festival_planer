import { ArrowDown, ArrowUp, ListPlus, Plus } from 'lucide-react';

import { ActionMenu } from '@/components/toolkit/ActionMenu';
import { canMovePhase, type PhaseDirection } from '@/lib/schedulePhaseOrder';
import type { SchedulePhase } from '@/lib/scheduleService';

/** Die vier Griffe am Tages-Zwischentitel (#124). */
export interface DayHeadingActions {
	onEdit: () => void;
	onAddPhase: () => void;
	onAddTask: () => void;
	onDelete: () => void;
}

export interface DayHeadingMenuProps {
	/** Die Aufschrift des Tages, wie sie im Zwischentitel steht. */
	title: string;
	actions: DayHeadingActions;
}

/**
 * Das ⋮ am **Tages-Zwischentitel**: Tag bearbeiten · Phase hinzufügen ·
 * Aufgabe hinzufügen · Tag löschen (#124).
 *
 * Die Rückfrage benennt die Tragweite, weil der Tag kaskadiert — Phasen und
 * Einträge gehen mit (ADR 0007). Dass sie ein restylter Radix-Dialog ist und
 * kein `window.confirm`, bringt `ActionMenu` mit (ADR 0003).
 */
export function DayHeadingMenu({ title, actions }: DayHeadingMenuProps) {
	return (
		<ActionMenu
			menuLabel={`Menü des Tages ${title}`}
			editLabel="Tag bearbeiten …"
			items={[
				{ label: 'Phase hinzufügen …', icon: ListPlus, onSelect: actions.onAddPhase },
				{ label: 'Aufgabe hinzufügen …', icon: Plus, onSelect: actions.onAddTask }
			]}
			deleteLabel="Tag löschen"
			confirmTitle="Tag löschen"
			confirmMessage={`„${title}": Tag und alle Phasen und Einträge wirklich löschen?`}
			onEdit={actions.onEdit}
			onDelete={actions.onDelete}
			className="h-9 w-9 shrink-0"
		/>
	);
}

/** Die vier Griffe am Phasen-Zwischentitel (#124). */
export interface PhaseHeadingActions {
	onRename: () => void;
	onMove: (direction: PhaseDirection) => void;
	onDelete: () => void;
}

export interface PhaseHeadingMenuProps {
	phase: SchedulePhase;
	/** Alle Phasen des Tages — sie entscheiden, ob „nach oben" noch etwas
	 * bewirkt. */
	phases: SchedulePhase[];
	actions: PhaseHeadingActions;
}

/**
 * Das ⋮ am **Phasen-Zwischentitel**: umbenennen · nach oben / nach unten ·
 * löschen (#124). Verschoben wird von Hand, weil eine Phase keine Uhrzeit
 * trägt (ADR 0007); am Rand der Reihe stehen die beiden Griffe grau.
 *
 * Die Rückfrage nennt die Kaskade: die Geste heißt „dieser Block fällt aus".
 */
export function PhaseHeadingMenu({ phase, phases, actions }: PhaseHeadingMenuProps) {
	return (
		<ActionMenu
			menuLabel={`Menü der Phase ${phase.name}`}
			editLabel="Phase umbenennen …"
			items={[
				{
					label: 'Nach oben',
					icon: ArrowUp,
					onSelect: () => actions.onMove('up'),
					disabled: !canMovePhase(phases, phase.id, 'up')
				},
				{
					label: 'Nach unten',
					icon: ArrowDown,
					onSelect: () => actions.onMove('down'),
					disabled: !canMovePhase(phases, phase.id, 'down')
				}
			]}
			deleteLabel="Phase löschen"
			confirmTitle="Phase löschen"
			confirmMessage={`„${phase.name}": Phase und alle zugehörigen Einträge wirklich löschen?`}
			onEdit={actions.onRename}
			onDelete={actions.onDelete}
			className="h-8 w-8 shrink-0"
		/>
	);
}
