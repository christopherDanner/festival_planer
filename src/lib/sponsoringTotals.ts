import type { SponsoringAssignmentWithCategory, SponsoringWithDetails } from '@/lib/sponsorService';

/** Wirksamer Wert einer Zuweisung: überschriebener Wert, sonst Kategorie-Wert. */
export function assignmentValue(assignment: SponsoringAssignmentWithCategory): number {
	return assignment.value ?? assignment.category.value ?? 0;
}

/** Gesamtbeitrag eines Sponsorings: Σ zugewiesene Kategorie-Werte + Freibetrag. */
export function sponsoringTotal(sponsoring: SponsoringWithDetails): number {
	const assigned = sponsoring.assignments.reduce((acc, a) => acc + assignmentValue(a), 0);
	return assigned + (sponsoring.free_amount ?? 0);
}

/** Gesamtsumme des eingeworbenen Sponsorings für ein Fest. */
export function festivalSponsoringTotal(sponsorings: SponsoringWithDetails[]): number {
	return sponsorings.reduce((acc, s) => acc + sponsoringTotal(s), 0);
}

/** Eine zugewiesene Kategorie in der Übersicht (wirksamer Wert). */
export interface SponsoringOverviewPosition {
	label: string;
	value: number;
}

/** Eine Zeile der Sponsoring-Übersicht: ein Sponsor mit Positionen und Summe. */
export interface SponsoringOverviewRow {
	sponsoringId: string;
	companyName: string;
	positions: SponsoringOverviewPosition[];
	freeAmount: number | null;
	total: number;
}

/** Formt die Zeilen der Sponsoring-Übersicht, sortiert nach Firmenname. */
export function buildSponsoringOverviewRows(
	sponsorings: SponsoringWithDetails[]
): SponsoringOverviewRow[] {
	const rows = sponsorings.map((s) => ({
		sponsoringId: s.id,
		companyName: s.sponsor.company_name,
		positions: s.assignments.map((a) => ({ label: a.category.name, value: assignmentValue(a) })),
		freeAmount: s.free_amount,
		total: sponsoringTotal(s)
	}));
	rows.sort((a, b) => a.companyName.localeCompare(b.companyName, 'de'));
	return rows;
}
