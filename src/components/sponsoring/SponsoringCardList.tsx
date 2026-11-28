import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { ValueTag } from '@/components/toolkit/ValueTag';
import SponsoringRowMenu from '@/components/sponsoring/SponsoringRowMenu';
import SponsoringZettel from '@/components/sponsoring/SponsoringZettel';
import { formatEuro } from '@/lib/money';
import type { SponsoringCategory } from '@/lib/sponsorService';
import {
	hasAddables,
	sponsoringAddables,
	type SponsoringAddable
} from '@/lib/sponsoringKarte';
import {
	sponsoringEmptyNotice,
	sponsoringFooterLabel,
	type SponsoringOverviewFooter,
	type SponsoringOverviewRow
} from '@/lib/sponsoringTotals';
import { buildZettel, type ZettelInput, type ZettelTarget } from '@/lib/sponsoringZettel';
import { cn } from '@/lib/utils';

export interface SponsoringCardListProps {
	/** Die Preisliste — sie bestimmt, was das „+" an offenen Kategorien anbietet. */
	categories: SponsoringCategory[];
	/** Die **sichtbaren** Zeilen; der Fuß summiert genau diese (ADR 0006). */
	rows: SponsoringOverviewRow[];
	footer: SponsoringOverviewFooter;
	/** Firmen des Fests insgesamt — damit der Fuß den Filter beschriften kann. */
	totalRowCount: number;
	/** Laufender Suchbegriff; nur für den Hinweissatz, wenn nichts passt. */
	searchTerm: string;
	/** ⋮ → „Notiz" (#150). */
	onOpenNote: (sponsoringId: string) => void;
	/** ⋮ → „Firmendaten" (#150). */
	onOpenSponsor: (sponsoringId: string) => void;
	/** ⋮ → „Entfernen"; die Rückfrage stellt das Menü selbst. */
	onDelete: (sponsoringId: string) => void;
	/** „Übernehmen" im Zettel — und das sofortige Zuweisen aus dem „+"-Blatt. */
	onApply: (sponsoringId: string, target: ZettelTarget, input: ZettelInput) => void;
	/** „Entfernen" im Zettel. */
	onRemove: (sponsoringId: string, target: ZettelTarget) => void;
}

/** Was das eine Blatt von unten gerade trägt. */
type Sheet =
	| { kind: 'add'; sponsoringId: string }
	| { kind: 'zettel'; sponsoringId: string; target: ZettelTarget };

/* 40px Trefferfläche für alles, was man an der Karte antippt (#155: Vision §6
und WCAG 2.5.8). Die Marken sind hier der **einzige** Bedienweg — jede
Zuweisung, Änderung und jedes Entfernen läuft über sie. `inline-flex` hält die
Marke dabei auf genau dieser Höhe, ohne Zeilenschlacke darunter. */
const HIT = 'min-h-10';
const MARK = `${HIT} items-center`;

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte';

/** Wie ein Ziel im Blatt und an der Marke heißt — „Plakat bei Brauerei Voll". */
const targetName = (target: ZettelTarget): string =>
	target.kind === 'category'
		? target.category.name
		: target.kind === 'freeAmount'
			? 'Freibetrag'
			: 'Sachleistung';

/**
 * Sponsoring am Handy (#155, Variante K5 aus
 * `design-vision/entscheid-sponsoring-mobil-karten.html`): eine **Karte je
 * Firma**, die ausschließlich zeigt, was die Firma hat.
 *
 * - Kopfzeile: Firmenname · Zeilensumme · ⋮; darunter grau das Vorjahr, wo es
 *   eins gibt.
 * - Markenzeile: nur die gewählten Kategorien, Freibetrag und Sachleistung nur
 *   wenn gesetzt, am Ende ein einzelnes **„+"** — solange es etwas
 *   hinzuzufügen gibt.
 *
 * **Wer diese Karte erweitert: nichts in eine neue Zeile legen, was in die
 * Markenzeile passt.** Gemessen zählt nicht, wie viel man weglässt, sondern ob
 * die Karte eine Zeile dazubekommt (~27 px × 14 Firmen, #155).
 *
 * Bedient wird wie am Desktop über den Zettel (ADR 0009), nur kommt er als
 * Blatt von unten. Das „+" öffnet im selben Blatt *eine* Liste mit allem
 * Hinzufügbaren; eine Kategorie mit Standardwert wird beim Antippen sofort
 * zugewiesen, alles andere führt auf seinen Zettel.
 */
