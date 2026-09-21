/** Tausenderpunkte, ohne auf eine Locale-Datenbank angewiesen zu sein. */
function groupThousands(wholeEuros: number): string {
	return String(wholeEuros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Geldbetrag in Werkzeug-Plakat-Handschrift: „€ 4.400" — gerundet, mit
 * Tausenderpunkt, ohne Cent. Die Zahlen der Plakate sind Kennzahlen zum
 * Überfliegen, nicht Buchhaltung.
 */
export function formatEuro(value: number): string {
	return `€ ${groupThousands(Math.abs(Math.round(value)))}`;
}

/**
 * Betrag auf Cent für Geldspalten: „1.234,50". **Ohne €-Zeichen** — in einer
 * Spalte steht es im Kopf, nicht in jeder Zelle.
 *
 * Gerundet wird über die Cent-Zahl, nicht über `toFixed`: 0,105 liegt binär
 * knapp unter 0,105 und würde sonst als 0,10 stehen, während `materialCosts`
 * mit 0,11 rechnet (ADR 0006 — Zeile und Summe dürfen nicht auseinanderlaufen).
 */
export function formatAmount(value: number): string {
	const cents = Math.round(value * 100);
	const abs = Math.abs(cents);
	return `${cents < 0 ? '-' : ''}${groupThousands(Math.floor(abs / 100))},${String(abs % 100).padStart(2, '0')}`;
}
