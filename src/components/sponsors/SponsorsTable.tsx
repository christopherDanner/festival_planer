import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { sponsorHistoryOf, type SponsorHistoryMap } from '@/lib/sponsorHistory';
import type { Sponsor } from '@/lib/sponsorService';
import { MissingValue } from '@/components/toolkit/PaperTable';
import MastPanel from './MastPanel';
import SponsorHistoryLine from './SponsorHistoryLine';
import SponsorRowMenu from './SponsorRowMenu';
import { sponsorAnchorId } from './sponsorAnchor';

export interface SponsorsTableProps {
	/** Bereits gefilterter Ausschnitt des Sponsorenbestands, alphabetisch. */
	sponsors: Sponsor[];
	/** Sponsoren-Historie je Firma; fehlt eine, hat sie keine. */
	history: SponsorHistoryMap;
	/** ⋮ → Bearbeiten: öffnet das Firmendaten-Formular dieser Firma. */
	onEdit: (sponsor: Sponsor) => void;
	/** ⋮ → Löschen, nach der Rückfrage — nur für Firmen ohne Historie frei. */
	onDelete: (sponsor: Sponsor) => void;
}

const CellValue = ({ children }: { children: string | null }) =>
	children ? <>{children}</> : <MissingValue />;

/**
 * Spaltenkopf: Versalien auf getönter Fläche. Klebt am Desktop unter der
 * Werkzeugleiste — deren Höhe steht in `--sponsors-toolbar-h`.
 */
function HeaderCell({ children, className }: { children?: ReactNode; className?: string }) {
	return (
		<th
			className={cn(
				'z-10 whitespace-nowrap bg-fusszeile px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.05em] text-tinte',
				// Der 2px-Kopfstrich als inset-Schatten: ein Zellenrahmen verschwindet
				// bei `border-collapse: collapse`, sobald der Kopf klebt.
				'shadow-[inset_0_-2px_0_oklch(var(--tinte))]',
				'min-[900px]:sticky min-[900px]:top-[var(--sponsors-toolbar-h)]',
				className
			)}>
			{children}
		</th>
	);
}

/**
 * Frachtbrief-Tabelle der Sponsoren-Stammdaten (#101, Variante V1): sieben
 * Spalten, nur lesend. Gemessen brauchen sie mindestens 895 px und passen
 * damit in die 1132 px Inhaltsbreite. Der Kopf klebt am Desktop, weil dort
 * nichts quer scrollt — ein Scroll-Container würde das Kleben am Fenster
 * aushebeln.
 *
 * Seit #160 ist sie die Sicht **ab 900px**: darunter zeigt `SponsorsView`
 * Karten. Die `min-[900px]`-Weichen bleiben trotzdem stehen — `compact` ist
 * eine Angabe des Aufrufers, und der erste Anstrich, bevor `useIsMobile`
 * geantwortet hat, ist keine. Sie kosten am Desktop nichts.
 */
export default function SponsorsTable({
	sponsors,
	history,
	onEdit,
	onDelete
}: SponsorsTableProps) {
	// Unter 900px mehr Luft: dort steht die Tabelle nur im ersten Anstrich
	// (siehe oben), und das ⋮ braucht seine 40px Zeilenhöhe (DESIGN-VISION §6).
	const cell = 'px-3 py-3 align-middle min-[900px]:py-2';

	return (
		<MastPanel>
			<div className="overflow-x-auto min-[900px]:overflow-x-visible">
				<table className="w-full border-collapse text-[13px]">
					<thead>
						<tr>
							<HeaderCell>Firma</HeaderCell>
							<HeaderCell>Ansprechpartner</HeaderCell>
							<HeaderCell>Telefon</HeaderCell>
							<HeaderCell>Email</HeaderCell>
							<HeaderCell>Adresse</HeaderCell>
							<HeaderCell>Zuletzt</HeaderCell>
							{/* Siebte Spalte: das ⋮ (#159). */}
							<HeaderCell className="w-10" />
						</tr>
					</thead>
					<tbody>
						{sponsors.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-3 py-10 text-center text-tinte-soft">
									Keine Firma gefunden
								</td>
							</tr>
						) : (
							sponsors.map((sponsor) => {
								const entry = sponsorHistoryOf(history, sponsor.id);
								return (
									// `tabIndex={-1}`: nach dem Anlegen holt die Seite die neue Zeile
									// ins Bild und setzt den Fokus darauf (#159).
									<tr
										key={sponsor.id}
										id={sponsorAnchorId(sponsor.id)}
										tabIndex={-1}
										className="border-b border-linie outline-none focus:bg-gelb/30">
										<td className={cn(cell, 'font-bold')}>
											{sponsor.company_name}
											{sponsor.website && (
												<span className="block text-[11.5px] font-medium text-tinte-soft">
													{sponsor.website}
												</span>
											)}
										</td>
										<td className={cell}>
											<CellValue>{sponsor.contact_person}</CellValue>
										</td>
										<td className={cn(cell, 'whitespace-nowrap')}>
											<CellValue>{sponsor.phone}</CellValue>
										</td>
										<td className={cell}>
											<CellValue>{sponsor.email}</CellValue>
										</td>
										<td className={cell}>
											<CellValue>{sponsor.address}</CellValue>
										</td>
										<td className={cn(cell, 'whitespace-nowrap tabular-nums')}>
											<SponsorHistoryLine history={entry} />
										</td>
										{/* Das ⋮ trägt seine 40px selbst; die Zelle gibt ihm nur Luft. */}
										<td className="w-10 px-1 align-middle">
											<SponsorRowMenu
												companyName={sponsor.company_name}
												festivalCount={entry.festivalCount}
												onEdit={() => onEdit(sponsor)}
												onDelete={() => onDelete(sponsor)}
											/>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</MastPanel>
	);
}
