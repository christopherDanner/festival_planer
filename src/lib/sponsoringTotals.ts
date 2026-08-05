import type { SponsoringCategory, SponsoringWithDetails } from '@/lib/sponsorService';
import { matchesCompanyName } from '@/lib/companySearch';

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

/**
 * Sachwert eines Sponsorings: der geschätzte Wert seiner Sachleistung.
 * Zweite Zahl neben dem Geld — wird nie zum Gesamtbeitrag addiert (ADR 0008).
 */
export function sponsoringInKindValue(sponsoring: SponsoringWithDetails): number {
	return sponsoring.in_kind_value ?? 0;
}

/** Sachwert eines Fests: Σ der Sachleistungs-Schätzwerte, nie im Geld enthalten. */
export function festivalInKindTotal(sponsorings: SponsoringWithDetails[]): number {
	return sponsorings.reduce((acc, s) => acc + sponsoringInKindValue(s), 0);
}

/** Eine zugewiesene Kategorie in der Übersicht (wirksamer Wert). */
export interface SponsoringOverviewPosition {
	categoryId: string;
	label: string;
	value: number;
	/** Wirksamer Wert weicht vom Standardwert der Kategorie ab (Wertmarke wird rot). */
	overridden: boolean;
}

/** Die Sachleistung einer Zeile; höchstens eine je Sponsoring (ADR 0008). */
export interface SponsoringOverviewInKind {
	description: string;
	/** Geschätzter Sachwert; 0, solange keiner erfasst ist. */
	value: number;
}

/** Eine Zeile der Sponsoring-Übersicht: ein Sponsor mit Positionen und Summe. */
export interface SponsoringOverviewRow {
	sponsoringId: string;
	companyName: string;
	/** Flache Liste der zugewiesenen Kategorien (Reihenfolge des Sponsorings). */
	positions: SponsoringOverviewPosition[];
	/** Dieselben Positionen je Kategorie-Id — der Zugriff, den die Matrix braucht. */
	positionsByCategoryId: Record<string, SponsoringOverviewPosition>;
	freeAmount: number | null;
	inKind: SponsoringOverviewInKind | null;
	/** Geld: Σ Kategorien + Freibetrag. Der Sachwert steckt nie darin. */
	total: number;
	/** Vorjahresbeitrag aus dem Quellfest; null bei handeingetragenem Sponsoring. */
	previousTotal: number | null;
}

/** Sachleistung einer Zeile; ohne Beschreibung gibt es keine. */
function overviewInKind(sponsoring: SponsoringWithDetails): SponsoringOverviewInKind | null {
	const description = sponsoring.in_kind_description;
	if (!description) return null;
	return { description, value: sponsoringInKindValue(sponsoring) };
}

/**
 * Formt die Zeilen der Sponsoring-Übersicht, sortiert nach Firmenname.
 *
 * `previousTotals` bildet Sponsoring-Id auf den Vorjahresbeitrag ab
 * (`getPreviousSponsorings()`, #145); wer fehlt, ist handeingetragen.
 */
export function buildSponsoringOverviewRows(
	sponsorings: SponsoringWithDetails[],
	previousTotals: Record<string, number> = {}
): SponsoringOverviewRow[] {
	const rows = sponsorings.map((s) => {
		const positions = s.assignments.map((a) => ({
			categoryId: a.category_id,
			label: a.category.name,
			value: assignmentValue(a),
			/* Ohne Standardwert gibt es nichts, wovon der Wert abweichen könnte. */
			overridden: a.category.value != null && a.value != null && a.value !== a.category.value
		}));
		return {
			sponsoringId: s.id,
			companyName: s.sponsor.company_name,
			positions,
			positionsByCategoryId: Object.fromEntries(positions.map((p) => [p.categoryId, p])),
			freeAmount: s.free_amount,
			inKind: overviewInKind(s),
			total: sponsoringTotal(s),
			previousTotal: previousTotals[s.id] ?? null
		};
	});
	rows.sort((a, b) => a.companyName.localeCompare(b.companyName, 'de'));
	return rows;
}

/**
 * Firmennamen-Suche über die Zeilen der Übersicht — die Matching-Regel steht in
 * `matchesCompanyName`, damit hier und in den Sponsoren-Stammdaten dieselbe
 * Firma gefunden wird (#151). Filtert ausschließlich **Zeilen**; die Preisliste
 * und damit die Spalten bleiben unberührt, sonst springt das Layout beim Tippen.
 */
export function filterSponsoringOverviewRows(
	rows: SponsoringOverviewRow[],
	searchTerm: string
): SponsoringOverviewRow[] {
	return rows.filter((row) => matchesCompanyName(row.companyName, searchTerm));
}

/**
 * Beschriftung eines Tabellenfußes, der über die **sichtbaren** Zeilen rechnet.
 * Fehlt eine Zeile, nennt sie die Zahl („Σ je Kategorie · 3 von 14 Firmen") —
 * ohne sie wäre eine Kategorie-Summe über drei Firmen eine stille Lüge (ADR
 * 0006: alle Summen rechnen gefiltert und sagen es in der Beschriftung).
 *
 * Auslöser ist die **fehlende Zeile**, nicht der getippte Begriff: passt der
 * Begriff auf alle Firmen, summiert der Fuß auch alle und hat nichts
 * offenzulegen — dass die Suche läuft, sagt der Zähler an der Suche.
 * Bereichskopf und Dashboard bleiben ohnehin unberührt: die rechnen als
 * Fest-Kennzahl über alle Sponsorings.
 */
export function sponsoringFooterLabel(base: string, shown: number, total: number): string {
	if (shown === total) return base;
	return `${base} · ${shown} von ${total} Firmen`;
}

/**
 * Hinweiszeile, wenn kein Firmenname zur Suche passt. Steht einmal hier, weil
 * Matrix (Desktop) und Karten-Liste (Handy) denselben Satz zeigen müssen.
 */
export function sponsoringNoMatchNotice(searchTerm: string): string {
	return `Keine Firma passt zu „${searchTerm.trim()}"`;
}

/** Der Tabellenfuß der Sponsoring-Matrix: eine Summe je Spalte. */
export interface SponsoringOverviewFooter {
	/** Σ je Kategorie-Id — jede Kategorie der Preisliste kommt vor, notfalls mit 0. */
	perCategoryId: Record<string, number>;
	/** Σ Freibeträge. */
	freeAmount: number;
	/** Sachwert des Fests — steht neben dem Geld, nie darin (ADR 0008). */
	inKindValue: number;
	/** Geld-Gesamtsumme der übergebenen Zeilen. */
	total: number;
}

/**
 * Summiert die übergebenen Zeilen spaltenweise. Bewusst über die *Zeilen* und
 * nicht über die Sponsorings: was der Fuß summiert, ist genau das, was in der
 * Tabelle steht (ADR 0006 — gefiltert wird ab #151 mitgerechnet).
 */
export function buildSponsoringOverviewFooter(
	rows: SponsoringOverviewRow[],
	categories: SponsoringCategory[]
): SponsoringOverviewFooter {
	const perCategoryId = Object.fromEntries(categories.map((c) => [c.id, 0]));
	let freeAmount = 0;
	let inKindValue = 0;
	let total = 0;

	for (const row of rows) {
		for (const position of row.positions) {
			if (position.categoryId in perCategoryId) {
				perCategoryId[position.categoryId] += position.value;
			}
		}
		freeAmount += row.freeAmount ?? 0;
		inKindValue += row.inKind?.value ?? 0;
		total += row.total;
	}

	return { perCategoryId, freeAmount, inKindValue, total };
}
