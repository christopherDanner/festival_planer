import React from 'react';
import { MoreVertical } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ValueTag } from '@/components/toolkit/ValueTag';
import { formatEuro } from '@/lib/money';
import type { SponsoringCategory } from '@/lib/sponsorService';
import type { SponsoringOverviewFooter, SponsoringOverviewRow } from '@/lib/sponsoringTotals';

export interface SponsoringMatrixProps {
	/** Die Preisliste des Fests — eine Spalte je Kategorie, in dieser Reihenfolge. */
	categories: SponsoringCategory[];
	rows: SponsoringOverviewRow[];
	footer: SponsoringOverviewFooter;
	onEdit: (sponsoringId: string) => void;
	onDelete: (sponsoringId: string) => void;
}

/* Firma klebt links, Gesamt klebt rechts: bei Überhang verschwinden zuerst die
rechten Spalten — man sähe sonst Kategorie-Werte ohne Zeilensumme (#69). Die
2-px-Tinte-Kante ist ein Schatten, damit sie keine Spaltenbreite kostet. */
const STICKY_LEFT = 'sticky left-0 shadow-[2px_0_0_oklch(var(--tinte))]';
const STICKY_RIGHT = 'sticky right-0 shadow-[-2px_0_0_oklch(var(--tinte))]';
const HEAD_CELL =
	'border-b-2 border-tinte bg-kopfzeile px-2.5 py-2 text-left align-bottom text-[11px] font-bold uppercase tracking-[.05em]';
const BODY_CELL = 'overflow-hidden px-2.5 align-middle tabular-nums';
const FOOT_CELL =
	'border-t-2 border-tinte bg-fusszeile px-2.5 py-2 align-middle font-extrabold tabular-nums';

/** Gestrichelte „+"-Marke für alles, was an dieser Zeile noch nicht erfasst ist. */
const OpenMark: React.FC = () => <ValueTag tone="muted">+</ValueTag>;

/**
 * Die Paket-Matrix des Sponsoring-Bereichs (DESIGN-VISION §5, Bereichs-Spec #69):
 * `Firma · je Kategorie eine Spalte · Freibetrag · Sachleistung · Gesamt · ⋮`.
 *
 * Rein darstellend — gerechnet wird ausschließlich in `sponsoringTotals`
 * (ADR 0006, kein zweiter Rechenweg). `table-layout: fixed` und die feste
 * Zeilenhöhe von 43 px sind Auflage aus #66/#69: nur so springt beim Öffnen
 * des Zettels (#148) nichts.
 */
