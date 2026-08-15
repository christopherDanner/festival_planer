import { supabase } from '@/integrations/supabase/client';
import {
	festivalSponsoringTotal,
	sponsoringTotal,
	type SponsoringValue
} from '@/lib/sponsoringTotals';

export interface Sponsor {
	id: string;
	user_id: string;
	company_name: string;
	contact_person: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
	website: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Filter sponsors by company name (case-insensitive, trimmed substring match).
export const filterSponsors = (sponsors: Sponsor[], searchTerm: string): Sponsor[] => {
	const term = searchTerm.trim().toLowerCase();
	if (!term) return sponsors;
	return sponsors.filter((s) => s.company_name.toLowerCase().includes(term));
};

// Parse a user-entered category value, accepting German decimal comma
// ("200,50") as well as plain numbers ("200", "200.50"). Returns null for
// blank or non-numeric input so callers can store NULL instead of a value.
export const parseCategoryValue = (input: string): number | null => {
	const normalized = input.trim().replace(',', '.');
	if (normalized === '') return null;
	const value = Number(normalized);
	if (!Number.isFinite(value) || value < 0) return null;
	return value;
};

// Get all sponsors (global, shared workspace).
export const getSponsors = async (): Promise<Sponsor[]> => {
	const { data, error } = await supabase
		.from('sponsors')
		.select('*')
		.order('company_name', { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
};

// Create a sponsor, stamping the authenticated user as creator (ADR 0001).
export const createSponsor = async (
	sponsorData: Partial<Omit<Sponsor, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
		company_name: string;
	}
): Promise<string> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) throw new Error('User not authenticated');

	const { data, error } = await supabase
		.from('sponsors')
		.insert({ ...sponsorData, user_id: user.id })
		.select('id')
		.single();

	if (error) throw new Error(error.message);
	return data.id;
};

// Update a sponsor.
export const updateSponsor = async (
	sponsorId: string,
	updates: Partial<Sponsor>
): Promise<void> => {
	const { error } = await supabase.from('sponsors').update(updates).eq('id', sponsorId);
	if (error) throw new Error(error.message);
};

// Delete a sponsor. Seit dem RLS-Nachzug (ADR 0002) darf das jeder
// angemeldete Benutzer, nicht mehr nur der Ersteller.
export const deleteSponsor = async (sponsorId: string): Promise<void> => {
	const { error } = await supabase.from('sponsors').delete().eq('id', sponsorId);
	if (error) throw new Error(error.message);
};

// --- Sponsoring categories (per festival) -------------------------------

export interface SponsoringCategory {
	id: string;
	festival_id: string;
	name: string;
	value: number | null;
	created_at: string;
	updated_at: string;
}

