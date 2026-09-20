import { supabase } from '@/integrations/supabase/client';
import { getUserFestivals, type Festival } from '@/lib/festivalService';
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
		referenceFestival: reference
	};
}

/** Zeilen je Antwort. Die REST-Schicht deckelt selbst — siehe `getSponsorshipLinks`. */
const PAGE_SIZE = 1000;

/**
 * Alle Verknüpfungen Firma ↔ Fest, ohne Fest-Filter: die Historie ist
 * festübergreifend.
 *
 * Geblättert wird, weil die REST-Schicht eine Antwort deckelt (PostgREST:
 * standardmäßig 1000 Zeilen) und der Sponsorenbestand monoton wächst (ADR 0010)
 * — eine gedeckelte Antwort würde still zu wenig zählen und die Löschsperre
 * (#159) auf eine falsche Zahl stellen. `count` nennt die wahre Gesamtzahl;
 * solange Zeilen fehlen, kommt die nächste Seite. Im Normalfall bleibt es bei
 * der einen Abfrage.
 */
async function getSponsorshipLinks(): Promise<SponsorshipLink[]> {
	const rows: SponsorshipLink[] = [];
	let total: number | null = null;

	for (;;) {
		const { data, error, count } = await supabase
			.from('sponsorings')
			.select(LINK_SELECT, { count: 'exact' })
			.range(rows.length, rows.length + PAGE_SIZE - 1);

		if (error) throw new Error(error.message);
		const page = (data ?? []) as SponsorshipLink[];
		rows.push(...page);
		total ??= count;

		// Fertig, sobald alle Treffer da sind. `page.length === 0` fängt den Fall,
		// dass die Zeilen unter uns weggelöscht wurden — sonst liefe das ewig.
		if (total === null || rows.length >= total || page.length === 0) return rows;
	}
}
