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

/** Datums-Strings sind tagesgenau; als lokale Mitternacht lesen, nicht als UTC. */
function startOfDay(date: string | Date): number {
	const d = typeof date === 'string' ? new Date(`${date}T00:00:00`) : new Date(date);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/**
 * Räumt die Feste auf die drei Ränge der Plakatwand ein. Ein heute startendes
 * Fest zählt als bevorstehend; kein Cap — es sind wenige Feste.
 */
export function arrangeFestivalWall(
	festivals: Festival[],
	today: Date = new Date()
): FestivalWallRanks {
	const now = startOfDay(today);
	const upcoming = festivals
		.filter((f) => startOfDay(f.start_date) >= now)
		.sort((a, b) => startOfDay(a.start_date) - startOfDay(b.start_date));
	const past = festivals
		.filter((f) => startOfDay(f.start_date) < now)
		.sort((a, b) => startOfDay(b.start_date) - startOfDay(a.start_date));

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

/** Jahr-Zeile des Plakats. */
export function festivalYear(festival: Festival): number {
	return new Date(`${festival.start_date}T00:00:00`).getFullYear();
}

/** Zählzeile des Masts („7 Feste · 3 bevorstehend"); ohne Feste entfällt sie. */
export function festivalCountLine(total: number, upcomingCount: number): string | null {
	if (total === 0) return null;
	return `${total} ${total === 1 ? 'Fest' : 'Feste'} · ${upcomingCount} bevorstehend`;
}