// Get the sponsoring categories defined for a festival.
export const getCategories = async (festivalId: string): Promise<SponsoringCategory[]> => {
	const { data, error } = await supabase
		.from('sponsoring_categories')
		.select('*')
		.eq('festival_id', festivalId)
		.order('name', { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
};

// Create a sponsoring category for a festival.
export const createCategory = async (
	festivalId: string,
	name: string,
	value: number | null
): Promise<string> => {
	const { data, error } = await supabase
		.from('sponsoring_categories')
		.insert({ festival_id: festivalId, name, value })
		.select('id')
		.single();

	if (error) throw new Error(error.message);
	return data.id;
};

// Update a sponsoring category.
export const updateCategory = async (
	categoryId: string,
	updates: Partial<Pick<SponsoringCategory, 'name' | 'value'>>
): Promise<void> => {
	const { error } = await supabase
		.from('sponsoring_categories')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', categoryId);

	if (error) throw new Error(error.message);
};

// Delete a sponsoring category. Seit dem RLS-Nachzug (ADR 0002) darf das jeder
// angemeldete Benutzer, nicht mehr nur der Fest-Ersteller.
export const deleteCategory = async (categoryId: string): Promise<void> => {
	const { error } = await supabase.from('sponsoring_categories').delete().eq('id', categoryId);
	if (error) throw new Error(error.message);
};

// --- Sponsorings (Firma <-> Fest, mit Kategorie-Zuweisungen) -------------

export interface Sponsoring {
	id: string;
	festival_id: string;
	sponsor_id: string;
	free_amount: number | null;
	notes: string | null;
	/** Sachleistung: was die Firma nicht in Geld gibt (ADR 0008). Höchstens eine je Sponsoring. */
	in_kind_description: string | null;
	/** Geschätzter Wert der Sachleistung — zweite Zahl, zählt nie ins Geld (ADR 0008). */
	in_kind_value: number | null;
	/** Quellfest einer Sponsor-Übernahme; Grundlage des Vorjahresbeitrags (ADR 0008). */
	copied_from_festival_id: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Die Sachleistung eines Sponsorings: Beschreibung und geschätzter Wert.
 * Die zwei Spalten sind die Körnung — mehr als eine Sachleistung je
 * Sponsoring gibt es nicht (ADR 0008). Dass beide gemeinsam gesetzt werden,
 * ist Sache der Oberfläche; das Schema erzwingt es nicht.
 */
export type SponsoringInKind = Pick<Sponsoring, 'in_kind_description' | 'in_kind_value'>;

/**
 * Was die gewöhnliche Anlage eines Sponsorings offen lässt: die Sachleistung
 * und der Quellfest-Zeiger. Letzteren setzt **nur** die Sponsor-Übernahme —
 * bei der normalen Anlage gibt es kein Quellfest, und ohne eines gibt es auch
 * keinen Vorjahresbeitrag (ADR 0008).
 */
export type SponsoringInKindAndOrigin = Partial<
	SponsoringInKind & Pick<Sponsoring, 'copied_from_festival_id'>
>;

export interface SponsoringCategoryAssignment {
	id: string;
	sponsoring_id: string;
	category_id: string;
	/** Überschriebener Wert; NULL = Kategorie-Wert gilt. */
	value: number | null;
	created_at: string;
}

export interface SponsoringAssignmentWithCategory extends SponsoringCategoryAssignment {
	category: SponsoringCategory;
}

/** Zusammengesetztes Read-Shape für Übersicht, Summen und Übernahme. */
export interface SponsoringWithDetails extends Sponsoring {
	sponsor: Sponsor;
	assignments: SponsoringAssignmentWithCategory[];
}

/** Eine Kategorie-Zuweisung beim Anlegen/Bearbeiten eines Sponsorings. */
export interface SponsoringAssignmentInput {
	category_id: string;
	/** Überschriebener Wert; null = Kategorie-Wert gilt. */
	value: number | null;
}

const SPONSORING_SELECT = '*, sponsor:sponsors(*), assignments:sponsoring_category_assignments(*, category:sponsoring_categories(*))';

/**
 * Dieselbe Verknüpfung, aber nur die Felder der Geldregel (`sponsoringTotals`):
 * Freibetrag, überschriebener Zuweisungs-Wert, Kategorie-Standardwert. Für die
 * Plakat-Kennzahlen der Festliste (#92), die über alle Feste auf einmal liest.
 * Steht bewusst neben `SPONSORING_SELECT` — wächst die Geldregel (etwa um den
 * Sachwert aus ADR 0008), müssen beide Selects mitwachsen.
 */
export const SPONSORING_VALUES_SELECT =
	'festival_id, free_amount, assignments:sponsoring_category_assignments(value, category:sponsoring_categories(value))';

// Get all sponsorings of a festival incl. sponsor and assigned categories.
export const getSponsorings = async (festivalId: string): Promise<SponsoringWithDetails[]> => {
	const { data, error } = await supabase
		.from('sponsorings')
		.select(SPONSORING_SELECT)
		.eq('festival_id', festivalId);

	if (error) throw new Error(error.message);
	return (data as unknown as SponsoringWithDetails[]) || [];
};

// Create a sponsoring linking a global sponsor to a festival.
export const createSponsoring = async (
	festivalId: string,
	sponsorId: string,
	freeAmount: number | null,
	assignments: SponsoringAssignmentInput[],
	notes: string | null = null,
	extras: SponsoringInKindAndOrigin = {}
): Promise<string> => {
	const { data, error } = await supabase
		.from('sponsorings')
		.insert({
			festival_id: festivalId,
			sponsor_id: sponsorId,
			free_amount: freeAmount,
			notes,
			in_kind_description: extras.in_kind_description ?? null,
			in_kind_value: extras.in_kind_value ?? null,
			copied_from_festival_id: extras.copied_from_festival_id ?? null
		})
		.select('id')
		.single();

	if (error) throw new Error(error.message);

	if (assignments.length > 0) {
		const { error: assignError } = await supabase
			.from('sponsoring_category_assignments')
			.insert(assignments.map((a) => ({ ...a, sponsoring_id: data.id })));
		if (assignError) throw new Error(assignError.message);
	}
	return data.id;
};

// Update a sponsoring; the assignments replace the existing ones entirely.
// Der Quellfest-Zeiger ist bewusst nicht änderbar: er hält fest, woher das
// Sponsoring übernommen wurde, und das ändert sich beim Bearbeiten nicht.
export const updateSponsoring = async (
	sponsoringId: string,
	updates: Partial<Pick<Sponsoring, 'free_amount' | 'notes'> & SponsoringInKind>,
	assignments: SponsoringAssignmentInput[]
): Promise<void> => {
	const { error } = await supabase
		.from('sponsorings')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', sponsoringId);
	if (error) throw new Error(error.message);

	const { error: deleteError } = await supabase
		.from('sponsoring_category_assignments')
		.delete()
		.eq('sponsoring_id', sponsoringId);
	if (deleteError) throw new Error(deleteError.message);

	if (assignments.length > 0) {
		const { error: insertError } = await supabase
			.from('sponsoring_category_assignments')
			.insert(assignments.map((a) => ({ ...a, sponsoring_id: sponsoringId })));
		if (insertError) throw new Error(insertError.message);
	}
};

// Delete a sponsoring. Seit dem RLS-Nachzug (ADR 0002) darf das jeder
// angemeldete Benutzer, nicht mehr nur der Fest-Ersteller.
export const deleteSponsoring = async (sponsoringId: string): Promise<void> => {
	const { error } = await supabase.from('sponsorings').delete().eq('id', sponsoringId);
	if (error) throw new Error(error.message);
};

// --- Vorjahresbeitrag: der festübergreifende Leseweg (ADR 0008) -----------

/**
 * Der *Vorjahresbeitrag* eines Sponsorings: was dieselbe Firma beim *Quellfest*
 * beigetragen hat, samt dem Fest, aus dem die Zahl stammt.
 *
 * **Rein informativ** — der Betrag zählt in keine Summe des aktuellen Fests
 * (CONTEXT.md „Vorjahresbeitrag", ADR 0008). Er ist die Verhandlungsbasis beim
 * Anruf, kein eingeworbenes Geld. Darum steht er auch nicht als nackte Zahl da,
 * sondern immer mit seiner Herkunft.
 */
export interface PreviousSponsoring {
	/** Quellfest der Übernahme — die Zahl gehört diesem Fest, nicht dem aktuellen. */
	festivalId: string;
	/** Name des Quellfests; `null`, solange das Fest keinen trägt. */
	festivalName: string | null;
	/** Gesamtbeitrag der Firma beim Quellfest, gerechnet mit `sponsoringTotal()`. */
	total: number;
}

/**
 * Vorjahresbeitrag je Sponsoring-Id **des aktuellen Fests**. Wer fehlt, hat
 * keinen: ein von Hand eingetragenes Sponsoring kennt kein Quellfest (bewusst,
 * ADR 0008), und ein gelöschtes Quellfest hinterlässt `NULL`.
 */
export type PreviousSponsoringMap = Record<string, PreviousSponsoring>;

/**
 * Dieselbe Geldregel-Form wie `SPONSORING_VALUES_SELECT`, zusätzlich die Firma —
 * über sie läuft die Zuordnung zwischen Ziel- und Quellfest. Wächst die
 * Geldregel, wächst sie hier automatisch mit.
 */
const PREVIOUS_SPONSORING_SELECT = `sponsor_id, ${SPONSORING_VALUES_SELECT}`;

/** Quellfest-Sponsoring, so schmal wie Zuordnung und Geldregel es brauchen. */
type PreviousSponsoringRow = SponsoringValue & { festival_id: string; sponsor_id: string };

/** Firma + Fest — der Schlüssel, über den Zielfest und Quellfest sich treffen. */
const sponsorAtFestival = (festivalId: string, sponsorId: string) => `${festivalId} ${sponsorId}`;

/**
 * Liest den *Vorjahresbeitrag* aller Sponsorings eines Fests — der einzige
 * festübergreifende Leseweg des Sponsorings.
 *
 * Bewusst **strikt aus dem Quellfest** (`copied_from_festival_id`) und nicht aus
 * dem jüngsten früheren Fest mit derselben Firma: wer 2027 aus 2025 übernimmt,
 * will die Zahl von 2025 sehen, auch wenn es ein Fest 2026 gab (ADR 0008,
 * Nutzer-Entscheid). Preis dieser Schärfe: ein handeingetragenes Sponsoring hat
 * keinen Vorjahresbeitrag.
 *
 * Gelesen statt mitkopiert — wird das Quellfest nachträglich korrigiert, ändert
 * sich die Zahl mit. Ein Schnappschuss am Zielfest würde ab da lügen.
 *
 * Ein soft-gelöschtes Quellfest zählt weiterhin: der Vorjahresbeitrag ist
 * historische Information, die nicht verschwinden soll. Fürs Maßband
 * (`getPreviousFestivalTotal`) zählt es dagegen nicht.
 */
export const getPreviousSponsorings = async (
	festivalId: string
): Promise<PreviousSponsoringMap> => {
	const { data: own, error } = await supabase
		.from('sponsorings')
		.select('id, sponsor_id, copied_from_festival_id')
		.eq('festival_id', festivalId);

	if (error) throw new Error(error.message);

	const copied = (own ?? []).filter((s) => s.copied_from_festival_id != null);
	if (copied.length === 0) return {};

	const sourceFestivalIds = [...new Set(copied.map((s) => s.copied_from_festival_id as string))];

	// Alle Quellfeste in je einer Abfrage, nicht eine je Sponsoring. Der
	// Zeilendeckel der REST-Schicht (1000) ist hier kein Thema: gezählt werden
	// die Sponsorings weniger Feste, nicht die einer ganzen Fest-Wand (#92).
	const [sourceSponsorings, sourceFestivals] = await Promise.all([
		querySourceSponsorings(sourceFestivalIds),
		querySourceFestivals(sourceFestivalIds)
	]);

	const totals = new Map(
		sourceSponsorings.map((s) => [
			sponsorAtFestival(s.festival_id, s.sponsor_id),
			sponsoringTotal(s)
		])
	);
	const names = new Map(sourceFestivals.map((f) => [f.id, f.name]));

	const previous: PreviousSponsoringMap = {};
	for (const sponsoring of copied) {
		const sourceFestivalId = sponsoring.copied_from_festival_id as string;
		const total = totals.get(sponsorAtFestival(sourceFestivalId, sponsoring.sponsor_id));
		// Die Firma war beim Quellfest gar nicht erfasst — dann gibt es nichts zu
		// zeigen. Eine 0 wäre eine Aussage, die niemand getroffen hat.
		if (total === undefined) continue;
		previous[sponsoring.id] = {
			festivalId: sourceFestivalId,
			festivalName: names.get(sourceFestivalId) ?? null,
			total
		};
	}
	return previous;
};

const querySourceSponsorings = async (
	festivalIds: string[]
): Promise<PreviousSponsoringRow[]> => {
	const { data, error } = await supabase
		.from('sponsorings')
		.select(PREVIOUS_SPONSORING_SELECT)
		.in('festival_id', festivalIds);

	if (error) throw new Error(error.message);
	return (data as unknown as PreviousSponsoringRow[]) ?? [];
};

/**
 * Die Namen der Quellfeste. Bewusst **ohne** `deleted_at`-Filter: ein
 * soft-gelöschtes Quellfest liefert seinen Vorjahresbeitrag weiter.
 */
const querySourceFestivals = async (
	festivalIds: string[]
): Promise<{ id: string; name: string | null }[]> => {
	const { data, error } = await supabase
		.from('festivals')
		.select('id, name')
		.in('id', festivalIds);

	if (error) throw new Error(error.message);
	return data ?? [];
};

/**
 * Die Geld-Gesamtsumme des **vorigen Fests** — das Maßband des Bereichs
 * vergleicht dagegen, nicht gegen einen gesetzten Zielbetrag (ADR 0008).
 *
 * „Vorig" heißt: das nicht gelöschte Fest mit dem größten `start_date` unterhalb
 * des eigenen. Anders als beim *Vorjahresbeitrag* zählt hier kein Quellfest-
 * Zeiger mit — verglichen wird mit dem, was zeitlich davor lag.
 *
 * `null` heißt „kein früheres Fest" und damit **kein Balken**, nur die Zahl.
 * Beim allerersten Fest ist das der Normalfall und kein Fehler.
 */
export const getPreviousFestivalTotal = async (festivalId: string): Promise<number | null> => {
	const { data: own, error: ownError } = await supabase
		.from('festivals')
		.select('start_date')
		.eq('id', festivalId)
		.maybeSingle();

	if (ownError) throw new Error(ownError.message);
	if (!own) return null;

	const { data: previous, error: previousError } = await supabase
		.from('festivals')
		.select('id')
		.is('deleted_at', null)
		.lt('start_date', own.start_date)
		.order('start_date', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (previousError) throw new Error(previousError.message);
	if (!previous) return null;

	const { data: sponsorings, error } = await supabase
		.from('sponsorings')
		.select(SPONSORING_VALUES_SELECT)
		.eq('festival_id', previous.id);

	if (error) throw new Error(error.message);
	return festivalSponsoringTotal((sponsorings as unknown as SponsoringValue[]) ?? []);
};
