import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { Sponsor } from '@/lib/sponsorService';

export interface SponsorTableProps {
	/** Bereits gefilterter Ausschnitt des Sponsorenbestands, alphabetisch. */
	sponsors: Sponsor[];
	/**
	 * Höhe der klebenden Werkzeugleiste — der Tabellenkopf klebt am Desktop
	 * genau darunter.
	 */
	headerOffsetPx?: number;
	/** Zeilenklick — Übergangsweg ins Firmendaten-Formular, bis #159 das ⋮ bringt. */
	onSelect: (sponsor: Sponsor) => void;
}

/** Fehlender Wert: graues „–" statt einer leeren Zelle. */
const Fehlt = () => <span className="text-tinte-soft/60">–</span>;

const Wert = ({ children }: { children: string | null }) =>
	children ? <>{children}</> : <Fehlt />;

function Kopf({
	children,
	offsetPx,
	className
}: {
	children?: ReactNode;
	offsetPx: number;
	className?: string;
}) {
	return (
		<th
			style={{ top: offsetPx }}
			className={cn(
				'z-10 whitespace-nowrap bg-fusszeile px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.05em] text-tinte',
				// Der 2px-Kopfstrich als inset-Schatten: ein Zellenrahmen verschwindet
				// bei `border-collapse: collapse`, sobald der Kopf klebt.
				'shadow-[inset_0_-2px_0_oklch(var(--tinte))]',
				'min-[900px]:sticky',
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
 * eigenen Rahmen (DESIGN-VISION §6), am Desktop gar nicht — deshalb kann der
 * Kopf dort kleben.
 */
export default function SponsorTable({
	sponsors,
	headerOffsetPx = 0,
	onSelect
}: SponsorTableProps) {
	return (
		<div className="border-2.5 border-t-0 border-tinte bg-white">
			<div className="overflow-x-auto min-[900px]:overflow-x-visible">
				<table className="w-full border-collapse text-[13px]">
					<thead>
						<tr>
							<Kopf offsetPx={headerOffsetPx}>Firma</Kopf>
							<Kopf offsetPx={headerOffsetPx}>Ansprechpartner</Kopf>
							<Kopf offsetPx={headerOffsetPx}>Telefon</Kopf>
							<Kopf offsetPx={headerOffsetPx}>Email</Kopf>
							<Kopf offsetPx={headerOffsetPx}>Adresse</Kopf>
							<Kopf offsetPx={headerOffsetPx}>Zuletzt</Kopf>
							{/* ⋮-Spalte: bleibt leer, bis #159 das Menü bringt. */}
							<Kopf offsetPx={headerOffsetPx} className="w-10" />
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
									<td className="px-3 py-2 align-middle font-bold">
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
									<td className="px-3 py-2 align-middle">
										<Wert>{sponsor.contact_person}</Wert>
									</td>
									<td className="whitespace-nowrap px-3 py-2 align-middle">
										<Wert>{sponsor.phone}</Wert>
									</td>
									<td className="px-3 py-2 align-middle">
										<Wert>{sponsor.email}</Wert>
									</td>
									<td className="px-3 py-2 align-middle">
										<Wert>{sponsor.address}</Wert>
									</td>
									{/* „Zuletzt" und ⋮ füllt der Historie- bzw. ⋮-Slice (#158/#159). */}
									<td className="whitespace-nowrap px-3 py-2 align-middle" />
									<td className="w-10 px-3 py-2 align-middle" />
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
