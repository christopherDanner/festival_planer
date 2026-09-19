import React, { type ElementType } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	FOCUS_INK,
	PaperSheet,
	PaperSheetField,
	PaperSheetFields
} from '@/components/toolkit/PaperSheet';
import type { AutoAssignScope } from '@/lib/autoAssignScope';
import type { AutoAssignmentConfig } from '@/lib/automaticAssignmentService';

/** Ein Hinweiszettel auf dem Papier: 2px Tinte, links die breite Kante. */
const NOTE = 'border-2 border-l-[7px] border-tinte bg-papier px-3 py-2 text-xs leading-relaxed';

export interface AutoAssignZettelProps {
	/** Worüber dieser Lauf geht — Titel, Lösch-Knopf und Zahl (`autoAssignScope`). */
	scope: AutoAssignScope;
	config: AutoAssignmentConfig;
	onConfigChange: (patch: Partial<AutoAssignmentConfig>) => void;
	onAssign: () => void;
	/** Stößt die **Rückfrage** an; gelöscht wird erst nach der Bestätigung. */
	onClearRequest: () => void;
	onCancel: () => void;
	isLoading: boolean;
	/** Der Radix-Dialog reicht hier seinen `DialogTitle` durch; alleinstehend
	 * (Schaukasten, Test) bleibt es eine gewöhnliche Überschrift. */
	TitleTag?: ElementType;
}

/**
 * Der Zettel der Auto-Zuteilung (#108) in der Plakat-Optik des Positions-
 * Dialogs (#117): Papier-Grund, grüner Halftone-Kopf mit dem Umfang als
 * Aufschrift, zwei Regler mit 2px-Tinte-Rahmen und Versalien-Kleinlabel,
 * darunter der Erklärtext auf Papier statt auf `bg-muted` (Vision §4).
 *
 * Die Fußleiste stellt das Zerstörerische **ab**: der rote Lösch-Knopf steht
 * links, Rückweg und gelbe Primäraktion rechts. Vorher saß er direkt neben
 * „Abbrechen" — ein Klick daneben löschte die Schichtplanung des ganzen Fests.
 *
 * Der Zettel ist gesteuert und löscht nichts selbst: `onClearRequest` stößt nur
 * die Rückfrage an.
 */
const AutoAssignZettel: React.FC<AutoAssignZettelProps> = ({
	scope,
	config,
	onConfigChange,
	onAssign,
	onClearRequest,
	onCancel,
	isLoading,
	TitleTag
}) => (
	<PaperSheet
		title={scope.title}
		TitleTag={TitleTag}
		onClose={onCancel}
		footer={
			<>
				<Button
					data-auto="loeschen"
					variant="destructive"
					className={cn('mr-auto', FOCUS_INK)}
					disabled={scope.clearCount === 0}
					onClick={onClearRequest}>
					{scope.clearLabel}
				</Button>
				<Button variant="outline" className={FOCUS_INK} onClick={onCancel}>
					Abbrechen
				</Button>
				<Button
					data-auto="zuteilen"
					className={FOCUS_INK}
					disabled={isLoading}
					onClick={onAssign}>
					{isLoading ? 'Zuteilen...' : 'Automatisch zuteilen'}
				</Button>
			</>
		}>
		<PaperSheetFields>
			{scope.station && (
				<p className={cn(NOTE, 'min-[900px]:col-span-2')}>
					Zugeteilt wird nur in <b>{scope.station.name}</b>. Die zwei Regler zählen trotzdem die
					Schichten im <b>ganzen Fest</b> mit — sonst sammelte jemand in fünf Stationen je drei
					Schichten.
				</p>
			)}

			<PaperSheetField label="Min. Schichten pro Person" htmlFor="auto-min-shifts">
				<Input
					id="auto-min-shifts"
					type="number"
					min="0"
					className={cn('text-right tabular-nums', FOCUS_INK)}
					value={config.minShiftsPerHelper}
					onChange={(e) =>
						onConfigChange({ minShiftsPerHelper: parseInt(e.target.value) || 0 })
					}
				/>
			</PaperSheetField>

			<PaperSheetField label="Max. Schichten pro Person" htmlFor="auto-max-shifts">
				<Input
					id="auto-max-shifts"
					type="number"
					min="1"
					className={cn('text-right tabular-nums', FOCUS_INK)}
					value={config.maxShiftsPerHelper}
					onChange={(e) =>
						onConfigChange({ maxShiftsPerHelper: parseInt(e.target.value) || 1 })
					}
				/>
			</PaperSheetField>

			<p className={cn(NOTE, 'min-[900px]:col-span-2')}>
				Die automatische Zuteilung berücksichtigt nur Stationen, die den jeweiligen Schichten
				zugewiesen wurden. Helfer mit Stationswünschen werden bevorzugt zugewiesen, solange
				Schichten in ihren Wunschstationen frei sind. Die Schichten werden gleichmäßig verteilt.
			</p>
		</PaperSheetFields>
	</PaperSheet>
);

export default AutoAssignZettel;
