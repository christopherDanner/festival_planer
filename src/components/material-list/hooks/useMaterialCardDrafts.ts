import { useState } from 'react';

import {
	draftsSummary,
	editRowDraft,
	rowDraftUpdates,
	startRowDraft,
	type RowDraft,
	type RowDraftUpdates,
	type RowField
} from '@/lib/materialRowEdit';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

/** Eine offene Karte: ihr Entwurf und die Position, aus der er stammt. Die
Position reist mit, damit „geändert" auch dann noch beantwortbar ist, wenn die
Karte aus der sichtbaren Liste gefiltert wurde. */
interface OpenCard {
	draft: RowDraft;
	row: FestivalMaterialWithStation;
}

export interface MaterialCardDrafts {
	/** Entwurf je Positions-Id; fehlt einer, liest die Karte nur. */
	drafts: Record<string, RowDraft>;
	/** Die Zahlen der Sammel-Fußleiste. */
	summary: { open: number; dirty: number };
	start: (material: FestivalMaterialWithStation) => void;
	change: (id: string, field: RowField, value: string) => void;
	save: (id: string) => void;
	cancel: (id: string) => void;
	saveAll: () => void;
	discardAll: () => void;
	/**
	 * Ein Umschalten (Achse, Gruppe) versuchen: geänderte Karten führen erst zur
	 * Rückfrage, statt still verworfen zu werden (#115).
	 */
	attempt: (action: () => void) => void;
	/** Steht die Rückfrage? */
	asking: boolean;
	confirmSave: () => void;
	confirmDiscard: () => void;
	dismiss: () => void;
}

/**
 * Die offenen Karten des Zeilenmodus am Handy (#116): welche Karte offen ist,
 * was in ihr steht und was beim Umschalten mit ungespeicherten Karten passiert.
 *
 * Die Regeln selbst stehen in `materialRowEdit` — dieser Haken hält nur den
 * Zustand und reicht Gespeichertes nach draußen. Er sitzt in der Arbeitsliste
 * und nicht in der Kartenliste, weil Achsen-Umschalter und Gruppen-Schublade
 * über ihm stehen und durch dieselbe Rückfrage müssen.
 */
export function useMaterialCardDrafts(
	onSave: (id: string, updates: RowDraftUpdates) => void
): MaterialCardDrafts {
	const [open, setOpen] = useState<Record<string, OpenCard>>({});
	// Das Umschalten, das auf die Antwort wartet. `null` heißt: keine Rückfrage.
	const [pending, setPending] = useState<(() => void) | null>(null);

	const drafts = Object.fromEntries(
		Object.entries(open).map(([id, card]) => [id, card.draft])
	);
	const summary = draftsSummary(Object.values(open));

	const saveCard = (card: OpenCard) => onSave(card.row.id, rowDraftUpdates(card.draft, card.row));

	const saveAll = () => {
		Object.values(open).forEach(saveCard);
		setOpen({});
	};

	const discardAll = () => setOpen({});

	const run = (action: (() => void) | null) => {
		setPending(null);
		action?.();
	};

	return {
		drafts,
		summary,
		start: (material) =>
			setOpen((prev) => ({ ...prev, [material.id]: { draft: startRowDraft(material), row: material } })),
		change: (id, field, value) =>
			setOpen((prev) =>
				prev[id] ? { ...prev, [id]: { ...prev[id], draft: editRowDraft(prev[id].draft, field, value) } } : prev
			),
		save: (id) => {
			const card = open[id];
			if (card) saveCard(card);
			setOpen(({ [id]: _closed, ...rest }) => rest);
		},
		cancel: (id) => setOpen(({ [id]: _closed, ...rest }) => rest),
		saveAll,
		discardAll,
		attempt: (action) => {
			// Unberührte Karten haben nichts zu verlieren — sie schließen einfach mit.
			if (summary.dirty === 0) {
				discardAll();
				action();
				return;
			}
			setPending(() => action);
		},
		asking: pending !== null,
		confirmSave: () => {
			saveAll();
			run(pending);
		},
		confirmDiscard: () => {
			discardAll();
			run(pending);
		},
		dismiss: () => setPending(null)
	};
}
