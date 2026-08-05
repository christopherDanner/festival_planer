import { filterSponsors, type Sponsor } from '@/lib/sponsorService';
import SponsorsEmptyState from './SponsorsEmptyState';
import SponsorsMast from './SponsorsMast';
import SponsorTable from './SponsorTable';
import SponsorsToolbar, { WERKLEISTE_HOEHE_PX } from './SponsorsToolbar';

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
	const treffer = filterSponsors(sponsors, searchTerm);
	const bestandLeer = sponsors.length === 0;

	return (
		<>
			<SponsorsMast
				sponsorCount={sponsors.length}
				compact={compact}
				onOpenFestivalList={onOpenFestivalList}
				onAddSponsor={onAddSponsor}
				onSignOut={onSignOut}
			/>
			{bestandLeer ? (
				<SponsorsEmptyState onAddSponsor={onAddSponsor} />
			) : (
				<>
					<SponsorsToolbar
						searchTerm={searchTerm}
						onSearchChange={onSearchChange}
						shown={treffer.length}
						total={sponsors.length}
					/>
					<SponsorTable
						sponsors={treffer}
						headerOffsetPx={WERKLEISTE_HOEHE_PX}
						onSelect={onSelectSponsor}
					/>
				</>
			)}
		</>
	);
}
