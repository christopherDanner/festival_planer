/**
 * DOM-Id der Zeile bzw. Karte einer Firma. Über sie holt die Seite eine eben
 * angelegte Firma ins Bild (#159) — sie landet alphabetisch irgendwo, und ohne
 * Sprung schiene der Klick auf „Speichern" nichts getan zu haben.
 */
export const sponsorAnchorId = (sponsorId: string): string => `sponsor-${sponsorId}`;
