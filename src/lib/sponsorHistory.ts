/** Die Sponsoren-Historie (CONTEXT.md): was ein Sponsor über alle Feste hinweg
beigetragen hat, reduziert auf Jahr des letzten Sponsorings und Anzahl der Feste.
Reines Rechenmodul ohne React und ohne Datenzugriff — die Sponsoren-Seite
importiert von hier und rechnet nicht selbst (Muster ADR 0006 / `materialCosts.ts`). */

import { festDayStart } from '@/lib/festDates';

/** Die Historie einer Firma, wie sie in der Zeile und im Filter gebraucht wird. */
export interface SponsorHistory {
	sponsorId: string;
	/** Jahr des letzten Sponsorings; null, wenn es keines mit Datum gibt. */
	lastYear: number | null;
	/** Anzahl der Feste, bei denen die Firma erfasst war. */
	festivalCount: number;
	/** Sponsert die Firma das Bezugsfest („heuer")? Ohne Bezugsfest immer false. */
	sponsorsReferenceFestival: boolean;
}

/** Historie je Sponsor-ID. */
export type SponsorHistoryMap = Record<string, SponsorHistory>;

/** Die Historie einer Firma — ohne Eintrag die leere, damit die Zeile nie auf
`undefined` trifft. */
export function sponsorHistoryOf(history: SponsorHistoryMap, sponsorId: string): SponsorHistory {
	return (
		history[sponsorId] ?? {
			sponsorId,
			lastYear: null,
			festivalCount: 0,
			sponsorsReferenceFestival: false
		}
	);
}

/** Verknüpfung Firma ↔ Fest — mehr braucht die Historie von `sponsorings` nicht. */
export interface SponsorshipLink {
	sponsor_id: string;
	festival_id: string;
}

/** Ein Fest, so schmal wie die Historie es liest: Zugehörigkeit und Jahr. */
export interface HistoryFestival {
	id: string;
	/** Das Jahr kommt aus `festivals.start_date`. */
	start_date: string | null;
}

/**
 * Rechnet die Verknüpfungen auf die Historie je Sponsor um.
 *
 * `festivals` sind die **sichtbaren** Feste — gelöschte gehören nicht hinein
 * (Soft-Delete, #8). Eine Verknüpfung auf ein Fest, das nicht dabei ist, zählt
 * darum weder ins Jahr noch in die Anzahl.
 */
export function buildSponsorHistory(
	links: SponsorshipLink[],
	festivals: HistoryFestival[],
	referenceFestivalId: string | null
): SponsorHistoryMap {
	const byId = new Map(festivals.map((f) => [f.id, f]));
	const history: SponsorHistoryMap = {};

	for (const link of links) {
		const festival = byId.get(link.festival_id);
		if (!festival) continue;

		const entry = (history[link.sponsor_id] ??= sponsorHistoryOf(history, link.sponsor_id));
		entry.festivalCount += 1;
		const year = festivalYear(festival);
		if (year !== null && (entry.lastYear === null || year > entry.lastYear)) {
			entry.lastYear = year;
		}
		if (referenceFestivalId !== null && festival.id === referenceFestivalId) {
			entry.sponsorsReferenceFestival = true;
		}
	}

	return history;
}

/**
 * Das **Bezugsfest** der Sponsoren-Seite: das nächste bevorstehende Fest, aus
 * dem „HEUER" und das Jahr im Segment-Schalter kommen. Dieselbe Ableitung wie
 * die Festliste (`arrangeFestivalWall`, #90) — frühestes Startdatum ab heute,
 * heute zählt als bevorstehend. Zwischen zwei Festen gibt es keines; dann
 * entfallen die Segmente, statt „sponsern undefined" zu zeigen.
 *
 * Feste ohne Startdatum kommen nicht in Frage: ohne Datum ist nichts
 * bevorstehend.
 */
export function referenceFestival<T extends { id: string; start_date: string | null }>(
	festivals: T[],
	today: Date = new Date()
): T | null {
	const now = festDayStart(today).getTime();
	let next: T | null = null;
	let nextDay = Infinity;

	for (const festival of festivals) {
		if (!festival.start_date) continue;
		const day = festDayStart(festival.start_date).getTime();
		if (day < now || day >= nextDay) continue;
		next = festival;
		nextDay = day;
	}

	return next;
}

/**
 * Die drei Segmente des Schalters über dem Frachtbrief: der ganze Bestand, die
 * Firmen des Bezugsfests, und die, die heuer noch nicht gefragt sind. Die
 * beiden hinteren gibt es nur mit Bezugsfest.
 */
export type SponsorSegment = 'alle' | 'sponsert' | 'nicht-gefragt';

/** Anzahl der Firmen je Segment — die Zahlen am Schalter. */
export type SponsorSegmentCounts = Record<SponsorSegment, number>;

/** Gehört die Firma ins Segment? */
function inSegment(history: SponsorHistory, segment: SponsorSegment): boolean {
	switch (segment) {
		case 'alle':
			return true;
		case 'sponsert':
			return history.sponsorsReferenceFestival;
		case 'nicht-gefragt':
			// Auch die ohne jede Historie: eine nie gefragte Firma ist der beste
			// Anruf-Kandidat (#158).
			return !history.sponsorsReferenceFestival;
	}
}

/** Schneidet aus einem Ausschnitt des Bestands das Segment heraus. Der
Ausschnitt ist schon von der Suche gefiltert — beide filtern, nicht ersetzend. */
export function filterSponsorsBySegment<T extends { id: string }>(
	sponsors: T[],
	history: SponsorHistoryMap,
	segment: SponsorSegment
): T[] {
	if (segment === 'alle') return sponsors;
	return sponsors.filter((s) => inSegment(sponsorHistoryOf(history, s.id), segment));
}

/** Zählt die Segmente über den übergebenen Ausschnitt — die Zahlen am Schalter
sagen also voraus, was ein Klick zeigen wird (ADR 0006: gefiltert rechnen). */
export function countSponsorSegments<T extends { id: string }>(
	sponsors: T[],
	history: SponsorHistoryMap
): SponsorSegmentCounts {
	const counts: SponsorSegmentCounts = { alle: 0, sponsert: 0, 'nicht-gefragt': 0 };

	for (const sponsor of sponsors) {
		const entry = sponsorHistoryOf(history, sponsor.id);
		counts.alle += 1;
		if (inSegment(entry, 'sponsert')) counts.sponsert += 1;
		else counts['nicht-gefragt'] += 1;
	}

	return counts;
}

/** Jahr eines Fests; null, solange kein Startdatum erfasst ist. */
function festivalYear(festival: HistoryFestival): number | null {
	if (!festival.start_date) return null;
	const year = festDayStart(festival.start_date).getFullYear();
	return Number.isNaN(year) ? null : year;
}
