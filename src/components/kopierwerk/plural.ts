/**
 * „1 Station" / „4 Stationen" — die gebeugte Zahl der Kopier-Schritte.
 *
 * Steht an einer Stelle, weil sie inzwischen in drei Modulen gebraucht wird:
 * die Untertitel der Stempelkarte, die Stations-Zeilen von Schritt 2 und die
 * Tages-Zeilen von Schritt 4 zählen alle dasselbe Muster ab (ADR 0003 §2).
 */
export const plural = (n: number, one: string, many: string): string =>
	`${n} ${n === 1 ? one : many}`;
