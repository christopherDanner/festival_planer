import { MissingValue } from '@/components/toolkit/PaperTable';
import type { SponsorHistory } from '@/lib/sponsorHistory';
import type { Sponsor } from '@/lib/sponsorService';
import SponsorHistoryLine from './SponsorHistoryLine';
import SponsorRowMenu from './SponsorRowMenu';
import { sponsorAnchorId } from './sponsorAnchor';

export interface SponsorCardProps {
	sponsor: Sponsor;
	/** Historie dieser Firma; ohne Eintrag die leere (siehe `sponsorHistoryOf`). */
	history: SponsorHistory;
	/** ⋮ → Bearbeiten — derselbe Griff wie an der Tabellenzeile am Desktop. */
	onEdit: (sponsor: Sponsor) => void;
	/** ⋮ → Löschen, nach der Rückfrage — nur für Firmen ohne Historie frei. */
	onDelete: (sponsor: Sponsor) => void;
}

/** Eine Angabe der Definitionsliste: Versalien-Kürzel, daneben der Wert. Fehlt
er, steht das graue „–" — die Lücke ist Information (wen man *nicht* erreichen
kann), keine leere Fläche. */
function Angabe({ label, value }: { label: string; value: string | null }) {
	return (
		<>
			<dt className="pt-0.5 text-[10px] font-extrabold uppercase tracking-[.05em] text-tinte-soft">
				{label}
			</dt>
			{/* Lange Emailadressen und Firmennamen brechen, statt quer zu scrollen. */}
			<dd className="tabular-nums [overflow-wrap:anywhere]">
				{value ? value : <MissingValue />}
			</dd>
		</>
	);
}

/**
 * Eine Firma des Sponsorenbestands am Handy (#160, Variante M1 aus
 * `design-vision/entscheid-sponsorenseite-liste.html`): **die volle Karte** —
 * alle sieben Felder der Frachtbrief-Tabelle, nichts muss geöffnet werden, um
 * anzurufen oder eine Adresse zu lesen.
 *
 * Bewusste Abweichung von DESIGN-VISION §6 („Tabellen scrollen horizontal im
 * eigenen Rahmen"), mit derselben Begründung wie bei Material (#116, gebaut)
 * und Sponsoring (#155, Geschwister-Slice): die sieben Spalten brauchen
 * gemessene 895 px, bei 375 px Gerätebreite scrollte die Tabelle +553 px quer —
 * und Querscrollen in einer Liste ist seit #66 ein No-Go.
 *
 * Der Preis ist gemessen und gewollt: im Prototyp 148,7 px je Karte, 6316 px
 * Scrollweg auf 40 Firmen gegen 2596 px beim schlanksten Zuschnitt. Nicht
 * nachträglich „optimieren" — der Zuschnitt ist die Entscheidung
 * (Nutzer-Entscheid #101). Gebaut sind es 176,6 px je Karte: die Grundschrift
 * der App führt 12px-Text mit 18px Zeilenhöhe, der Prototyp mit der
 * Browser-Vorgabe von 14px. Dieselben Felder, andere Zeilenhöhe.
 */
export default function SponsorCard({ sponsor, history, onEdit, onDelete }: SponsorCardProps) {
	return (
		// `tabIndex={-1}`: nach dem Anlegen holt die Seite die neue Karte ins Bild
		// und setzt den Fokus darauf (#159).
		<article
			id={sponsorAnchorId(sponsor.id)}
			tabIndex={-1}
			className="relative border-2 border-tinte bg-white px-2.5 py-2 outline-none focus:bg-gelb/30">
			{/* Das ⋮ hängt wie im Prototyp absolut in der Ecke; seine 40px trägt es
			selbst (DESIGN-VISION §6). */}
			<SponsorRowMenu
				companyName={sponsor.company_name}
				festivalCount={history.festivalCount}
				onEdit={() => onEdit(sponsor)}
				onDelete={() => onDelete(sponsor)}
				className="absolute right-0.5 top-0.5"
			/>
			{/* Der Firmenname hält den 42px-Rand für das ⋮ frei — sonst liefe eine
			lange Firma darunter. */}
			<h3 className="pr-[42px] font-display text-[14.5px] font-semibold uppercase leading-[1.15] tracking-[.015em] [overflow-wrap:anywhere]">
				{sponsor.company_name}
			</h3>

			<dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[12px]">
				<Angabe label="Kontakt" value={sponsor.contact_person} />
				<Angabe label="Tel" value={sponsor.phone} />
				<Angabe label="Email" value={sponsor.email} />
				<Angabe label="Adresse" value={sponsor.address} />
				<Angabe label="Web" value={sponsor.website} />
			</dl>

			{/* Die Historie ist keine Kontaktangabe — die gestrichelte Linie setzt
			sie ab, wie die eigene Spalte „Zuletzt" es am Desktop tut. */}
			<div className="mt-1.5 border-t-1.5 border-dashed border-linie pt-1.5 text-[12px]">
				<SponsorHistoryLine history={history} />
			</div>
		</article>
	);
}
