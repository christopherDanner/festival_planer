import React from 'react';

import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { cn } from '@/lib/utils';

export interface RowEditBulkBarProps {
	/** Offene Zeilen des Kastens. */
	open: number;
	/** Davon geänderte — nur sie schreibt das Speichern weg. */
	dirty: number;
	onSaveAll: () => void;
	onCancelAll: () => void;
}

const BULK_BUTTON = cn(
	'border-2 border-tinte px-3 py-1.5 text-[12.5px] font-bold uppercase tracking-[.02em] text-tinte max-[899px]:min-h-10',
	FOCUS_INK
);

/**
 * Sammel-Fußleiste des Zeilenmodus (#115): `3 Zeilen offen, davon 2 geändert
 * [ALLE VERWERFEN] [ALLE 3 SPEICHERN]`.
 *
 * Sie deckt den Rechnungs-Fall — eine Lieferantenrechnung, viele Zeilen, ein
 * Durchgang — und klebt darum am unteren Rand: beim Nachtragen der
 * Verbraucht-Mengen (real 76 Positionen) scrollt die Tabelle, nicht der Knopf.
 *
 * Ohne offene Zeile bleibt sie stehen und erklärt den Weg hinein. Das ist
 * Absicht: eine Leiste, die kommt und geht, schöbe bei jedem ✎ alles unter ihr
 * um ihre Höhe — dieselbe Auflage, die die Zeilen auf 56 px hält (#114).
 */
const RowEditBulkBar: React.FC<RowEditBulkBarProps> = ({ open, dirty, onSaveAll, onCancelAll }) => {
	if (open === 0) {
		return (
			<div className="sticky bottom-0 z-20 border-t-2 border-tinte bg-white px-4 py-2.5 text-[12.5px] text-tinte-soft">
				Keine Zeile in Bearbeitung — ✎ in einer Zeile öffnet Mengen &amp; Preise. Mehrere Zeilen
				gleichzeitig möglich.
			</div>
		);
	}

	return (
		<div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-t-2 border-tinte bg-gelb px-4 py-2 text-[12.5px] text-tinte">
			<span>
				<b className="font-display text-base font-semibold tabular-nums">{open}</b>{' '}
				{open === 1 ? 'Zeile' : 'Zeilen'} offen
				{dirty > 0 && (
					<>
						, davon <b className="tabular-nums">{dirty} geändert</b>
					</>
				)}
			</span>
			<span className="ml-auto flex flex-wrap gap-2">
				<button type="button" onClick={onCancelAll} className={cn(BULK_BUTTON, 'bg-white')}>
					ALLE VERWERFEN
				</button>
				<button type="button" onClick={onSaveAll} className={cn(BULK_BUTTON, 'bg-white')}>
					ALLE {open} SPEICHERN
				</button>
			</span>
		</div>
	);
};

export default RowEditBulkBar;