const SponsoringCardList: React.FC<SponsoringCardListProps> = ({
	categories,
	rows,
	footer,
	totalRowCount,
	searchTerm,
	onOpenNote,
	onOpenSponsor,
	onDelete,
	onApply,
	onRemove
}) => {
	/* Höchstens ein Blatt ist offen; die Zeile dazu wird bei jedem Render frisch
	nachgeschlagen, damit es nach dem Neuladen den neuen Stand zeigt. */
	const [sheet, setSheet] = useState<Sheet | null>(null);
	const close = () => setSheet(null);

	const emptyNotice = sponsoringEmptyNotice(totalRowCount, searchTerm);
	const sheetRow = sheet ? (rows.find((r) => r.sponsoringId === sheet.sponsoringId) ?? null) : null;

	const openZettel = (row: SponsoringOverviewRow, target: ZettelTarget) =>
		setSheet({ kind: 'zettel', sponsoringId: row.sponsoringId, target });

	const pickAddable = (row: SponsoringOverviewRow, addable: SponsoringAddable) => {
		if (addable.direct) {
			onApply(row.sponsoringId, addable.target, addable.direct);
			close();
		} else {
			openZettel(row, addable.target);
		}
	};

	/** Eine bestehende Marke: Antippen öffnet ihren Zettel. */
	const markButton = (row: SponsoringOverviewRow, target: ZettelTarget, tag: React.ReactNode) => (
		<button
			type="button"
			aria-label={`${targetName(target)} bei ${row.companyName}`}
			onClick={() => openZettel(row, target)}
			className={cn('inline-flex max-w-full', HIT, FOCUS)}
		>
			{tag}
		</button>
	);

	return (
		<div className="space-y-2">
			{rows.length === 0
				? emptyNotice && (
						<div className="border-2.5 border-tinte bg-white py-8 text-center text-sm text-tinte-soft">
							{emptyNotice}
						</div>
					)
				: rows.map((row) => {
						const addable = hasAddables(sponsoringAddables(row, categories));
						return (
							<div
								key={row.sponsoringId}
								data-sponsoring-card=""
								className="border-2.5 border-tinte bg-white px-3 py-2"
							>
								<div className="flex items-center gap-2">
									<span className="min-w-0 flex-1 truncate text-sm font-bold">
										{row.companyName}
									</span>
									<span className="shrink-0 font-display text-[15px] font-semibold tabular-nums">
										{formatEuro(row.total)}
									</span>
									{/* Dasselbe ⋮ wie in der Matrix (#150), 40px aus dem Toolkit. */}
									<SponsoringRowMenu
										companyName={row.companyName}
										onOpenNote={() => onOpenNote(row.sponsoringId)}
										onOpenSponsor={() => onOpenSponsor(row.sponsoringId)}
										onDelete={() => onDelete(row.sponsoringId)}
										className="-mr-2 shrink-0"
									/>
								</div>
								{/* Vorjahresbeitrag: immer grau (#69, Entscheid 4). */}
								{row.previousTotal != null && (
									<div className="text-[11px] text-tinte-soft">
										Vorjahr {formatEuro(row.previousTotal)}
									</div>
								)}
								<div className="mt-1 flex flex-wrap items-center gap-1.5">
									{row.positions.map((position) => {
										const category = categories.find((c) => c.id === position.categoryId);
										/* Eine Zuweisung auf eine Kategorie, die nicht (mehr) in der
										Preisliste steht, hat keinen Zettel — sie bleibt Anzeige. */
										const tag = (
											<ValueTag
												className={MARK}
												value={formatEuro(position.value)}
												overridden={position.overridden}
											>
												{position.label}
											</ValueTag>
										);
										return (
											<React.Fragment key={position.categoryId}>
												{category ? markButton(row, { kind: 'category', category }, tag) : tag}
											</React.Fragment>
										);
									})}
									{row.freeAmount != null &&
										markButton(
											row,
											{ kind: 'freeAmount' },
											<ValueTag tone="ink" className={MARK} value={formatEuro(row.freeAmount)}>
												Frei
											</ValueTag>
										)}
									{row.inKind &&
										markButton(
											row,
											{ kind: 'inKind' },
											/* Kürzt statt quer zu laufen — die Seite scrollt nie
											horizontal (Vision §6); der volle Text steht im title. */
											<ValueTag
												tone="muted"
												className={cn(MARK, 'max-w-full')}
												title={`${row.inKind.description} (${formatEuro(row.inKind.value)})`}
												value={`(${formatEuro(row.inKind.value)})`}
											>
												<span className="min-w-0 overflow-hidden text-ellipsis">
													{row.inKind.description}
												</span>
											</ValueTag>
										)}
									{addable && (
										<button
											type="button"
											aria-label={`Hinzufügen bei ${row.companyName}`}
											onClick={() => setSheet({ kind: 'add', sponsoringId: row.sponsoringId })}
											className={cn(
												'inline-flex min-w-10 items-center justify-center border-1.5 border-tinte bg-gelb px-2.5 text-[15px] font-extrabold leading-none text-tinte',
												HIT,
												FOCUS
											)}
										>
											+
										</button>
									)}
								</div>
							</div>
						);
					})}

			{/* Derselbe Fuß, dieselbe Regel: sichtbare Karten, beschriftet (ADR 0006). */}
			{rows.length > 0 && (
				<div className="flex items-center justify-between gap-2 border-2.5 border-tinte bg-white px-3 py-2.5">
					<span className="text-sm font-semibold">
						{sponsoringFooterLabel('Gesamtsumme', rows.length, totalRowCount)}
					</span>
					<span className="font-display text-[15px] font-semibold tabular-nums">
						{formatEuro(footer.total)}
					</span>
				</div>
			)}

			{/* Ein Blatt von unten für beides — die Liste des „+" und den Zettel. Wer
			in der Liste Freibetrag wählt, bleibt im Blatt; nur sein Inhalt wechselt. */}
			<Drawer open={sheet != null && sheetRow != null} onOpenChange={(o) => !o && close()}>
				<DrawerContent className="max-h-[78%] border-t-[3px] bg-papier">
					{sheet && sheetRow && sheet.kind === 'add' && (
						<AddSheet
							row={sheetRow}
							categories={categories}
							onPick={(addable) => pickAddable(sheetRow, addable)}
							onClose={close}
						/>
					)}
					{sheet && sheetRow && sheet.kind === 'zettel' && (
						<>
							<DrawerTitle className="sr-only">
								{targetName(sheet.target)} bei {sheetRow.companyName}
							</DrawerTitle>
							<SponsoringZettel
								key={`${sheetRow.sponsoringId}:${targetName(sheet.target)}`}
								variant="sheet"
								zettel={buildZettel(sheetRow, sheet.target)}
								onApply={(input) => {
									onApply(sheetRow.sponsoringId, sheet.target, input);
									close();
								}}
								onRemove={() => {
									onRemove(sheetRow.sponsoringId, sheet.target);
									close();
								}}
							/>
						</>
					)}
				</DrawerContent>
			</Drawer>
		</div>
	);
};

