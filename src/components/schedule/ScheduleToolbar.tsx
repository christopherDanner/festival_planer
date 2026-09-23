import React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Ruler } from '@/components/toolkit/Ruler';
import type { TaskFilter } from '@/lib/scheduleWorklist';

export interface ScheduleToolbarProps {
	/** Der Gesamtbestand an Aufgaben — dieselben Zahlen wie in den Segmenten. */
	counts: Record<TaskFilter, number>;
	onAddTask: () => void;
	onAddProgram: () => void;
	onExportProgram: () => void;
	onExportTasks: () => void;
}

/**
 * Werkzeugleiste des Ablaufplans (#122):
 * `[AUFGABEN 8/20 ▬▬▬] [+ AUFGABE] [+ PROGRAMMPUNKT] [PROGRAMMZETTEL] [AUFGABENLISTE]`.
 *
 * Sie löst den alten Kopf mit „+ Tag" und „Export" ab. Tage und Phasen werden
 * ab #124 an ihren eigenen Zwischentiteln verwaltet — an der Leiste hätte ein
 * „+ TAG" mehr Gewicht als die Aufgabe, um die es hier geht.
 *
 * Gebaut wie die Werkzeugleiste des Schichtplans (#102): gleicher Rahmen,
 * gleiche Ampel am Wert, damit die beiden Bereiche dieselbe Leiste tragen.
 */
const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
	counts,
	onAddTask,
	onAddProgram,
	onExportProgram,
	onExportTasks
}) => (
	<div className="flex flex-wrap items-center gap-3 border-2.5 border-tinte bg-white px-3 py-2.5 min-[900px]:gap-3.5 min-[900px]:px-4">
		<div className="flex min-w-[250px] flex-1 items-center gap-2.5">
			<b className="whitespace-nowrap text-xs font-bold uppercase tracking-[.06em]">Aufgaben</b>
			<span
				className={cn(
					'whitespace-nowrap font-display text-base font-semibold tabular-nums tracking-[.02em]',
					// Ampel am Wert wie im Schichtplan: rot solange etwas offen ist,
					// grün wenn alles abgehakt ist. Die Zwischenstufe trägt das Maßband.
					counts.open > 0 ? 'text-rot' : 'text-gruen'
				)}
			>
				{counts.done}/{counts.all}
			</span>
			<Ruler
				value={counts.done}
				max={counts.all}
				valueText={`${counts.done} von ${counts.all} erledigt`}
				className="min-w-[90px] flex-1"
			/>
		</div>
		{/* Tippziele ≥ 40px am Handy (DESIGN-VISION §6); `size="sm"` ist 36px hoch. */}
		<Button size="sm" className="text-[12.5px] max-[899px]:min-h-10" onClick={onAddTask}>
			+ AUFGABE
		</Button>
		<Button
			variant="outline"
			size="sm"
			className="text-[12.5px] max-[899px]:min-h-10"
			onClick={onAddProgram}
		>
			+ PROGRAMMPUNKT
		</Button>
		{/* Die zwei Papiere, zwei Exporte (#126) — leise gesetzt, sie sind der
		letzte Schritt und nicht die Arbeit. */}
		<Button
			variant="ghost"
			size="sm"
			className="text-[12.5px] text-tinte-soft max-[899px]:min-h-10"
			onClick={onExportProgram}
		>
			PROGRAMMZETTEL
		</Button>
		<Button
			variant="ghost"
			size="sm"
			className="text-[12.5px] text-tinte-soft max-[899px]:min-h-10"
			onClick={onExportTasks}
		>
			AUFGABENLISTE
		</Button>
	</div>
);

export default ScheduleToolbar;
