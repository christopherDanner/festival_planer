/**
 * Die Maße, die sich die Werkbänke des Kopierwerks teilen. Sie stehen hier und
 * nicht bei einer von ihnen, weil keine die Heimat der anderen sein kann:
 * `CopySwitch`, `StationsShiftsStep` und `MaterialStep` brauchen dieselbe
 * Checkbox, und ein Schalter, aus dem eine Stationszeile ihr Maß holt, wäre die
 * falsche Richtung (ADR 0003 §2).
 */

/** Maß der Werkzeug-Checkbox (Prototyp `.cbx`); grün gefüllt über die Variante. */
export const COPY_CHECKBOX = 'h-[18px] w-[18px]';

/** Beschriftung als Tippziel: am Handy ≥ 40px hoch (DESIGN-VISION §6). */
export const TAP_TARGET = 'flex items-center max-[899px]:min-h-10';
