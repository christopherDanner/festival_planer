import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ValueTag } from '@/components/toolkit/ValueTag';
import SponsoringZettel from '@/components/sponsoring/SponsoringZettel';
import { formatEuro } from '@/lib/money';
import type { SponsoringCategory } from '@/lib/sponsorService';
import type { SponsoringOverviewFooter, SponsoringOverviewRow } from '@/lib/sponsoringTotals';
import {
	buildZettel,
	type Zettel,
	type ZettelInput,
	type ZettelTarget
} from '@/lib/sponsoringZettel';

export interface SponsoringMatrixProps {
	/** Die Preisliste des Fests — eine Spalte je Kategorie, in dieser Reihenfolge. */
	categories: SponsoringCategory[];
	rows: SponsoringOverviewRow[];
	footer: SponsoringOverviewFooter;
	onDelete: (sponsoringId: string) => void;
	/** „Übernehmen" im Zettel. */
	onApply: (sponsoringId: string, target: ZettelTarget, input: ZettelInput) => void;
	/** „Entfernen" im Zettel. */
	onRemove: (sponsoringId: string, target: ZettelTarget) => void;
}

/** Eindeutig je Zelle — sagt, welcher Zettel offen ist. */
const cellKey = (sponsoringId: string, target: ZettelTarget): string =>
	`${sponsoringId}:${target.kind === 'category' ? `category:${target.category.id}` : target.kind}`;

/* Firma klebt links, Gesamt und ⋮ kleben rechts: bei Überhang verschwinden
zuerst die rechten Spalten — man sähe sonst Kategorie-Werte ohne Zeilensumme
(#69). Die Tinte-Kante ist ein Schatten, damit sie keine Spaltenbreite kostet. */
const STICKY_LEFT = 'sticky left-0 shadow-kante-links';
const STICKY_TOTAL = 'sticky right-11 shadow-kante-rechts';
const STICKY_MENU = 'sticky right-0';

/* Mindestbreite, damit die Tabelle bei Überhang scrollt statt die Spalten zu
stauchen — ohne sie staucht `table-layout: fixed` endlos weiter. Beide Zahlen
sind die Messung aus #69 an der Referenzbreite 1132 px: die Spalten neben den
Kategorien (17 + 8 + 15 + 9 % plus die ⋮-Spalte) belegen 53 % = 600 px, eine
Kategorie-Spalte behält die 88 px, die sie beim gemessenen Deckel von 6
Kategorien hat. Damit passen 4 (952 px) und 6 (1128 px) hinein, 7 reißen mit
1216 px aus — die gemessenen +85 px. */
const OTHER_COLUMNS_PX = 600;
const CATEGORY_COLUMN_MIN_PX = 88;

const HEAD_CELL =
	'border-b-2 border-tinte bg-fusszeile px-2.5 py-2 text-left align-bottom text-[11px] font-bold uppercase tracking-[.05em]';
const BODY_CELL = 'overflow-hidden px-2.5 align-middle tabular-nums';
const FOOT_CELL =
	'border-t-2 border-tinte bg-fusszeile px-2.5 py-2 align-middle font-extrabold tabular-nums';

/** Gestrichelte „+"-Marke für alles, was an dieser Zeile noch nicht erfasst ist. */
const UnrecordedMark: React.FC = () => <ValueTag tone="muted">+</ValueTag>;

/* Feste Zeilenhöhe (#66/#69) — der Zell-Knopf trägt sie mit, damit der ganze
Zellbereich klickbar ist und die Zeile davon nicht wächst. */
const ROW_HEIGHT = 'h-[43px]';

const CELL_ALIGN = {
	start: 'justify-start',
	center: 'justify-center',
	end: 'justify-end'
} as const;

/* Der Zettel bringt seinen eigenen Rahmen mit; der Popover steuert nur noch
Platzierung, Schließen und Fokus bei. */
const ZETTEL_CONTENT = 'w-auto border-0 bg-transparent p-0 shadow-none';

