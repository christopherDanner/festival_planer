import React from 'react';

import { Button } from '@/components/ui/button';
import { Toolbar, ToolbarMetric } from '@/components/toolkit/Toolbar';
import type { TaskFilter } from '@/lib/scheduleWorklist';

export interface ScheduleToolbarProps {
	/** Der Gesamtbestand an Aufgaben — dieselben Zahlen wie in den Segmenten. */
	counts: Record<TaskFilter, number>;
	onAddTask: () => void;
	onAddProgram: () => void;
	onExportProgram: () => void;
	onExportTasks: () => void;
}

/** Tippziele ≥ 40px am Handy (DESIGN-VISION §6); `size="sm"` ist 36px hoch. */
const GRIFF = 'text-[12.5px] max-[899px]:min-h-10';

/**
 * Werkzeugleiste des Ablaufplans (#122):
 * `[AUFGABEN 8/20 ▬▬▬] [+ AUFGABE] [+ PROGRAMMPUNKT] [PROGRAMMZETTEL] [AUFGABENLISTE]`.
 *
 * Sie löst den alten Kopf mit „+ Tag" und „Export" ab. Tage und Phasen werden
 * ab #124 an ihren eigenen Zwischentiteln verwaltet — an der Leiste hätte ein
 * „+ TAG" mehr Gewicht als die Aufgabe, um die es hier geht.
 */
const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
	counts,
	onAddTask,
	onAddProgram,
	onExportProgram,
	onExportTasks
}) => (
	<Toolbar>
		<ToolbarMetric
			label="Aufgaben"
			value={counts.done}
			max={counts.all}
			valueText={`${counts.done} von ${counts.all} erledigt`}
		/>
		<Button size="sm" className={GRIFF} onClick={onAddTask}>
			+ AUFGABE
		</Button>
		<Button variant="outline" size="sm" className={GRIFF} onClick={onAddProgram}>
			+ PROGRAMMPUNKT
		</Button>
		{/* Die zwei Papiere, zwei Exporte (#126) — leise gesetzt, sie sind der
		letzte Schritt und nicht die Arbeit. */}
		<Button variant="ghost" size="sm" className={`${GRIFF} text-tinte-soft`} onClick={onExportProgram}>
			PROGRAMMZETTEL
		</Button>
		<Button variant="ghost" size="sm" className={`${GRIFF} text-tinte-soft`} onClick={onExportTasks}>
			AUFGABENLISTE
		</Button>
	</Toolbar>
);

export default ScheduleToolbar;
