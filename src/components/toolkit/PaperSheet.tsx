import { type ElementType, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

import { Poster } from './Poster';

/**
 * Fokus als 2px-Tinte-Outline mit Versatz (DESIGN-VISION §6, in #117 am
 * Positions-Dialog festgelegt). Die Shell-Bausteine bringen einen Ring mit;
 * der wird damit abgeschaltet, damit nicht beides übereinander liegt. Zustände
 * als Tailwind-Utilities sind der von ADR 0003 §2 vorgesehene Ort; die Ringe
 * der Hüllen repo-weit auf Outline zu drehen wäre ein eigenes Ticket.
 */
export const FOCUS_INK =
	'focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 ' +
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte';

export interface PaperSheetProps {
	/** Titel im Plakat-Kopf; wird in der Akzentschrift und Versalien gesetzt. */
	title: ReactNode;
	/** Der Radix-Dialog reicht hier seinen `DialogTitle` durch; alleinstehend
	 * (Schaukasten, Test) bleibt es eine gewöhnliche Überschrift. */
	TitleTag?: ElementType;
	/** Rückweg im Kopf als gelber Knopf; ohne Handler bleibt der Kopf leer. */
	onClose?: () => void;
	/** Wortlaut des Kopf-Knopfs. */
	closeLabel?: string;
	/** Klebende Fußleiste, üblich die Knöpfe der Handlung. */
	footer?: ReactNode;
	children: ReactNode;
	className?: string;
}

/**
 * PaperSheet — der Rahmen eines Dialog-Papiers: Papier-Grund, 3px-Tinte-Rahmen,
 * Versatz-Schatten, grüner Halftone-Kopf mit Akzentschrift-Titel und gelbem
 * Knopf, darunter der Inhalt und eine klebende Fußleiste. In der Vision heißt
 * dieses Papier „Zettel" (Prototyp `.dlg`); der Baustein trägt nach ADR 0003 §4
 * den englischen Namen.
 *
 * Die Maße wurden in #117 am Positions-Dialog festgelegt; seit #119 liegt der
 * Rahmen an *einer* Stelle, damit Positions- und Export-Dialoge dasselbe Papier
 * bedrucken.
 */
export function PaperSheet({
	title,
	TitleTag = 'h2',
	onClose,
	closeLabel = 'Schließen',
	footer,
	children,
	className
}: PaperSheetProps) {
	return (
		<div
			className={cn(
				'max-h-[88vh] w-full overflow-y-auto border-3 border-tinte bg-papier shadow-versatz',
				className
			)}>
			<Poster className="sticky top-0 z-10 flex items-center gap-3 border-0 border-b-2 px-4 py-2.5">
				<TitleTag className="font-display text-[17px] font-semibold uppercase tracking-[.02em]">
					{title}
				</TitleTag>
				{onClose && (
					// Gelber Knopf auf dem Plakat-Kopf — gleiches Rezept wie
					// „+ POSITION FÜR …" im Gruppen-Kasten (#113).
					<button
						type="button"
						onClick={onClose}
						className={cn(
							'ml-auto bg-gelb px-3 py-1.5 text-[12.5px] font-bold uppercase tracking-[.02em] text-tinte',
							'max-[899px]:min-h-10',
							// Papier statt Tinte: auf der grünen Kopffläche wäre eine
							// Tinte-Outline kaum zu sehen.
							'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papier'
						)}>
						{closeLabel}
					</button>
				)}
			</Poster>

			{children}

			{footer && (
				<div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t-2 border-tinte bg-white px-4 py-3">
					{footer}
				</div>
			)}
		</div>
	);
}

/**
 * Das Feldraster des Papiers: eine Spalte am Handy, zwei ab 900px. Es steht
 * hier und nicht bei den Aufrufern, weil `wide` von genau diesem Raster
 * abhängt — sonst wäre die Zusammenarbeit der beiden ein stiller Vertrag.
 */
export function PaperSheetFields({
	children,
	className
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn('grid grid-cols-1 gap-3.5 px-4 py-4 min-[900px]:grid-cols-2', className)}>
			{children}
		</div>
	);
}

export interface PaperSheetFieldProps {
	label: ReactNode;
	htmlFor?: string;
	hint?: ReactNode;
	/** Über beide Spalten von `PaperSheetFields`. */
	wide?: boolean;
	children: ReactNode;
}

/**
 * Eine Feldzeile des Papiers: Versalien-Kleinlabel (Public Sans 800,
 * letter-spacing .06em) über dem Baustein, darunter optional ein Hinweis.
 */
export function PaperSheetField({ label, htmlFor, hint, wide, children }: PaperSheetFieldProps) {
	return (
		<div className={cn('flex flex-col gap-1', wide && 'min-[900px]:col-span-2')}>
			<Label htmlFor={htmlFor} variant="kleinlabel">
				{label}
			</Label>
			{children}
			{hint && <span className="text-[10.5px] leading-snug text-tinte-soft">{hint}</span>}
		</div>
	);
}
