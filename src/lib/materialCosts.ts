/** Die Geldrechnung der Materialliste — brutto, an einer Stelle (ADR 0006).
Reines Rechenmodul ohne React; Dashboard, Materialliste und Exporte importieren
von hier und rechnen nicht selbst. */

/** Preisfelder einer Material-Position (strukturell, damit auch Teilobjekte rechnen). */
export interface MaterialPrice {
	unit_price: number | null;
	tax_rate: number | null;
	price_is_net: boolean;
}

/** Preis- und Mengenfelder einer Material-Position. */
export interface MaterialPosition extends MaterialPrice {
	ordered_quantity: number;
	actual_quantity: number | null;
}

/** Jeder ausgewiesene Geldbetrag steht auf Cent, damit Zeilen, Zwischensummen und
Gesamtsumme nicht um Bruchteile auseinanderlaufen. */
function toCents(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Einen zusammengesetzten Betrag auf Cent stellen. Exportiert für Aufrufer, die
schon gerechnete Zwischensummen addieren (etwa der Bestelllisten-Export über
seine Gruppen) — die Rundungsregel bleibt damit in diesem Modul. */
export function roundEuro(value: number): number {
	return toCents(value);
}

/** Bruttopreis ungerundet — Rechengrundlage aller Beträge. Erst der Betrag wird
gerundet, nicht der Preis: 100 × (0,99 netto + 20 %) sind 118,80 €, nicht 119,00 €. */
function exactGross(m: MaterialPrice): number | null {
	if (m.unit_price == null) return null;
	if (m.tax_rate == null) return m.unit_price;
	return m.price_is_net ? m.unit_price * (1 + m.tax_rate / 100) : m.unit_price;
}

/** Nettopreis einer Position (auf Cent); ohne Steuersatz gleich dem Bruttopreis. */
export function netPrice(m: MaterialPrice): number | null {
	if (m.unit_price == null) return null;
	if (m.tax_rate == null) return toCents(m.unit_price);
	return toCents(m.price_is_net ? m.unit_price : m.unit_price / (1 + m.tax_rate / 100));
}

/** Bruttopreis einer Position (auf Cent); ohne Steuersatz gleich dem Nettopreis. */
export function grossPrice(m: MaterialPrice): number | null {
	const gross = exactGross(m);
	return gross == null ? null : toCents(gross);
}

/** Kosten einer Position: Bruttopreis × (Verbraucht-Menge, sonst Bestellt-Menge).
Eine Zeile trägt *eine* Summe. Ohne Preis gibt es keine — `null`, nicht 0. */
export function rowTotal(m: MaterialPosition): number | null {
	const gross = exactGross(m);
	if (gross == null) return null;
	return toCents(gross * (m.actual_quantity ?? m.ordered_quantity));
}

/** Summiert Bruttopreis × Menge über die Positionen, die eine Menge beisteuern.
Jeder Zeilenbetrag wird für sich auf Cent gerundet, die Summe noch einmal — so
zeigt der Fuß, was über ihm steht. */
function sumOver(
	materials: MaterialPosition[],
	quantity: (m: MaterialPosition) => number | null
): number {
	let sum = 0;
	for (const m of materials) {
		const gross = exactGross(m);
		const qty = quantity(m);
		if (gross == null || qty == null) continue;
		sum += toCents(gross * qty);
	}
	return toCents(sum);
}

/** Bestellwert €: Σ (Bestellt-Menge × Bruttopreis) über die bepreisten Positionen. */
export function orderedValue(materials: MaterialPosition[]): number {
	return sumOver(materials, (m) => m.ordered_quantity);
}

/** Verbrauchswert €: Σ (Verbraucht-Menge × Bruttopreis), nur über Positionen mit
erfasster Verbraucht-Menge. */
export function consumedValue(materials: MaterialPosition[]): number {
	return sumOver(materials, (m) => m.actual_quantity);
}

/** Δ = Verbrauchswert − Bestellwert (negativ = unter Plan, positiv = darüber). */
export function consumedDelta(materials: MaterialPosition[]): number {
	return toCents(consumedValue(materials) - orderedValue(materials));
}

/** Summe der Zeilenkosten einer (ggf. gefilterten) Liste — Zeile → Zwischensumme
→ Bereichssumme. Entspricht bewusst weder Bestell- noch Verbrauchswert (ADR 0006). */
export function sumTotals(materials: MaterialPosition[]): number {
	return sumOver(materials, (m) => m.actual_quantity ?? m.ordered_quantity);
}

/** Preislücke: Anzahl Positionen ohne erfassten Preis. */
export function withoutPrice(materials: MaterialPrice[]): number {
	return materials.filter((m) => m.unit_price == null).length;
}
