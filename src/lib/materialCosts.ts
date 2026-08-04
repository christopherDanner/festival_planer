/** Die Geldrechnung der Materialliste — brutto, an einer Stelle (ADR 0006).
Reines Rechenmodul ohne React; Dashboard, Materialliste und Exporte importieren
von hier und rechnen nicht selbst. */

/** Preisfelder einer Material-Position (strukturell, damit auch Teilobjekte rechnen). */
export interface MaterialPrice {
	unit_price: number | null;
	tax_rate: number | null;
	price_is_net: boolean;
}

/** Preis-, Mengen- und Gebindefelder einer Material-Position. */
export interface MaterialPosition extends MaterialPrice {
	ordered_quantity: number;
	actual_quantity: number | null;
	/** 'unit' oder 'packaging' — worauf sich `unit_price` bezieht. */
	price_per?: string | null;
	packaging_unit?: string | null;
	amount_per_packaging?: number | null;
}

/** Jeder Geldwert wird auf Cent gerundet, damit Zeilen, Zwischensummen und
Gesamtsumme nicht um Bruchteile auseinanderlaufen. Auch für abgeleitete Beträge
außerhalb dieses Moduls (etwa das Δ des Dashboards) — damit keine Rechenregel in
eine Komponente wandert. */
export function toCents(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Nettopreis einer Position; ohne Steuersatz gleich dem erfassten Preis. */
export function netPrice(m: MaterialPrice): number | null {
	if (m.unit_price == null) return null;
	if (m.tax_rate == null) return toCents(m.unit_price);
	return toCents(m.price_is_net ? m.unit_price : m.unit_price / (1 + m.tax_rate / 100));
}

/** Bruttopreis einer Position; ohne Steuersatz gleich dem erfassten Preis. */
export function grossPrice(m: MaterialPrice): number | null {
	if (m.unit_price == null) return null;
	if (m.tax_rate == null) return toCents(m.unit_price);
	return toCents(m.price_is_net ? m.unit_price * (1 + m.tax_rate / 100) : m.unit_price);
}

/** Verrechnete Menge zu einer erfassten Menge: Gilt der Preis pro Gebinde, zahlt
der Verein ganze Gebinde — angebrochene werden aufgerundet (dieselbe Zahl, die die
Zeile als „→ 3 Kartons" ankündigt). Sonst gilt die Menge, wie sie dasteht. */
function billableQuantity(m: MaterialPosition, quantity: number): number {
	if (m.price_per === 'packaging' && m.packaging_unit && m.amount_per_packaging) {
		return Math.ceil(quantity);
	}
	return quantity;
}

/** Betrag einer Menge zum Bruttopreis der Position; `null` ohne Preis. */
function valueOf(m: MaterialPosition, quantity: number): number | null {
	const gross = grossPrice(m);
	if (gross == null) return null;
	return toCents(gross * billableQuantity(m, quantity));
}

/** Kosten einer Position: Bruttopreis × (Verbraucht-Menge, sonst Bestellt-Menge).
Eine Zeile trägt *eine* Summe. Ohne Preis gibt es keine — `null`, nicht 0. */
export function rowTotal(m: MaterialPosition): number | null {
	return valueOf(m, m.actual_quantity ?? m.ordered_quantity);
}

/** Summiert bereits auf Cent gerundete Beträge und rundet das Ergebnis erneut —
sonst schleppt die Summe den Fließkomma-Rest der Zeilen mit. */
function sumCents(values: number[]): number {
	return toCents(values.reduce((acc, v) => acc + v, 0));
}

/** Bestellwert €: Σ (Bestellt-Menge × Bruttopreis) über die bepreisten Positionen. */
export function orderedValue(materials: MaterialPosition[]): number {
	const values: number[] = [];
	for (const m of materials) {
		const value = valueOf(m, m.ordered_quantity);
		if (value == null) continue;
		values.push(value);
	}
	return sumCents(values);
}

/** Verbrauchswert €: Σ (Verbraucht-Menge × Bruttopreis), nur über Positionen mit
erfasster Verbraucht-Menge. */
export function consumedValue(materials: MaterialPosition[]): number {
	const values: number[] = [];
	for (const m of materials) {
		if (m.actual_quantity == null) continue;
		const value = valueOf(m, m.actual_quantity);
		if (value == null) continue;
		values.push(value);
	}
	return sumCents(values);
}

/** Summe der Zeilenkosten einer (ggf. gefilterten) Liste — Zeile → Zwischensumme
→ Bereichssumme. Entspricht bewusst weder Bestell- noch Verbrauchswert (ADR 0006). */
export function sumTotals(materials: MaterialPosition[]): number {
	const values: number[] = [];
	for (const m of materials) {
		const total = rowTotal(m);
		if (total == null) continue;
		values.push(total);
	}
	return sumCents(values);
}

/** Preislücke: Anzahl Positionen ohne erfassten Preis. */
export function withoutPrice(materials: MaterialPrice[]): number {
	return materials.filter((m) => m.unit_price == null).length;
}
