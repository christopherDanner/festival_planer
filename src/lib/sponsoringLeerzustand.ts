import { countLabel } from '@/lib/plural';

/**
 * Welcher der drei Leerzustände des Sponsoring-Bereichs greift. Die
 * *Sponsoring-Übersicht* ist eine Matrix mit zwei Achsen — *Preisliste* als
 * Spalten, Firmen als Zeilen —, also hat sie **drei** leere Formen, und alle
 * drei sind erreichbar (#152):
 *
 * - `nichts` (L1) — neues Fest ohne Kopierwerk. Nicht die Tabelle fehlt, die
 *   *Preisliste* fehlt; der Bereich zeigt darum eine Anleitung statt eines
 *   Tabellengerippes.
 * - `ohneFirmen` (L2) — Kopierwerk Schritt 5 hat nur die Kategorien geholt
 *   (#146). Die Spalten stehen, es fehlen die Firmen.
 * - `ohnePreisliste` (L3) — Kopierwerk Schritt 5 hat nur die Sponsoren geholt.
 *   Die Zeilen stehen und sind richtig angelegt; ohne Kategorie-Spalte lässt
 *   sich ihnen nur nichts zuweisen.
 */
export type SponsoringLeerzustand = 'nichts' | 'ohneFirmen' | 'ohnePreisliste';

/** `null` heißt: beide Achsen stehen, der Bereich zeigt den vollen Zustand. */
export function sponsoringLeerzustand(
	categoryCount: number,
	sponsorCount: number
): SponsoringLeerzustand | null {
	if (categoryCount === 0 && sponsorCount === 0) return 'nichts';
	if (sponsorCount === 0) return 'ohneFirmen';
	if (categoryCount === 0) return 'ohnePreisliste';
	return null;
}

/**
 * Was im Bereichskopf vor Vorjahr und Sachwert steht. Auflage aus #152: der Kopf
 * sagt in jedem Leerzustand zuerst, **was schon steht** — „6 Kategorien · noch
 * keine Firma" liest sich als Fortschritt, „0 Sponsoren" als Panne.
 *
 * Im vollen Zustand bleibt es bei der Sponsorenzahl; was nicht fehlt, muss auch
 * nicht genannt werden.
 */
export function sponsoringStandLabel(categoryCount: number, sponsorCount: number): string {
	const sponsoren = countLabel(sponsorCount, 'Sponsor', 'Sponsoren');

	switch (sponsoringLeerzustand(categoryCount, sponsorCount)) {
		case 'nichts':
			return 'Noch nichts erfasst';
		case 'ohneFirmen':
			return `${countLabel(categoryCount, 'Kategorie', 'Kategorien')} · noch keine Firma`;
		case 'ohnePreisliste':
			return `${sponsoren} · keine Kategorien`;
		default:
			return sponsoren;
	}
}
