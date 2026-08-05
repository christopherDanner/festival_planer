import { formatEuro } from '@/components/festival-overview/numberBoxes';
import { festDayStart } from '@/lib/festDates';
import type { FestivalMetrics } from '@/lib/festivalMetrics';
import type { Festival } from '@/lib/festivalService';

/** Die drei Plakat-Ränge der Wand (Fächer-Variante A, Issue #64/#90). */
export interface FestivalWallRanks {
	/** Rang 1: das nächste bevorstehende Fest — null, wenn keines bevorsteht. */
	next: Festival | null;
	/** Rang 2: weitere bevorstehende Feste, aufsteigend nach Start. */
	soon: Festival[];
	/** Rang 3: vergangene Feste, absteigend nach Start. */
	past: Festival[];
	/** Bevorstehende Feste insgesamt (Rang 1 mitgezählt) — für die Zählzeile im Mast. */
	upcomingCount: number;
}

/**
 * Räumt die Feste auf die drei Ränge der Plakatwand ein. Ein heute startendes
 * Fest zählt als bevorstehend; kein Cap — es sind wenige Feste.
 */
export function arrangeFestivalWall(
	festivals: Festival[],
	today: Date = new Date()
): FestivalWallRanks {
	const day = (festival: Festival) => festDayStart(festival.start_date).getTime();
	const now = festDayStart(today).getTime();
	const upcoming = festivals.filter((f) => day(f) >= now).sort((a, b) => day(a) - day(b));
	const past = festivals.filter((f) => day(f) < now).sort((a, b) => day(b) - day(a));

	return {
		next: upcoming[0] ?? null,
		soon: upcoming.slice(1),
		past,
		upcomingCount: upcoming.length
	};
}

/** Plakat-Titel; `name` ist am Fest optional. */
export function festivalTitle(festival: Festival): string {
	return festival.name || 'Fest';
}

/**
 * Die Angaben der Kennzahl-Zeile eines Plakats („52 Schichten", „86
 * Materialien", „€ 4.850 Sponsoring"). Leere Werte fallen weg statt als „0"
 * dazustehen — ein Fest ohne Sponsoring zeigt keine €-Angabe. Ohne geladene
 * Kennzahlen (die Wand ist schneller als die Abfrage, oder die Abfrage ist
 * gescheitert) bleibt die Zeile leer.
 */
export function festivalStatTexts(metrics: FestivalMetrics | undefined): string[] {
	if (!metrics) return [];
	const texts: string[] = [];
	if (metrics.shifts > 0) {
		texts.push(`${metrics.shifts} ${metrics.shifts === 1 ? 'Schicht' : 'Schichten'}`);
	}
	if (metrics.materials > 0) {
		texts.push(`${metrics.materials} ${metrics.materials === 1 ? 'Material' : 'Materialien'}`);
	}
	if (metrics.sponsoring > 0) texts.push(`${formatEuro(metrics.sponsoring)} Sponsoring`);
	return texts;
}

/** Zählzeile des Masts („7 Feste · 3 bevorstehend"); ohne Feste entfällt sie. */
export function festivalCountLine(total: number, upcomingCount: number): string | null {
	if (total === 0) return null;
	return `${total} ${total === 1 ? 'Fest' : 'Feste'} · ${upcomingCount} bevorstehend`;
}
