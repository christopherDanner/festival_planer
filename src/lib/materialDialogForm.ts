import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { MaterialPrefill } from '@/lib/materialGrouping';
import { canonicalizeValue } from '@/lib/materialSuggestions';
import { toBaseQuantity, fromBaseQuantity } from '@/lib/materialQuantity';

/**
 * Der Schnitt des Positions-Dialogs (#117) als reine Logik.
 *
 * Arbeitsteilung mit dem Zeilenmodus (#115, Entscheid Wayfinder #66):
 * die **Zeile (✎)** trägt Mengen und Preise, der **Dialog (⋮)** die
 * *Stammdaten* — Bezeichnung, Kategorie, Station, Lieferant, Gebinde,
 * Einheit, Stück je Gebinde, Notiz. Beim **Anlegen** trägt der Dialog
 * trotzdem Mengen und Preis, damit eine Position in einem Zug vollständig
 * wird.
 *
 * Die Werte liegen im Formular als Text — so wie sie im Feld stehen. Die
 * Umrechnung in Zahlen (und in Gebinde) passiert erst in
 * `buildMaterialPayload`.
 */

export type MaterialDialogMode = 'create' | 'edit';

/** Worauf sich der erfasste Preis bezieht — ohne Gebinde bleibt nur die Einheit. */
export type PriceBase = 'unit' | 'packaging';

/** Ob der erfasste Preis netto gemeint ist. Als Text, weil beide Schalter des
Zettels über Textwerte gehen (CONTEXT.md „Bruttopreis", ADR 0006). */
export type PriceIsNet = 'true' | 'false';

export interface MaterialForm {
	name: string;
	category: string;
	station_id: string;
	supplier: string;
	unit: string;
	packaging_unit: string;
	amount_per_packaging: string;
	ordered_quantity: string;
	actual_quantity: string;
	unit_price: string;
	tax_rate: string;
	price_is_net: PriceIsNet;
	price_per: PriceBase;
	notes: string;
}

/** Was der Dialog besitzt: die Stammdaten einer Position. */
export interface MaterialMasterData {
	festival_id: string;
	station_id: string | null;
	name: string;
	category: string | null;
	supplier: string | null;
	unit: string;
	packaging_unit: string | null;
	amount_per_packaging: number | null;
	notes: string | null;
}

/** Stammdaten plus Mengen und Preis — die volle Zeile, wie sie beim Anlegen
in einem Zug entsteht. */
export interface MaterialPayload extends MaterialMasterData {
	ordered_quantity: number;
	actual_quantity: number | null;
	unit_price: number | null;
	tax_rate: number | null;
	price_is_net: boolean;
	price_per: string;
}

export type MaterialSaveData = MaterialPayload | MaterialMasterData;

/** Trennt die volle Nutzlast (Anlegen) von der Stammdaten-Änderung
(Bearbeiten) — die Bestellmenge gibt es nur in der einen. */
export function isFullPayload(data: MaterialSaveData): data is MaterialPayload {
	return 'ordered_quantity' in data;
}

export interface PayloadContext {
	festivalId: string;
	categorySuggestions: string[];
	supplierSuggestions: string[];
}

/** Der Satz, mit dem der Zettel beim Bearbeiten die fehlenden Mengenfelder
erklärt — die Begründung gehört neben die Lücke, nicht ins Changelog. Wortlaut
aus #117; auf den ✎-Knopf zeigt er erst, wenn #115 ihn gebaut hat. */
export const ZEILEN_HINWEIS = 'Mengen und Preise ändert man schneller direkt in der Zeile.';

/** Sentinel der Select-Felder: „keine Station" / „keine MwSt" — Radix kennt
keinen leeren Wert, der Zettel setzt ihn und diese Datei liest ihn wieder weg. */
export const KEINE = '__none__';

export function dialogMode(material?: FestivalMaterialWithStation | null): MaterialDialogMode {
	return material ? 'edit' : 'create';
}

/** Mengen und Preis stehen nur beim Anlegen im Dialog (#117). */
export function showsQuantityAndPrice(mode: MaterialDialogMode): boolean {
	return mode === 'create';
}

export function emptyMaterialForm(prefill?: MaterialPrefill): MaterialForm {
	return {
		name: '',
		category: prefill?.category ?? '',
		station_id: prefill?.station_id ?? '',
		supplier: prefill?.supplier ?? '',
		unit: 'Stück',
		packaging_unit: '',
		amount_per_packaging: '',
		ordered_quantity: '',
		actual_quantity: '',
		unit_price: '',
		tax_rate: '',
		price_is_net: 'true',
		price_per: 'packaging',
		notes: ''
	};
}

