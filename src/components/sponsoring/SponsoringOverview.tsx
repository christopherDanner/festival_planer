import React from 'react';
import { Building2, Edit, FileDown, Import, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SponsoringHeadline from '@/components/sponsoring/SponsoringHeadline';
import SponsoringMatrix from '@/components/sponsoring/SponsoringMatrix';
import SponsoringSearch from '@/components/sponsoring/SponsoringSearch';
import type { SponsoringCategory, SponsoringWithDetails } from '@/lib/sponsorService';
import {
	buildSponsoringOverviewFooter,
	buildSponsoringOverviewRows,
	festivalInKindTotal,
	festivalSponsoringTotal,
	filterSponsoringOverviewRows,
	sponsoringFooterLabel,
	sponsoringNoMatchNotice
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
	onEdit: (sponsoringId: string) => void;
	onDelete: (sponsoringId: string) => void;
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
	onEdit,
	onDelete
}) => {
	/* Vorjahresbeitrag je Sponsoring und Geldsumme des vorigen Fests kommen aus
	`getPreviousSponsorings()` / `getPreviousFestivalTotal()` (#145). Solange es
	den Leseweg nicht gibt, zeigt die Matrix den Leerfall: keine Vorjahr-Unterzeile
	und — laut #69, Entscheid 5 — gar kein Maßband. */
	const allRows = buildSponsoringOverviewRows(sponsorings);
	const rows = filterSponsoringOverviewRows(allRows, searchTerm);
	const footer = buildSponsoringOverviewFooter(rows, categories);
	const total = festivalSponsoringTotal(sponsorings);

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
					<Button onClick={onCreate} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						<span>Sponsoring</span>
					</Button>
				</div>
			</div>

			<SponsoringHeadline
				total={total}
				sponsorCount={sponsorings.length}
				inKindTotal={festivalInKindTotal(sponsorings)}
				previousFestivalTotal={null}
			/>

			{/* Mobile: Karten-Liste */}
			<div className="md:hidden space-y-2">
				{allRows.length === 0 ? (
					<div className="border bg-card py-8 text-center text-sm text-muted-foreground">
						Noch keine Sponsorings erfasst
					</div>
				) : rows.length === 0 ? (
					<div className="border bg-card py-8 text-center text-sm text-muted-foreground">
						{sponsoringNoMatchNotice(searchTerm)}
					</div>
				) : (
					<>
						{rows.map((row) => (
							<div key={row.sponsoringId} className="border bg-card p-3">
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate">{row.companyName}</div>
										<div className="text-sm font-semibold mt-0.5">{formatEuro(row.total)}</div>
									</div>
									<div className="flex items-center gap-1 shrink-0">
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8"
											onClick={() => onEdit(row.sponsoringId)}>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 text-destructive/70 hover:text-destructive"
											onClick={() => onDelete(row.sponsoringId)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
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
			</div>

			{/* Desktop: Paket-Matrix */}
			<div className="hidden md:block">
				<SponsoringMatrix
					categories={categories}
					rows={rows}
					footer={footer}
					totalRowCount={allRows.length}
					searchTerm={searchTerm}
					onDelete={onDelete}
				/>
				{/* Ein Fest ohne Sponsoring ist kein Suchergebnis — es behält diesen
				Satz auch bei getipptem Begriff. Die Hinweiszeile bei keinem Treffer
				steht in der Matrix selbst. */}
				{allRows.length === 0 && (
					<p className="border bg-card py-8 text-center text-sm text-muted-foreground">
						Noch keine Sponsorings erfasst
					</p>
				)}
			</div>
		</div>
	);
};

export default SponsoringOverview;