const SponsoringMatrix: React.FC<SponsoringMatrixProps> = ({
	categories,
	rows,
	footer,
	onEdit,
	onDelete
}) => (
	<div className="overflow-x-auto border-2.5 border-tinte bg-white">
		<table className="w-full table-fixed border-collapse text-[13px]">
			<thead>
				<tr>
					<th scope="col" className={`${HEAD_CELL} ${STICKY_LEFT} z-20 w-[17%]`}>
						Firma
					</th>
					{categories.map((category) => (
						/* hyphens-auto: bei 6 Kategorien ist eine Spalte 91 px breit,
						„TRANSPARENT" braucht ~95 px und kann als ein Wort nicht umbrechen. */
						<th
							key={category.id}
							scope="col"
							lang="de"
							className={`${HEAD_CELL} hyphens-auto text-center`}
						>
							{category.name}
							{category.value != null && (
								<span className="block font-display text-xs font-semibold normal-case tracking-normal text-gruen">
									{formatEuro(category.value)}
								</span>
							)}
						</th>
					))}
					<th scope="col" className={`${HEAD_CELL} w-[8%] text-right`}>
						Freibetrag
					</th>
					<th scope="col" className={`${HEAD_CELL} w-[15%]`}>
						Sachleistung
					</th>
					<th scope="col" className={`${HEAD_CELL} ${STICKY_RIGHT} z-20 w-[9%] text-right`}>
						Gesamt
					</th>
					<th scope="col" className={`${HEAD_CELL} w-[4%]`}>
						<span className="sr-only">Aktionen</span>
					</th>
				</tr>
			</thead>

			<tbody>
				{rows.map((row) => (
					<tr key={row.sponsoringId} className="h-[43px] border-b border-linie">
						<td className={`${BODY_CELL} ${STICKY_LEFT} z-10 truncate bg-white font-bold`}>
							{row.companyName}
						</td>
						{categories.map((category) => {
							const position = row.positionsByCategoryId[category.id];
							return (
								<td key={category.id} className={`${BODY_CELL} text-center`}>
									{position ? (
										<ValueTag value={formatEuro(position.value)} overridden={position.overridden} />
									) : (
										<OpenMark />
									)}
								</td>
							);
						})}
						<td className={`${BODY_CELL} text-right`}>
							{row.freeAmount != null ? (
								<ValueTag tone="ink" value={formatEuro(row.freeAmount)} />
							) : (
								<OpenMark />
							)}
						</td>
						<td className={BODY_CELL}>
							{row.inKind ? (
								<ValueTag
									tone="muted"
									className="max-w-full"
									title={`${row.inKind.description} (${formatEuro(row.inKind.value)})`}
									value={`(${formatEuro(row.inKind.value)})`}
								>
									<span className="overflow-hidden text-ellipsis">{row.inKind.description}</span>
								</ValueTag>
							) : (
								<OpenMark />
							)}
						</td>
						<td className={`${BODY_CELL} ${STICKY_RIGHT} z-10 bg-white text-right`}>
							<span className="font-bold">{formatEuro(row.total)}</span>
							{/* Vorjahresbeitrag: immer grau, keine Rot/Grün-Färbung — es gibt
							keinen Anspruch, den ein Sponsor verletzt hätte (#69, Entscheid 4). */}
							{row.previousTotal != null && (
								<span className="block text-[10.5px] font-semibold leading-tight text-tinte-soft">
									Vorjahr {formatEuro(row.previousTotal)}
								</span>
							)}
						</td>
						<td className={BODY_CELL}>
							<DropdownMenu>
								<DropdownMenuTrigger
									className="text-tinte-soft hover:text-tinte"
									aria-label={`Menü für ${row.companyName}`}
								>
									<MoreVertical className="h-4 w-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onSelect={() => onEdit(row.sponsoringId)}>
										Bearbeiten
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-rot"
										onSelect={() => onDelete(row.sponsoringId)}
									>
										Entfernen
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</td>
					</tr>
				))}
			</tbody>

			{/* Ohne Zeile entfällt der Fuß: sechs korrekte Nullen sehen wie ein Fehler
			aus (#69, Leerzustand L2). */}
			{rows.length > 0 && (
				<tfoot>
					<tr>
						<td className={`${FOOT_CELL} ${STICKY_LEFT} z-10`}>Σ je Kategorie</td>
						{categories.map((category) => (
							<td key={category.id} className={`${FOOT_CELL} text-center`}>
								{formatEuro(footer.perCategoryId[category.id] ?? 0)}
							</td>
						))}
						<td className={`${FOOT_CELL} text-right`}>{formatEuro(footer.freeAmount)}</td>
						{/* Sachwert steht neben dem Geld, nie darin (ADR 0008). */}
						<td className={FOOT_CELL}>
							{footer.inKindValue > 0 && `+ ${formatEuro(footer.inKindValue)} Sachwert`}
						</td>
						<td className={`${FOOT_CELL} ${STICKY_RIGHT} z-10 text-right`}>
							<span className="font-display text-[15px] font-semibold">
								{formatEuro(footer.total)}
							</span>
						</td>
						<td className={FOOT_CELL} />
					</tr>
				</tfoot>
			)}
		</table>
	</div>
);

export default SponsoringMatrix;
