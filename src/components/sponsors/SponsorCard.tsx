import { MissingValue } from '@/components/toolkit/PaperTable';
import type { SponsorHistory } from '@/lib/sponsorHistory';
import type { Sponsor } from '@/lib/sponsorService';
import SponsorHistoryMark from './SponsorHistoryMark';

export interface SponsorCardProps {
	sponsor: Sponsor;
	/** Historie dieser Firma; ohne Eintrag die leere (siehe `sponsorHistoryOf`). */
	history: SponsorHistory;
	/** Übergangsweg ins Firmendaten-Formular, bis #159 das ⋮ bringt — derselbe
	Griff, den die Tabellenzeile am Desktop heute anbietet. */
	onSelect: (sponsor: Sponsor) => void;
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
 * eigenen Rahmen"), mit derselben Begründung wie Material (#116) und
 * Sponsoring (#155): die sieben Spalten brauchen gemessene 895 px, bei 375 px
 * Gerätebreite scrollte die Tabelle +553 px quer — und Querscrollen in einer
 * Liste ist seit #66 ein No-Go.
 *
 * Der Preis ist gemessen und gewollt: 148,7 px je Karte, 6316 px Scrollweg auf
 * 40 Firmen gegen 2596 px beim schlanksten Zuschnitt. Nicht nachträglich
 * „optimieren" — der Zuschnitt ist die Entscheidung (Nutzer-Entscheid #101).
 */
export default function SponsorCard({ sponsor, history, onSelect }: SponsorCardProps) {
	return (
		<article className="relative border-2 border-tinte bg-white px-2.5 py-2">
			{/* Der Firmenname trägt den 42px-Rand für das ⋮ — sonst liefe eine lange
			Firma unter das Menü. */}
			<h3 className="pr-[42px] leading-[1.15] [overflow-wrap:anywhere]">
				{/* Die Schrift steht am Knopf, nicht nur an der Überschrift: Tailwinds
				Preflight setzt `button { text-transform: none; font: inherit }` und
				nähme die Versalien sonst zurück. */}
				<button
					type="button"
					onClick={() => onSelect(sponsor)}
					className="text-left font-display text-[14.5px] font-semibold uppercase leading-[1.15] tracking-[.015em] hover:underline">
					{sponsor.company_name}
				</button>
			</h3>
			{/* Der Platz des ⋮ oben rechts: 40px Trefferfläche (DESIGN-VISION §6,
			WCAG 2.5.8). Das Menü selbst hängt #159 hier ein — wie in der
			Tabellenzeile am Desktop, die dafür ihre siebte Spalte freihält. */}
			<div className="absolute right-0 top-0 min-h-10 min-w-10" aria-hidden />

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
				<SponsorHistoryMark history={history} />
			</div>
		</article>
	);
}
