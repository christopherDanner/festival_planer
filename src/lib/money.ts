/**
 * Geldbetrag in Werkzeug-Plakat-Handschrift: „€ 4.400" — gerundet, mit
 * Tausenderpunkt, ohne Cent. Die Zahlen der Plakate sind Kennzahlen zum
 * Überfliegen, nicht Buchhaltung.
 */
export function formatEuro(value: number): string {
	const rounded = Math.abs(Math.round(value));
	const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return `€ ${grouped}`;
}
