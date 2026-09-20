import React from 'react';
import { Package } from 'lucide-react';

import { formatAmount } from '@/lib/money';
import { sumTotals } from '@/lib/materialCosts';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

import MaterialCard from './MaterialCard';
import MaterialCardFooterBar from './MaterialCardFooterBar';
import type { MaterialCardDrafts } from './hooks/useMaterialCardDrafts';

export interface MaterialCardListProps {
	materials: FestivalMaterialWithStation[];
	/** Station als eigene Angabe — im Stations-Kasten wäre sie redundant (#113). */
	showStation: boolean;
	cards: MaterialCardDrafts;
	/** ⋮ → Stammdaten-Dialog (#117). */
	onEdit: (material: FestivalMaterialWithStation) => void;
	onCopy: (material: FestivalMaterialWithStation) => void;
	onDelete: (id: string) => void;
}

/**
 * Die Positionen eines Gruppen-Kastens am Handy (#116): **gestapelte Karten**
 * statt der querscrollenden Tabelle aus #114, darunter dieselbe Zwischensumme,
 * die der Tabellenfuß am Desktop trägt, und die Sammel-Fußleiste des
 * Zeilenmodus.
 */
const MaterialCardList: React.FC<MaterialCardListProps> = ({
	materials,
	showStation,
	cards,
	onEdit,
	onCopy,
	onDelete
}) => {
	if (materials.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 border border-dashed border-linie py-12">
				<Package className="h-8 w-8 text-tinte-soft/40" />
				<p className="text-sm text-tinte-soft">Keine Materialien vorhanden</p>
			</div>
		);
	}

	return (
		<div className="space-y-2 p-2">
			{materials.map((m) => (
				<MaterialCard
					key={m.id}
					material={m}
					showStation={showStation}
					draft={cards.drafts[m.id] ?? null}
					onStartEdit={() => cards.start(m)}
					onDraftChange={(field, value) => cards.change(m.id, field, value)}
					onSave={() => cards.save(m.id)}
					onCancel={() => cards.cancel(m.id)}
					onEdit={() => onEdit(m)}
					onCopy={() => onCopy(m)}
					onDelete={() => onDelete(m.id)}
				/>
			))}

			{/* Gleiche Beschriftung wie der Tabellenfuß am Desktop — dieselbe Zahl
			darf nicht zwei Namen haben (ADR 0006). */}
			<div className="flex items-baseline justify-between gap-3 border-t-2 border-tinte bg-fusszeile px-3 py-2.5">
				<span className="text-[12px] font-extrabold uppercase tracking-[.05em]">
					Zwischensumme (gefiltert)
				</span>
				<span className="font-display text-[15px] font-semibold tabular-nums">
					{formatAmount(sumTotals(materials))}
				</span>
			</div>

			<MaterialCardFooterBar
				open={cards.summary.open}
				dirty={cards.summary.dirty}
				onSaveAll={cards.saveAll}
				onDiscardAll={cards.discardAll}
			/>
		</div>
	);
};

export default MaterialCardList;