export function formFromMaterial(material: FestivalMaterialWithStation): MaterialForm {
	// Gespeichert wird in Gebinden, getippt wird in Basiseinheiten.
	const orderedBase = toBaseQuantity(material.ordered_quantity, material);
	const actualBase = toBaseQuantity(material.actual_quantity, material);
	return {
		name: material.name,
		category: material.category || '',
		station_id: material.station_id || '',
		supplier: material.supplier || '',
		unit: material.unit,
		packaging_unit: material.packaging_unit || '',
		amount_per_packaging:
			material.amount_per_packaging != null ? String(material.amount_per_packaging) : '',
		ordered_quantity: orderedBase != null ? String(orderedBase) : '',
		actual_quantity: actualBase != null ? String(actualBase) : '',
		unit_price: material.unit_price != null ? String(material.unit_price) : '',
		tax_rate: material.tax_rate != null ? String(material.tax_rate) : '',
		price_is_net: material.price_is_net ? 'true' : 'false',
		price_per: material.price_per === 'unit' ? 'unit' : 'packaging',
		notes: material.notes || ''
	};
}

/**
 * Beim Anlegen ist die Bestellmenge Pflicht — sonst entstünde eine Position,
 * die in keiner Bestellliste auftaucht. Beim Bearbeiten liegt die Menge in
 * der Zeile; hier zu fordern, was der Dialog gar nicht zeigt, würde das
 * Speichern unerklärlich sperren.
 */
export function canSave(form: MaterialForm, mode: MaterialDialogMode): boolean {
	if (!form.name.trim()) return false;
	if (mode === 'create') return form.ordered_quantity.trim() !== '';
	return true;
}

/**
 * Was der Dialog beim **Bearbeiten** abgibt: nur die Stammdaten. Er zeigt
 * Mengen und Preise nicht, also schreibt er sie auch nicht — sonst trüge er
 * bei jedem Umbenennen seinen Stand der Geldspalten über das, was die Zeile
 * (#115) inzwischen gesetzt hat.
 *
 * Folge fürs Gebinde: eine korrigierte Gebindegröße lässt die *gespeicherte*
 * Menge stehen (4 Fass bleiben 4 Fass, nur ihr Inhalt ändert sich). Die
 * Zeile zeigt diese Änderung sofort — anders als ein stilles Umrechnen einer
 * Zahl, die im Dialog gar nicht steht.
 */
export function buildMasterDataUpdate(
	form: MaterialForm,
	context: PayloadContext
): MaterialMasterData {
	return {
		festival_id: context.festivalId,
		station_id: form.station_id && form.station_id !== KEINE ? form.station_id : null,
		name: form.name.trim(),
		category: canonicalizeValue(form.category, context.categorySuggestions) || null,
		supplier: canonicalizeValue(form.supplier, context.supplierSuggestions) || null,
		unit: form.unit,
		packaging_unit: form.packaging_unit.trim() || null,
		amount_per_packaging: form.amount_per_packaging ? Number(form.amount_per_packaging) : null,
		notes: form.notes.trim() || null
	};
}

/** Was der Dialog beim **Anlegen** abgibt: Stammdaten, Mengen und Preis in
einem Zug (#117). */
export function buildMaterialPayload(form: MaterialForm, context: PayloadContext): MaterialPayload {
	const stammdaten = buildMasterDataUpdate(form, context);
	const quantityContext = {
		packaging_unit: stammdaten.packaging_unit,
		amount_per_packaging: stammdaten.amount_per_packaging
	};
	return {
		...stammdaten,
		ordered_quantity: fromBaseQuantity(Number(form.ordered_quantity || 0), quantityContext),
		actual_quantity: form.actual_quantity
			? fromBaseQuantity(Number(form.actual_quantity), quantityContext)
			: null,
		unit_price: form.unit_price ? Number(form.unit_price) : null,
		tax_rate: form.tax_rate && form.tax_rate !== KEINE ? Number(form.tax_rate) : null,
		price_is_net: form.price_is_net === 'true',
		// Ohne Gebinde gibt es nur eine Bezugsgröße.
		price_per: stammdaten.packaging_unit ? form.price_per : 'unit'
	};
}
