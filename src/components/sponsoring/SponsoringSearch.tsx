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
 * Suchfeld „Firma suchen …" der Sponsoring-Werkzeugleiste, so beschriftet wie
 * in der abgenommenen Variante C (`design-vision/bereich-sponsoring-faecher.html`,
 * Werkzeugleiste) — der §5-Abschnitt der DESIGN-VISION nennt nur die Matrix.
 *
 * Zähler und Rücksetzen erscheinen erst mit einem Suchbegriff: sie sollen
 * zeigen, dass ein Filter **aktiv** ist (#151), nicht als ständiges Beiwerk
 * dastehen — wie viele Sponsoren das Fest hat, sagt der Bereichskopf.
 * Gefiltert wird hier nichts; das rechnet `sponsoringTotals`.
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
		{searchTerm.trim() !== '' && (
			<>
				<span className="whitespace-nowrap text-xs font-bold uppercase tracking-[.06em] text-tinte-soft">
					{shown} von {total}
				</span>
				<button
					type="button"
					onClick={onReset}
					aria-label="Suche zurücksetzen"
					className="text-tinte-soft hover:text-tinte">
					<X className="h-4 w-4" />
				</button>
			</>
		)}
	</div>
);

export default SponsoringSearch;
