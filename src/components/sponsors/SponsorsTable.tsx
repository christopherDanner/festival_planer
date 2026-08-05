import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { Sponsor } from '@/lib/sponsorService';
import MastPanel from './MastPanel';

export interface SponsorsTableProps {
	/** Bereits gefilterter Ausschnitt des Sponsorenbestands, alphabetisch. */
	sponsors: Sponsor[];
	/** Zeilenklick — Übergangsweg ins Firmendaten-Formular, bis #159 das ⋮ bringt. */
	onSelect: (sponsor: Sponsor) => void;
}

/** Fehlender Wert: graues „–" statt einer leeren Zelle. */
const MissingValue = () => <span className="text-tinte-soft/60">–</span>;

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
 * damit in die 1132 px Inhaltsbreite. Unter 900px scrollt die Tabelle im
 * eigenen Rahmen (DESIGN-VISION §6), am Desktop gar nicht — nur deshalb kann
 * der Kopf dort kleben: ein Scroll-Container würde das Kleben am Fenster
 * aushebeln.
 */
export default function SponsorsTable({ sponsors, onSelect }: SponsorsTableProps) {
	// Am Handy ist die Zeile das Trefferfeld — DESIGN-VISION §6 will dafür
	// 40px, deshalb dort mehr Luft als am Desktop.
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
							{/* Siebte Spalte: das ⋮ bleibt leer, bis #159 das Menü bringt. */}
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
							sponsors.map((sponsor) => (
								<tr
									key={sponsor.id}
									onClick={() => onSelect(sponsor)}
									className="cursor-pointer border-b border-linie hover:bg-fusszeile">
									<td className={cn(cell, 'font-bold')}>
										{/* Der Firmenname ist zusätzlich ein echter Knopf, damit der
										Zeilenklick auch mit der Tastatur erreichbar ist. */}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onSelect(sponsor);
											}}
											className="text-left font-bold hover:underline">
											{sponsor.company_name}
										</button>
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
									{/* „Zuletzt" und ⋮ füllt der Historie- bzw. ⋮-Slice (#158/#159). */}
									<td className={cn(cell, 'whitespace-nowrap')} />
									<td className={cn(cell, 'w-10')} />
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</MastPanel>
	);
}
