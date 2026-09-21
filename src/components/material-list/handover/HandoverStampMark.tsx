import React from 'react';

import { Stamp, type StampProps } from '@/components/toolkit/Stamp';
import type { HandoverStamp, HandoverStampKind } from '@/lib/materialHandover';

export interface HandoverStampMarkProps {
	stamp: HandoverStamp;
	/** Nur beim Fehler-Stempel benutzt: er ist dann der Knopf zum Wiederholen. */
	onRetry?: () => void;
}

/** Wie jeder Zustand auf dem Papier aussieht. Aufrecht (`tilt="none"`), weil ein
gekippter Stempel in einer Tabellenzeile die Zeilenhöhe sprengt. */
const LOOKS: Record<HandoverStampKind, Pick<StampProps, 'tone' | 'filled' | 'className'>> = {
	saved: { tone: 'green' },
	saving: { tone: 'ink' },
	error: { tone: 'red', filled: true },
	new: { tone: 'green', filled: true },
	skip: { tone: 'ink', className: 'border-dashed border-tinte-soft text-tinte-soft' },
	pending: { tone: 'ink', className: 'border-dashed' }
};

/**
 * Der Auto-Save-Stempel einer Übernahme-Zeile in Plakat-Optik (#118) — er
 * ersetzt Spinner, Haken und Warndreieck der alten Maske. Was er sagt,
 * entscheidet `handoverStamp`; gespeichert wird weiterhin im
 * `materialSaveOrchestrator`.
 */
const HandoverStampMark: React.FC<HandoverStampMarkProps> = ({ stamp, onRetry }) => {
	const mark = (
		<Stamp size="sm" tilt="none" {...LOOKS[stamp.kind]}>
			{stamp.label}
		</Stamp>
	);

	// Der Fehler ist der einzige Zustand, aus dem man herauskommt — also ist er
	// auch der einzige, der ein Bedienelement ist.
	if (stamp.kind !== 'error' || !onRetry) return mark;

	return (
		<button
			type="button"
			onClick={onRetry}
			aria-label="Speichern wiederholen"
			title={`${stamp.error ?? 'Speichern fehlgeschlagen'} — klicken, um es noch einmal zu versuchen`}
			className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte">
			{mark}
		</button>
	);
};

export default HandoverStampMark;
