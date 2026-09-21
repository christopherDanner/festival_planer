/**
 * Die Adressen, über die Festliste, Kopierwerk und Fest-Arbeitsbereich
 * aufeinander zeigen (Spec #64/#93). Sie liegen in einem Modul, damit der
 * Schreiber eines Links und sein Leser nicht auseinanderlaufen — der Wizard
 * navigierte früher über `state: { festivalId }`, die Wand über `?id=`.
 */

/** Fest-Einstieg („Meine Feste") — Zurück-Weg von Kopierwerk und Stammdaten. */
export const FESTIVAL_LIST_PATH = '/dashboard';

/** Kopierwerk: eigene Route, damit der Einstieg deep-linkbar ist. */
export const NEW_FESTIVAL_PATH = '/festivals/neu';

/** Query-Parameter, der die Vorlage am Kopierwerk-Link trägt. */
const TEMPLATE_PARAM = 'vorlage';

/** Kopierwerk-Link; mit `templateId` der Sprung von „ALS VORLAGE" am Plakat. */
export function newFestivalPath(templateId?: string): string {
	if (!templateId) return NEW_FESTIVAL_PATH;
	return `${NEW_FESTIVAL_PATH}?${TEMPLATE_PARAM}=${encodeURIComponent(templateId)}`;
}

/** Vorlagen-Zeiger aus der Adresse des Kopierwerks; ohne Parameter leer. */
export function templateIdFromSearch(search: URLSearchParams): string {
	return search.get(TEMPLATE_PARAM) ?? '';
}

/** Fest-Arbeitsbereich, adressiert über `?id=`; er öffnet auf dem Dashboard-Tab. */
export function festivalWorkspacePath(festivalId: string): string {
	return `/festival-results?id=${encodeURIComponent(festivalId)}`;
}
