import React from 'react';

import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { festYear } from '@/lib/festDates';
import type { Festival } from '@/lib/festivalService';

export interface HandoverSourceBarProps {
	/** Die wählbaren Quellfeste (`sourceFestivalOptions`), jüngstes zuerst. */
	sources: Festival[];
	sourceId: string | null;
	onSourceChange: (id: string) => void;
	/** Das Fest der Route — Aufschrift, kein Feld. */
	targetName: string;
}

/** „Musikfest Steinbach · 2025" — das Jahr trennt die Jahrgänge desselben Fests. */
function festivalLabel(festival: Festival): string {
	return `${festival.name || 'Unbenanntes Fest'} · ${festYear(festival.start_date)}`;
}

/**
 * Die Fest-Zeile der Übernahme (#118): **Quellfest wählbar, Zielfest fest.**
 *
 * Das Zielfest ist das Fest der Route und steht hier nur als Aufschrift — wer
 * im Material-Tab von Fest X sitzt, soll nicht die Mengen von Fest Y bearbeiten
 * können (`CONTEXT.md`: „Zielfest — das aktuelle Fest in der Material-Liste").
 */
const HandoverSourceBar: React.FC<HandoverSourceBarProps> = ({
	sources,
	sourceId,
	onSourceChange,
	targetName
}) => {
	const selected = sources.find((f) => f.id === sourceId) ?? null;

	return (
		<div className="flex flex-wrap items-end gap-x-3 gap-y-2.5 border-2.5 border-tinte bg-white px-4 py-3">
			<div className="min-w-[220px] flex-1 min-[900px]:flex-none">
				<Label htmlFor="handover-source" variant="kleinlabel" className="mb-1 block">
					Quellfest
				</Label>
				<Select value={selected?.id ?? ''} onValueChange={onSourceChange}>
					<SelectTrigger
						id="handover-source"
						className={`h-10 border-2 border-tinte bg-white text-[13px] font-bold text-tinte ${FOCUS_INK}`}>
						<SelectValue placeholder="Quellfest auswählen …">
							{selected ? festivalLabel(selected) : null}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{sources.map((festival) => (
							<SelectItem key={festival.id} value={festival.id}>
								{festivalLabel(festival)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<span aria-hidden className="pb-1.5 font-display text-xl leading-none text-gruen">
				→
			</span>

			<div className="min-w-[220px] flex-1 min-[900px]:flex-none">
				<Label variant="kleinlabel" className="mb-1 block">
					Zielfest
				</Label>
				{/* Kein Feld: das Zielfest steht in der Route und ist unveränderlich (#118). */}
				<p className="flex h-10 items-center border-2 border-linie bg-papier-getoent px-3 text-[13px] font-bold text-tinte">
					{targetName}
				</p>
			</div>

			<p className="ml-auto max-w-[30rem] text-[11.5px] text-tinte-soft">
				Wunschmenge tippen — speichert automatisch. Positionen, die es im Zielfest noch nicht gibt,
				werden angelegt.
			</p>
		</div>
	);
};

export default HandoverSourceBar;
