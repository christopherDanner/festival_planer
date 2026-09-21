import { supabase } from '@/integrations/supabase/client';
import { festYear } from '@/lib/festDates';
import { getUserFestivals, type Festival } from '@/lib/festivalService';
import { fetchAllRows } from '@/lib/restPaging';
import {
	buildSponsorHistory,
	referenceFestival,
	type SponsorHistoryMap,
	type SponsorshipLink
} from '@/lib/sponsorHistory';

/** Was die Sponsoren-Seite für die Historie-Spalte und den Segment-Schalter braucht. */
export interface SponsorHistoryLoad {
	/** Historie je Sponsor-ID; Firmen ohne Sponsoring fehlen (siehe `sponsorHistoryOf`). */
	history: SponsorHistoryMap;
	/** Das Bezugsfest für „heuer" — null zwischen zwei Festen. */
	referenceFestival: Festival | null;
	/** Jahr des Bezugsfests, wie es an Schalter und Zählzeile geht; null ohne Bezugsfest. */
	referenceYear: number | null;
}

/** Nur die Verknüpfung; Beträge gehen die Historie nichts an (rein informativ). */
const LINK_SELECT = 'sponsor_id, festival_id';

/**
 * Lädt die Sponsoren-Historie für **alle** Firmen auf einmal — ein Lesevorgang
 * für die Seite, nicht einer je Zeile. Die Festliste liefert dabei zweierlei:
 * die Jahre der Verknüpfungen und das Bezugsfest; gelöschte Feste sind darin
 * schon weg (Soft-Delete, #8), also zählen sie auch in der Historie nicht mit.
 */
export async function getSponsorHistory(today: Date = new Date()): Promise<SponsorHistoryLoad> {
	const [festivals, links] = await Promise.all([getUserFestivals(), getSponsorshipLinks()]);
	const reference = referenceFestival(festivals, today);

	return {
		history: buildSponsorHistory(links, festivals, reference?.id ?? null),
		referenceFestival: reference,
		referenceYear: reference ? festYear(reference.start_date) : null
	};
}

/**
 * Alle Verknüpfungen Firma ↔ Fest, ohne Fest-Filter: die Historie ist
 * festübergreifend. Geblättert wird über `fetchAllRows`, weil der
 * Sponsorenbestand monoton wächst (ADR 0010) und eine gedeckelte Antwort still
 * zu wenig zählen würde — eine falsche Zahl in der Zeile ist schlimmer als
 * keine. Im Normalfall bleibt es bei der einen Abfrage.
 */
function getSponsorshipLinks(): Promise<SponsorshipLink[]> {
	return fetchAllRows<SponsorshipLink>((from, to) =>
		supabase.from('sponsorings').select(LINK_SELECT, { count: 'exact' }).range(from, to)
	);
}