/** Der Inhalt des „+"-Blatts: eine Liste in zwei Gruppen. */
const AddSheet: React.FC<{
	row: SponsoringOverviewRow;
	categories: SponsoringCategory[];
	onPick: (addable: SponsoringAddable) => void;
	onClose: () => void;
}> = ({ row, categories, onPick, onClose }) => {
	const addables = sponsoringAddables(row, categories);
	const group = (title: string, entries: SponsoringAddable[]) =>
		entries.length > 0 && (
			<>
				<div className="px-1 pb-1 pt-2.5 text-[10px] font-extrabold uppercase tracking-[.07em] text-tinte-soft">
					{title}
				</div>
				{entries.map((addable) => (
					<button
						key={targetName(addable.target)}
						type="button"
						onClick={() => onPick(addable)}
						className={cn(
							'flex min-h-12 w-full items-center gap-2.5 border-b-1.5 border-linie bg-white px-2.5 text-left',
							FOCUS
						)}
					>
						<span data-addable-label="" className="flex-1 text-[13.5px] font-semibold">
							{addable.label}
						</span>
						<span
							className={cn(
								'font-display text-sm font-semibold',
								addable.direct ? 'text-gruen' : 'text-tinte-soft'
							)}
						>
							{addable.hint}
						</span>
					</button>
				))}
			</>
		);

	return (
		<div className="overflow-y-auto px-3 pb-4 pt-2">
			<DrawerTitle className="px-1 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
				Hinzufügen · {row.companyName}
			</DrawerTitle>
			{group('Kategorien', addables.categories)}
			{group('Sonstiges', addables.other)}
			<button
				type="button"
				onClick={onClose}
				className={cn(
					'mt-3 min-h-10 w-full border-2 border-tinte bg-white text-[12.5px] font-bold uppercase tracking-[.02em]',
					FOCUS
				)}
			>
				Schließen
			</button>
		</div>
	);
};

export default SponsoringCardList;
