import type { SponsoringOverviewRow } from '@/lib/sponsoringTotals';

export const SPONSORING_EXPORT_COLUMNS = ['Firma', 'Leistungen', 'Gesamt'];

/** Deterministische Euro-Formatierung für Exporte ("150,00 €"). */
function formatEuro(value: number): string {
	return `${value.toFixed(2).replace('.', ',')} €`;
}

/** Leistungen-Zelle: zugewiesene Kategorien plus Freibetrag, jeweils mit Wert. */
function positionsCell(row: SponsoringOverviewRow): string {
	const parts = row.positions.map((p) => `${p.label} (${formatEuro(p.value)})`);
	if (row.freeAmount != null) parts.push(`Freibetrag (${formatEuro(row.freeAmount)})`);
	return parts.join(', ');
}

/**
 * Builds the export cell rows of the Sponsoring-Übersicht (aligned to
 * {@link SPONSORING_EXPORT_COLUMNS}), with a trailing Gesamtsumme row.
 */
export function buildSponsoringExportRows(rows: SponsoringOverviewRow[]): string[][] {
	const cellRows = rows.map((row) => [row.companyName, positionsCell(row), formatEuro(row.total)]);
	const total = rows.reduce((acc, row) => acc + row.total, 0);
	cellRows.push(['Gesamtsumme', '', formatEuro(total)]);
	return cellRows;
}

function sanitizeFilenamePart(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

/** Builds the download filename for the Sponsoring-Übersicht export. */
export function buildSponsoringExportFilename(festivalName: string, suffix: 'pdf'): string {
	return `${sanitizeFilenamePart(festivalName)}_Sponsoring-Übersicht.${suffix}`;
}
