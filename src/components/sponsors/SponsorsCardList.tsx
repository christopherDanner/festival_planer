import { sponsorHistoryOf, type SponsorHistoryMap } from '@/lib/sponsorHistory';
import type { Sponsor } from '@/lib/sponsorService';
import MastPanel from './MastPanel';
import SponsorCard from './SponsorCard';

export interface SponsorsCardListProps {
	/** Bereits gefilterter Ausschnitt des Sponsorenbestands, alphabetisch. */
	sponsors: Sponsor[];
	/** Sponsoren-Historie je Firma; fehlt eine, hat sie keine. */
	history: SponsorHistoryMap;
	/** Übergangsweg ins Firmendaten-Formular, bis #159 das ⋮ bringt. */
	onSelect: (sponsor: Sponsor) => void;
}

/**
 * Der Sponsorenbestand unter 900px (#160): **gestapelte Karten statt der
 * querscrollenden Tabelle** — dasselbe Muster wie Material (#116) und
 * Sponsoring (#155).
 *
 * Der Scrollweg ist lang (gemessen 6316 px auf 40 Firmen) und das ist die
 * bezahlte Gegenleistung dafür, dass nichts geöffnet werden muss. Erträglich
 * macht ihn die klebende Werkzeugleiste aus dem Gerüst-Slice (#157) — deshalb
 * steht hier **kein** eigener Scroll-Container: der würde das Kleben am Fenster
 * aushebeln.
 */
export default function SponsorsCardList({
	sponsors,
	history,
	onSelect
}: SponsorsCardListProps) {
	return (
		<MastPanel className="space-y-2 p-3">
			{sponsors.length === 0 ? (
				// Wortgleich zur Tabelle: dieselbe Auskunft darf nicht zwei Namen haben.
				<p className="px-3 py-10 text-center text-[13px] text-tinte-soft">Keine Firma gefunden</p>
			) : (
				sponsors.map((sponsor) => (
					<SponsorCard
						key={sponsor.id}
						sponsor={sponsor}
						history={sponsorHistoryOf(history, sponsor.id)}
						onSelect={onSelect}
					/>
				))
			)}
		</MastPanel>
	);
}
