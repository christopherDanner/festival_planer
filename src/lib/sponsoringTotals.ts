import type { SponsoringWithDetails } from '@/lib/sponsorService';

/**
 * Was die Geldregel von einer Zuweisung braucht — nur der überschriebene Wert
 * und der Standardwert der Kategorie. Bewusst strukturell statt
 * `SponsoringAssignmentWithCategory`, damit auch die schmale Kennzahl-Abfrage
 * der Plakatwand (#92) dieselbe Regel rechnet, statt sie zu kopieren.
 */
export interface AssignedValue {
	value: number | null;
	category: { value: number | null };
}

/** Was die Geldregel von einem Sponsoring braucht. */
export interface SponsoringValue {
	free_amount: number | null;
	assignments: AssignedValue[];
}

/** Wirksamer Wert einer Zuweisung: überschriebener Wert, sonst Kategorie-Wert. */
export function assignmentValue(assignment: AssignedValue): number {
	return assignment.value ?? assignment.category.value ?? 0;
}

/** Gesamtbeitrag eines Sponsorings: Σ zugewiesene Kategorie-Werte + Freibetrag. */
export function sponsoringTotal(sponsoring: SponsoringValue): number {
	const assigned = sponsoring.assignments.reduce((acc, a) => acc + assignmentValue(a), 0);
	return assigned + (sponsoring.free_amount ?? 0);
}

/** Gesamtsumme des eingeworbenen Sponsorings für ein Fest. */
export function festivalSponsoringTotal(sponsorings: SponsoringValue[]): number {
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
