import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface SponsoringSearchProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	onReset: () => void;
	/** Sichtbare Firmen — die Zeilen, über die der Tabellenfuß rechnet. */
	shown: number;
	/** Firmen des Fests insgesamt. */
	total: number;
}

/**
 * Suchfeld „Firma suchen …" der Sponsoring-Werkzeugleiste (DESIGN-VISION §5).
 *
 * Trägt den Trefferzähler und das Rücksetzen, damit ein aktiver Filter nicht
 * nur am Tabellenfuß zu sehen ist (#151). Gefiltert wird nichts hier —
 * gerechnet und gefiltert wird in `sponsoringTotals`.
 */
const SponsoringSearch: React.FC<SponsoringSearchProps> = ({
	searchTerm,
	onSearchChange,
	onReset,
	shown,
	total
}) => (
	<div className="flex items-center gap-2">
		<div className="relative min-w-0 flex-1 sm:flex-none sm:basis-[220px]">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinte-soft" />
			<Input
				value={searchTerm}
				onChange={(e) => onSearchChange(e.target.value)}
				placeholder="Firma suchen …"
				aria-label="Firma suchen"
				className="h-9 pl-9 text-[13px]"
			/>
		</div>
		<span className="whitespace-nowrap text-xs font-bold uppercase tracking-[.06em] text-tinte-soft">
			{shown} von {total}
		</span>
		{searchTerm.trim() !== '' && (
			<button
				type="button"
				onClick={onReset}
				aria-label="Suche zurücksetzen"
				className="text-tinte-soft hover:text-tinte">
				<X className="h-4 w-4" />
			</button>
		)}
	</div>
);

export default SponsoringSearch;
