import { Poster } from '@/components/toolkit/Poster';
import { cn } from '@/lib/utils';

import type { KopierwerkStep, KopierwerkStepState } from './kopierwerk';

/**
 * Ein Eintrag der Stempelkarte — ein `KopierwerkStep`, dessen Schlüssel hier
 * nur noch `string` ist: die Karte zählt die Liste, die sie bekommt, und weiß
 * nicht, welche Schritte es gibt. Sponsoring als Schritt 4 (#63) ist darum ein
 * Eintrag mehr, kein Umbau hier.
 */
export interface StampCardStep extends Omit<KopierwerkStep, 'key'> {
	key: string;
}

export interface StampCardProps {
	steps: StampCardStep[];
	/** Karten-Kopf: geplanter Festname + Zeitraum/Vorlagen-Zeile. */
	heading: { title: string; sub: string };
	/** <900px: klebende waagrechte Schritt-Leiste unter dem Mast statt der Spalte. */
	compact: boolean;
}

/**
 * Stempelkarte des Kopierwerks (#93, Master-Prototyp `.kcard`): ab 900px die
 * klebende linke Spalte mit grünem Kopf, darunter die Schritte mit
 * Untertitel-Zeile. Unter 900px fällt der Kopf weg und die Schritte legen sich
 * als klebende, waagrecht scrollbare Leiste unter den Mast (DESIGN-VISION §6 —
 * ein Breakpoint).
 */
export default function StampCard({ steps, heading, compact }: StampCardProps) {
	if (compact) {
		return (
			// border-t-0 setzt den Rahmen des Masts nach unten fort: Mast und Leiste
			// lesen sich als ein Stück Papier.
			<ol className="sticky top-0 z-20 flex overflow-x-auto border-2.5 border-t-0 border-tinte bg-white">
				{steps.map((step) => (
					<li
						key={step.key}
						className={cn(
							'flex flex-none items-center gap-1.5 whitespace-nowrap border-r border-r-linie px-3 py-2.5 text-[12px] font-bold last:border-r-0',
							stepTone(step.state)
						)}>
						<StepMark step={step} compact />
						{step.shortTitle}
					</li>
				))}
			</ol>
		);
	}

	return (
		<aside className="sticky top-3 border-2.5 border-tinte bg-white">
			<Poster className="border-0 border-b-2 px-3.5 py-2.5">
				<h3 className="font-display text-[15px] font-semibold uppercase tracking-[.03em]">
					{heading.title}
				</h3>
				{heading.sub && (
					<div className="mt-0.5 text-[11px] text-kreide">{heading.sub}</div>
				)}
			</Poster>
			<ol>
				{steps.map((step) => (
					<li
						key={step.key}
						className={cn(
							// Die linke Kante trägt die Marke des aktiven Schritts; sie liegt auf
							// jedem Eintrag, damit das Gelb die Zeile nicht verschiebt.
							'flex items-center gap-2.5 border-b border-l-4 border-b-linie px-3.5 py-2.5 text-[12.5px] font-bold last:border-b-0',
							stepTone(step.state)
						)}>
						<StepMark step={step} />
						<span className="min-w-0">
							{step.title}
							{step.subtitle && (
								<span className="block text-[10.5px] font-semibold text-tinte-soft">
									{step.subtitle}
								</span>
							)}
						</span>
					</li>
				))}
			</ol>
		</aside>
	);
}

/** Erledigt grün, aktiv gelb hinterlegt mit Tinte-Kante, offen grau. */
function stepTone(state: KopierwerkStepState): string {
	if (state === 'done') return 'border-l-transparent text-gruen';
	if (state === 'active') return 'border-l-tinte bg-gelb text-tinte';
	return 'border-l-transparent text-tinte-soft';
}

/** Nummern-Kästchen des Eintrags; erledigte Schritte tragen stattdessen das Häkchen. */
function StepMark({ step, compact }: { step: StampCardStep; compact?: boolean }) {
	const done = step.state === 'done';
	return (
		<span
			className={cn(
				'font-display flex flex-none items-center justify-center border-2 text-[12px]',
				compact ? 'h-5 w-5' : 'h-6 w-6',
				done ? 'border-gruen bg-gruen text-white' : 'border-tinte text-tinte'
			)}>
			{done ? '✓' : step.number}
		</span>
	);
}
