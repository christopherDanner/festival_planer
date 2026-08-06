import React from 'react';

import { formatEuro } from '@/lib/money';
import { consumedValue, orderedValue, withoutPrice, type MaterialPosition } from '@/lib/materialCosts';

export interface MaterialTotalsProps {
	/** Die sichtbaren (gesuchten) Positionen — über die wird gerechnet. */
	materials: MaterialPosition[];
	/** Positionen des Fests insgesamt; weicht sie ab, sagt der Kopf „gefiltert". */
	totalCount: number;
}

/**
 * Bereichskopf der Materialliste (#113): **zwei Zahlen** — Bestellwert und
 * Verbrauchswert, gleich definiert wie die zwei Dashboard-Kästen, damit die
 * Zahlen bereichsübergreifend zusammenpassen (ADR 0006). Gerechnet wird in
 * `materialCosts`, hier steht keine Geldformel.
 *
 * Beide rechnen über die sichtbaren Positionen (Vision §5) — filtert die Suche,
 * sagt die Beschriftung es.
 */
const MaterialTotals: React.FC<MaterialTotalsProps> = ({ materials, totalCount }) => {
	const isEmpty = materials.length === 0;
	const gaps = withoutPrice(materials);
	const filtered = materials.length !== totalCount;

	return (
		<div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-2.5 border-tinte bg-white px-4 py-3">
			<Zahl label={filtered ? 'Bestellt € (gefiltert)' : 'Bestellt €'}>
				{isEmpty ? '—' : formatEuro(orderedValue(materials))}
			</Zahl>
			<Zahl label={filtered ? 'Verbraucht € (gefiltert)' : 'Verbraucht €'}>
				{isEmpty ? '—' : formatEuro(consumedValue(materials))}
			</Zahl>
			<p className="text-[11.5px] text-tinte-soft">
				{isEmpty ? (
					'Noch keine Positionen'
				) : (
					<>
						{filtered
							? `${materials.length} von ${totalCount} Positionen`
							: `${materials.length} ${materials.length === 1 ? 'Position' : 'Positionen'}`}
						{gaps > 0 && (
							<>
								{' · '}
								<span className="font-bold text-rot">{gaps} ohne Preis</span>
							</>
						)}
					</>
				)}
			</p>
		</div>
	);
};

const Zahl: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
	<div>
		<p className="text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
			{label}
		</p>
		<p className="font-display text-[22px] font-semibold leading-none tabular-nums text-gruen">
			{children}
		</p>
	</div>
);

export default MaterialTotals;
