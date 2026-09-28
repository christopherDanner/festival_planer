import React from 'react';
import { Building2, FileDown, Import, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SponsoringAnleitung from '@/components/sponsoring/SponsoringAnleitung';
import SponsoringHeadline from '@/components/sponsoring/SponsoringHeadline';
import SponsoringHinweisstreifen from '@/components/sponsoring/SponsoringHinweisstreifen';
import SponsoringMatrix from '@/components/sponsoring/SponsoringMatrix';
import SponsoringSearch from '@/components/sponsoring/SponsoringSearch';
import KategorieAnlegenKnopf from '@/components/sponsoring/KategorieAnlegenKnopf';
import type { SponsoringCategory, SponsoringWithDetails } from '@/lib/sponsorService';
import type { ZettelInput, ZettelTarget } from '@/lib/sponsoringZettel';
import type { CategoryImpact, CategoryZettelInput } from '@/lib/sponsoringPreisliste';
import { sponsoringHinweis, sponsoringLeerzustand } from '@/lib/sponsoringLeerzustand';
import {
	buildSponsoringOverviewFooter,
	buildSponsoringOverviewRows,
	festivalInKindTotal,
	festivalSponsoringTotal,
	filterSponsoringOverviewRows,
	sponsoringEmptyNotice,
	sponsoringFooterLabel
} from '@/lib/sponsoringTotals';
import { formatEuro } from '@/lib/money';

export interface SponsoringOverviewProps {
	/** Alle Sponsorings des Fests — die Grundlage der Fest-Kennzahl. */
	sponsorings: SponsoringWithDetails[];
	/** Die Preisliste des Fests; sie bestimmt die Spalten und filtert nie mit. */
	categories: SponsoringCategory[];
	searchTerm: string;
	onSearchChange: (value: string) => void;
	onCreate: () => void;
	onTransfer: () => void;
	onExportPdf: () => void;
	onDelete: (sponsoringId: string) => void;
	/** „Übernehmen" im Zettel der Matrix. */
	onApply: (sponsoringId: string, target: ZettelTarget, input: ZettelInput) => void;
	/** „Entfernen" im Zettel der Matrix. */
	onRemove: (sponsoringId: string, target: ZettelTarget) => void;
	/** Reichweite je Kategorie-Id über alle Sponsorings — der Zettel beziffert sie. */
	categoryImpacts: Record<string, CategoryImpact>;
	/**
	 * „Übernehmen" im Zettel der Preisliste. `null` heißt **anlegen** — der Kopf
	 * schreibt die Kategorie, an der er hängt, „+ KATEGORIE" eine neue (#149).
	 */
	onCategoryApply: (category: SponsoringCategory | null, input: CategoryZettelInput) => void;
	/** „Kategorie löschen" — die bezifferte Rückfrage hat der Zettel schon gestellt. */
	onCategoryDelete: (category: SponsoringCategory) => void;
}

/**
 * Die Sponsoring-Übersicht als Ganzes: Werkzeugleiste mit Suche, Bereichskopf
 * und darunter die Paket-Matrix (Desktop) bzw. die Karten-Liste (Handy).
 * Ohne Datenzugriff, damit die Aufteilung aus ADR 0006 prüfbar bleibt:
 *
 * - **Bereichskopf** — Fest-Kennzahl über *alle* Sponsorings; das Suchfeld
 *   rührt ihn nicht an. Wer das „korrigiert", bricht ADR 0006.
 * - **Tabellenfuß** — rechnet über die *sichtbaren* Zeilen und beschriftet das.
 *
 * Beide Wege gehen durch dieselben Funktionen in `sponsoringTotals`; es gibt
 * keinen zweiten Rechenweg.
 */
const SponsoringOverview: React.FC<SponsoringOverviewProps> = ({
	sponsorings,
	categories,
	searchTerm,
	onSearchChange,
	onCreate,
	onTransfer,
	onExportPdf,
	onDelete,
	onApply,
	onRemove,
	categoryImpacts,
	onCategoryApply,
	onCategoryDelete
}) => {
	/* Vorjahresbeitrag je Sponsoring und Geldsumme des vorigen Fests kommen aus
	`getPreviousSponsorings()` / `getPreviousFestivalTotal()` (#145). Solange es
	den Leseweg nicht gibt, zeigt die Matrix den Leerfall: keine Vorjahr-Unterzeile
	und — laut #69, Entscheid 5 — gar kein Maßband. */
	const allRows = buildSponsoringOverviewRows(sponsorings);
	const rows = filterSponsoringOverviewRows(allRows, searchTerm);
	const footer = buildSponsoringOverviewFooter(rows, categories);
	const total = festivalSponsoringTotal(sponsorings);

	/* Welche der drei leeren Formen gerade gilt (#152). Die Matrix hat zwei
	Achsen; fehlt eine, steht ein Hinweisstreifen daneben, fehlen beide, steht an
	ihrer Stelle die Anleitung. */
	const leerzustand = sponsoringLeerzustand(categories.length, sponsorings.length);
	const emptyNotice = sponsoringEmptyNotice(allRows.length, searchTerm);

	const hinweis = sponsoringHinweis(leerzustand);

	/*
	 * Der Streifen steht an genau einer der beiden Kanten der Tabelle, und beide
	 * Hälften des Bereichs rufen ihn an beiden ab — welche der vier Stellen ihn
	 * zeigt, entscheidet allein `aboveTable`. `weld` ist die Kante, die er der
	 * Tabelle überlässt; am Handy klebt er an nichts und rahmt sich rundum
	 * (ADR 0003 §2: Layout gehört dem Aufrufer).
	 */
	const streifenAn = (kante: 'above' | 'below', weld?: string) =>
		hinweis && hinweis.aboveTable === (kante === 'above') ? (
			<SponsoringHinweisstreifen
				lead={hinweis.lead}
				text={hinweis.text}
				actionLabel={hinweis.actionLabel}
				onAction={onTransfer}
				className={weld}
			/>
		) : null;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Sponsoring-Übersicht
					</h2>
					<p className="text-sm text-muted-foreground">
						Erfasste Sponsoren mit Leistungen und Gesamtsumme
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<SponsoringSearch
						searchTerm={searchTerm}
						onSearchChange={onSearchChange}
						onReset={() => onSearchChange('')}
						shown={rows.length}
						total={allRows.length}
					/>
					<Button onClick={onTransfer} size="sm" variant="outline">
						<Import className="h-4 w-4 mr-2" />
						<span>Übernahme</span>
					</Button>
					<Button
						onClick={onExportPdf}
						size="sm"
						variant="outline"
						disabled={allRows.length === 0}>
						<FileDown className="h-4 w-4 mr-2" />
						<span>PDF</span>
					</Button>
					{/* Derselbe Zettel wie am Spaltenkopf, nur leer — die Preisliste ist
					der erste Schritt im Bereich, vor den Firmen (CONTEXT.md „Preisliste").
					Denselben Weg trägt die Anleitung des Leerzustands L1 (#152). */}
					<KategorieAnlegenKnopf
						align="end"
						onCategoryApply={(input) => onCategoryApply(null, input)}
						trigger={
							<Button size="sm" variant="outline" aria-label="Kategorie anlegen">
								<Plus className="h-4 w-4 mr-2" />
								<span>Kategorie</span>
							</Button>
						}
					/>
					<Button onClick={onCreate} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						<span>Sponsoring</span>
					</Button>
				</div>
			</div>

			<SponsoringHeadline
				total={total}
				sponsorCount={sponsorings.length}
				categoryCount={categories.length}
				inKindTotal={festivalInKindTotal(sponsorings)}
				previousFestivalTotal={null}
			/>

			{/* L1 — weder Preisliste noch Firmen: an die Stelle der Tabelle tritt die
			Anleitung, für beide Breiten dieselbe (#152). Ohne Kategorie-Spalten wäre
			die Tabelle ohnehin keine Paket-Matrix mehr. */}
			{leerzustand === 'nichts' ? (
				<SponsoringAnleitung
					onCategoryApply={(input) => onCategoryApply(null, input)}
					onTransfer={onTransfer}
				/>
			) : (
				<>
					{/* Mobile: Karten-Liste. Bedient wird sie noch nicht — die Karten-Form
					des Zettels ist ein eigener Slice (ADR 0009). Das betrifft seit #149 auch
					die Preisliste: ohne Spaltenköpfe lässt sich am Handy nur anlegen
					(„+ KATEGORIE" steht in der Werkzeugleiste), nicht umbenennen, ändern
					oder löschen. Die abgelöste zweite Tabelle konnte das — bewusst in
					Kauf genommen, weil der Bereich genau eine Tabelle haben soll.

					Die Leerzustände gelten hier genauso, nur in Kartenform (#152); der
					Streifen rahmt sich dabei rundum, weil er an keiner Tabelle klebt. */}
					<div className="md:hidden space-y-2">
						{streifenAn('above')}
						{rows.length === 0 ? (
							emptyNotice && (
								<div className="border bg-card py-8 text-center text-sm text-muted-foreground">
									{emptyNotice}
								</div>
							)
						) : (
							<>
								{rows.map((row) => (
									<div key={row.sponsoringId} className="border bg-card p-3">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<div className="font-medium truncate">{row.companyName}</div>
												<div className="text-sm font-semibold mt-0.5">
													{formatEuro(row.total)}
												</div>
											</div>
											<Button
												size="icon"
												variant="ghost"
												className="h-8 w-8 shrink-0 text-destructive/70 hover:text-destructive"
												aria-label={`Sponsoring von ${row.companyName} entfernen`}
												onClick={() => onDelete(row.sponsoringId)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
										{(row.positions.length > 0 || row.freeAmount != null) && (
											<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
												{row.positions.map((p, i) => (
													<span key={i}>
														{p.label} ({formatEuro(p.value)})
													</span>
												))}
												{row.freeAmount != null && (
													<span>Freibetrag ({formatEuro(row.freeAmount)})</span>
												)}
											</div>
										)}
									</div>
								))}
								{/* Derselbe Fuß, dieselbe Regel: sichtbare Zeilen, beschriftet. */}
								<div className="border bg-card p-3 flex items-center justify-between gap-2">
									<span className="font-semibold text-sm">
										{sponsoringFooterLabel('Gesamtsumme', rows.length, allRows.length)}
									</span>
									<span className="font-semibold">{formatEuro(footer.total)}</span>
								</div>
							</>
						)}
						{streifenAn('below')}
					</div>

					{/* Desktop: Paket-Matrix. Der Streifen verschweißt sich mit ihrem
					Rahmen — er ist ein Streifen *an* der Tabelle, kein zweiter Kasten
					daneben; die Kante zwischen beiden zieht die Tabelle. */}
					<div className="hidden md:block">
						{streifenAn('above', 'border-b-0')}
						<SponsoringMatrix
							categories={categories}
							rows={rows}
							footer={footer}
							totalRowCount={allRows.length}
							searchTerm={searchTerm}
							categoryImpacts={categoryImpacts}
							onDelete={onDelete}
							onApply={onApply}
							onRemove={onRemove}
							onCategoryApply={onCategoryApply}
							onCategoryDelete={onCategoryDelete}
						/>
						{streifenAn('below', 'border-t-0')}
					</div>
				</>
			)}
		</div>
	);
};

export default SponsoringOverview;