/**
 * Eine wertetragende Zelle: ihr ganzer Inhalt ist der Knopf, der den Zettel
 * öffnet. Er füllt die Zeilenhöhe, damit auch der Rand einer leeren Zelle
 * trifft. Der Zettel hängt als Popover daran — Platzierung, Klick außerhalb,
 * Escape und Fokus-Rückgabe kommen von Radix, nicht von uns (ADR 0003).
 */
const ZettelCell: React.FC<{
	label: string;
	align: keyof typeof CELL_ALIGN;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	zettel: Zettel;
	onApply: (input: ZettelInput) => void;
	onRemove: () => void;
	children: React.ReactNode;
}> = ({ label, align, open, onOpenChange, zettel, onApply, onRemove, children }) => (
	<Popover open={open} onOpenChange={onOpenChange}>
		<PopoverTrigger asChild>
			<button
				type="button"
				aria-label={label}
				className={`flex ${ROW_HEIGHT} w-full min-w-0 items-center ${CELL_ALIGN[align]}`}
			>
				{children}
			</button>
		</PopoverTrigger>
		{/* Schwebt unter der Zelle und verdeckt dabei die Folgezeile — ausdrücklich
		abgenommen (ADR 0009). Den Fokus setzt der Zettel selbst: er selektiert das
		vorbelegte Feld, was Radix' Standard-Fokus überschreiben würde. */}
		<PopoverContent
			align="start"
			sideOffset={2}
			className={ZETTEL_CONTENT}
			onOpenAutoFocus={(e) => e.preventDefault()}
		>
			<SponsoringZettel zettel={zettel} onApply={onApply} onRemove={onRemove} />
		</PopoverContent>
	</Popover>
);

/**
 * Die Paket-Matrix des Sponsoring-Bereichs (DESIGN-VISION §5, Bereichs-Spec #69):
 * `Firma · je Kategorie eine Spalte · Freibetrag · Sachleistung · Gesamt · ⋮`.
 *
 * Gerechnet wird ausschließlich in `sponsoringTotals` (ADR 0006, kein zweiter
 * Rechenweg). `table-layout: fixed` und die feste Zeilenhöhe von 43 px sind
 * Auflage aus #66/#69: nur so springt beim Öffnen des Zettels nichts.
 *
 * Bedient wird per Zellklick: jede wertetragende Zelle öffnet den Zettel
 * (ADR 0009). Geschrieben wird nur über `onApply`/`onRemove` — den Schreibweg
 * selbst kennt die Matrix nicht.
 */
