import { type CSSProperties } from 'react';

import { filterSponsors, type Sponsor } from '@/lib/sponsorService';
import SponsorsEmptyState from './SponsorsEmptyState';
import SponsorsMast from './SponsorsMast';
import SponsorsTable from './SponsorsTable';
import SponsorsToolbar from './SponsorsToolbar';

/**
 * Höhe der klebenden Werkzeugleiste am Desktop. Steht hier einmal und geht
 * als CSS-Variable an beide: die Leiste setzt darauf ihre Höhe, der
 * Tabellenkopf klebt genau darunter.
 */
const TOOLBAR_HEIGHT_PX = 59;

export interface SponsorsViewProps {
	/** Der ganze Sponsorenbestand, alphabetisch (so liefert ihn `getSponsors`). */
	sponsors: Sponsor[];
	searchTerm: string;
	onSearchChange: (value: string) => void;
	/** Kompakt-Mast unter 900px. */
	compact?: boolean;
	onOpenFestivalList: () => void;
	onAddSponsor: () => void;
	onSignOut: () => void;
	onSelectSponsor: (sponsor: Sponsor) => void;
}

/**
 * Die Sponsoren-Stammdaten als Ganzes: Mast, klebende Werkzeugleiste und
 * darunter entweder der Frachtbrief oder — bei leerem Bestand — der
 * Leerzustand. Ohne Datenzugriff, damit die Zusammensetzung prüfbar bleibt.
 */
export default function SponsorsView({
	sponsors,
	searchTerm,
	onSearchChange,
	compact,
	onOpenFestivalList,
	onAddSponsor,
	onSignOut,
	onSelectSponsor
}: SponsorsViewProps) {
	const matches = filterSponsors(sponsors, searchTerm);

	return (
		<div
			style={{ '--sponsors-toolbar-h': `${TOOLBAR_HEIGHT_PX}px` } as CSSProperties}>
			<SponsorsMast
				sponsorCount={sponsors.length}
				compact={compact}
				onOpenFestivalList={onOpenFestivalList}
				onAddSponsor={onAddSponsor}
				onSignOut={onSignOut}
			/>
			<SponsorsToolbar
				searchTerm={searchTerm}
				onSearchChange={onSearchChange}
				shown={matches.length}
				total={sponsors.length}
			/>
			{sponsors.length === 0 ? (
				<SponsorsEmptyState onAddSponsor={onAddSponsor} />
			) : (
				<SponsorsTable sponsors={matches} onSelect={onSelectSponsor} />
			)}
		</div>
	);
}
