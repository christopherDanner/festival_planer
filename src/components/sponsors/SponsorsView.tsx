import { type CSSProperties } from 'react';

import {
	countSponsorSegments,
	filterSponsorsBySegment,
	type SponsorHistoryMap,
	type SponsorSegment
} from '@/lib/sponsorHistory';
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
	/** Sponsoren-Historie je Firma, in einem Zug geladen (`getSponsorHistory`). */
	history: SponsorHistoryMap;
	/** Jahr des Bezugsfests; null zwischen zwei Festen — dann entfällt „heuer". */
	referenceYear: number | null;
	searchTerm: string;
	onSearchChange: (value: string) => void;
	segment: SponsorSegment;
	onSegmentChange: (segment: SponsorSegment) => void;
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
 *
 * Suche und Segment filtern hintereinander: die Zähler am Schalter zählen
 * über die Treffer der Suche und sagen damit voraus, was ein Klick zeigt.
 * Die Zählzeile im Mast bleibt dagegen der ganze Bestand.
 */
export default function SponsorsView({
	sponsors,
	history,
	referenceYear,
	searchTerm,
	onSearchChange,
	segment,
	onSegmentChange,
	compact,
	onOpenFestivalList,
	onAddSponsor,
	onSignOut,
	onSelectSponsor
}: SponsorsViewProps) {
	const matches = filterSponsors(sponsors, searchTerm);
	const shown = filterSponsorsBySegment(matches, history, segment);

	return (
		<div
			style={{ '--sponsors-toolbar-h': `${TOOLBAR_HEIGHT_PX}px` } as CSSProperties}>
			<SponsorsMast
				sponsorCount={sponsors.length}
				sponsoringCount={countSponsorSegments(sponsors, history).sponsert}
				referenceYear={referenceYear}
				compact={compact}
				onOpenFestivalList={onOpenFestivalList}
				onAddSponsor={onAddSponsor}
				onSignOut={onSignOut}
			/>
			<SponsorsToolbar
				searchTerm={searchTerm}
				onSearchChange={onSearchChange}
				shown={shown.length}
				total={sponsors.length}
				segment={segment}
				onSegmentChange={onSegmentChange}
				segmentCounts={countSponsorSegments(matches, history)}
				referenceYear={referenceYear}
			/>
			{sponsors.length === 0 ? (
				<SponsorsEmptyState onAddSponsor={onAddSponsor} />
			) : (
				<SponsorsTable sponsors={shown} history={history} onSelect={onSelectSponsor} />
			)}
		</div>
	);
}