const SponsoringMatrix: React.FC<SponsoringMatrixProps> = ({
	categories,
	rows,
	footer,
	onDelete,
	onApply,
	onRemove
}) => {
	/* Höchstens ein Zettel ist offen: der Klick auf eine andere Zelle schließt
	den alten, ohne zu speichern (ADR 0009). */
	const [openCell, setOpenCell] = useState<string | null>(null);

	/** Die Requisiten einer wertetragenden Zelle — überall dieselbe Verdrahtung. */
	const cell = (row: SponsoringOverviewRow, target: ZettelTarget) => {
		const key = cellKey(row.sponsoringId, target);
		return {
			open: openCell === key,
			onOpenChange: (open: boolean) => setOpenCell(open ? key : null),
			zettel: buildZettel(row, target),
			onApply: (input: ZettelInput) => {
				onApply(row.sponsoringId, target, input);
				setOpenCell(null);
			},
			onRemove: () => {
				onRemove(row.sponsoringId, target);
				setOpenCell(null);
			}
		};
	};

	return (
		<div>
			<div className="overflow-x-auto border-2.5 border-tinte bg-white">
				<table
					className="w-full table-fixed border-collapse text-[13px]"
					style={{
						minWidth: `${OTHER_COLUMNS_PX + categories.length * CATEGORY_COLUMN_MIN_PX}px`
					}}
				>
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
							<th scope="col" className={`${HEAD_CELL} ${STICKY_TOTAL} z-20 w-[9%] text-right`}>
								Gesamt
							</th>
							<th scope="col" className={`${HEAD_CELL} ${STICKY_MENU} z-20 w-11`}>
								<span className="sr-only">Aktionen</span>
							</th>
						</tr>
					</thead>

					<tbody>
						{rows.map((row) => (
							<tr key={row.sponsoringId} className={`${ROW_HEIGHT} border-b border-linie`}>
								<td className={`${BODY_CELL} ${STICKY_LEFT} z-10 truncate bg-white font-bold`}>
									{row.companyName}
								</td>
								{categories.map((category) => {
									const position = row.positionsByCategoryId[category.id];
									return (
										<td key={category.id} className={`${BODY_CELL} text-center`}>
											<ZettelCell
												label={`${category.name} bei ${row.companyName}`}
												align="center"
												{...cell(row, { kind: 'category', category })}
											>
												{position ? (
													<ValueTag
														value={formatEuro(position.value)}
														overridden={position.overridden}
													/>
												) : (
													<UnrecordedMark />
												)}
											</ZettelCell>
										</td>
									);
								})}
								<td className={`${BODY_CELL} text-right`}>
									<ZettelCell
										label={`Freibetrag bei ${row.companyName}`}
										align="end"
										{...cell(row, { kind: 'freeAmount' })}
									>
										{row.freeAmount != null ? (
											<ValueTag tone="ink" value={formatEuro(row.freeAmount)} />
										) : (
											<UnrecordedMark />
										)}
									</ZettelCell>
								</td>
								<td className={BODY_CELL}>
									<ZettelCell
										label={`Sachleistung bei ${row.companyName}`}
										align="start"
										{...cell(row, { kind: 'inKind' })}
									>
										{row.inKind ? (
											/* Die Spalte wird nicht breiter (bei 6 Kategorien ist die Reserve
											0 px), also kürzt der Text und der volle steht im title. */
											<ValueTag
												tone="muted"
												className="max-w-full"
												title={`${row.inKind.description} (${formatEuro(row.inKind.value)})`}
												value={`(${formatEuro(row.inKind.value)})`}
											>
												<span className="min-w-0 overflow-hidden text-ellipsis">
													{row.inKind.description}
												</span>
											</ValueTag>
										) : (
											<UnrecordedMark />
										)}
									</ZettelCell>
								</td>
								<td className={`${BODY_CELL} ${STICKY_TOTAL} z-10 bg-white text-right`}>
									<span className="font-bold">{formatEuro(row.total)}</span>
									{/* Vorjahresbeitrag: immer grau, keine Rot/Grün-Färbung — es gibt
									keinen Anspruch, den ein Sponsor verletzt hätte (#69, Entscheid 4). */}
									{row.previousTotal != null && (
										<span className="block text-[10.5px] font-semibold leading-tight text-tinte-soft">
											Vorjahr {formatEuro(row.previousTotal)}
										</span>
									)}
								</td>
								<td className={`${BODY_CELL} ${STICKY_MENU} z-10 bg-white`}>
									{/* Das Menü trägt vorerst nur „Entfernen"; Notiz und Firmendaten
									kommen mit #150, ein „Bearbeiten" ist dort ausdrücklich verworfen. */}
									<DropdownMenu>
										<DropdownMenuTrigger
											className="text-tinte-soft hover:text-tinte"
											aria-label={`Menü für ${row.companyName}`}
										>
											<MoreVertical className="h-4 w-4" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
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

					{/* Ohne Zeile gibt es nichts zu summieren — und sechs korrekte Nullen
					sehen wie ein Fehler aus (#69, Leerzustand L2). */}
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
								<td className={`${FOOT_CELL} ${STICKY_TOTAL} z-10 text-right`}>
									<span className="font-display text-[15px] font-semibold">
										{formatEuro(footer.total)}
									</span>
								</td>
								<td className={`${FOOT_CELL} ${STICKY_MENU} z-10`} />
							</tr>
						</tfoot>
					)}
				</table>
			</div>
		</div>
	);
};

export default SponsoringMatrix;
