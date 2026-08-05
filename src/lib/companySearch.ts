/**
 * Die Matching-Regel der Firmen-Suche: getrimmt, case-insensitive, Teiltreffer
 * über den Firmennamen. Ein leerer Suchbegriff passt auf alles.
 *
 * Steht in einem eigenen Modul, weil sie an zwei Stellen gilt und beide dieselbe
 * Firma finden müssen: die Sponsoren-Stammdaten (`filterSponsors`) und die
 * Sponsoring-Übersicht (`filterSponsoringOverviewRows`, #151). Es ist dieselbe
 * Regel wie beim Namensabgleich der Material-Übernahme.
 */
export function matchesCompanyName(companyName: string, searchTerm: string): boolean {
	const term = searchTerm.trim().toLowerCase();
	if (!term) return true;
	return companyName.toLowerCase().includes(term);
}
