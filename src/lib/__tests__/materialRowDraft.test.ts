import { describe, it, expect } from 'vitest';
import {
	draftFromMaterial,
	draftPreview,
	draftUpdate,
	editDraft,
	isDirty
} from '../materialRowDraft';
import { rowTotal } from '../materialCosts';
import { formatRequiredPackaging } from '../materialQuantity';
import { deltaCell } from '../materialRow';
import type { FestivalMaterialWithStation } from '../materialService';

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Stück',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

describe('materialRowDraft — Netto ⇄ Brutto rechnen live gegenseitig (#115)', () => {
	it('lässt Brutto folgen, wenn Netto getippt wird', () => {
		const draft = draftFromMaterial(material({ tax_rate: 10 }));

		const getippt = editDraft(draft, 'net', '10');

		expect(getippt.net).toBe('10');
		expect(getippt.gross).toBe('11.00');
		expect(getippt.source).toBe('net');
	});

	it('lässt Netto folgen, wenn Brutto getippt wird', () => {
		const draft = draftFromMaterial(material({ tax_rate: 10 }));

		const getippt = editDraft(draft, 'gross', '11');

		expect(getippt.net).toBe('10.00');
		expect(getippt.gross).toBe('11');
		expect(getippt.source).toBe('gross');
	});

	it('zeigt ohne MwSt in beiden Feldern denselben Betrag', () => {
		const draft = draftFromMaterial(material({ tax_rate: null }));

		expect(editDraft(draft, 'net', '7.5').gross).toBe('7.50');
		expect(editDraft(draft, 'gross', '7.5').net).toBe('7.50');
	});

	it('lässt die zuletzt getippte Seite Quelle, wenn die MwSt wechselt', () => {
		const start = draftFromMaterial(material({ unit_price: 10, tax_rate: 10, price_is_net: true }));

		// Netto getippt, dann MwSt auf 20 % — Netto bleibt stehen, Brutto rechnet neu.
		const nettoQuelle = editDraft(editDraft(start, 'net', '10'), 'tax', '20');
		expect(nettoQuelle.net).toBe('10');
		expect(nettoQuelle.gross).toBe('12.00');
		expect(nettoQuelle.source).toBe('net');

		// Brutto getippt, dann MwSt auf 20 % — Brutto bleibt stehen, Netto rechnet neu.
		const bruttoQuelle = editDraft(editDraft(start, 'gross', '12'), 'tax', '20');
		expect(bruttoQuelle.gross).toBe('12');
		expect(bruttoQuelle.net).toBe('10.00');
		expect(bruttoQuelle.source).toBe('gross');
	});

	it('gleicht beide Felder an, wenn die MwSt auf „keine" fällt', () => {
		const start = draftFromMaterial(material({ unit_price: 10, tax_rate: 20, price_is_net: true }));

		const ohne = editDraft(start, 'tax', '');

		expect(ohne.net).toBe('10.00');
		expect(ohne.gross).toBe('10.00');
	});

	it('leert die Gegenseite mit, wenn das Preisfeld geleert wird', () => {
		const start = draftFromMaterial(material({ unit_price: 10, tax_rate: 20, price_is_net: true }));

		expect(editDraft(start, 'net', '').gross).toBe('');
		expect(editDraft(start, 'gross', '').net).toBe('');
	});

	it('lässt Mengen und MwSt die Preisquelle unberührt', () => {
		const start = editDraft(draftFromMaterial(material({ tax_rate: 20 })), 'gross', '12');

		expect(editDraft(start, 'ordered', '30').source).toBe('gross');
		expect(editDraft(start, 'actual', '25').ordered).toBe(start.ordered);
	});
});

describe('materialRowDraft — der Entwurf einer gespeicherten Position', () => {
	it('trägt Mengen in Basiseinheiten, nicht in Gebinden', () => {
		// 4 Fass à 50 Liter bestellt, 3 verbraucht.
		const draft = draftFromMaterial(
			material({
				unit: 'Liter',
				packaging_unit: 'Fass',
				amount_per_packaging: 50,
				ordered_quantity: 4,
				actual_quantity: 3
			})
		);

		expect(draft.ordered).toBe('200');
		expect(draft.actual).toBe('150');
	});

	it('lässt Verbraucht leer, solange nichts nachgetragen ist', () => {
		expect(draftFromMaterial(material({ actual_quantity: null })).actual).toBe('');
	});

	it('stellt beide Preisfelder aus dem einen erfassten Preis', () => {
		const netto = draftFromMaterial(material({ unit_price: 10, tax_rate: 20, price_is_net: true }));
		expect(netto).toMatchObject({ net: '10.00', gross: '12.00', tax: '20', source: 'net' });

		const brutto = draftFromMaterial(material({ unit_price: 12, tax_rate: 20, price_is_net: false }));
		expect(brutto).toMatchObject({ net: '10.00', gross: '12.00', source: 'gross' });
	});

	it('lässt die Preisfelder leer, wo kein Preis erfasst ist', () => {
		const draft = draftFromMaterial(material({ unit_price: null }));
		expect(draft.net).toBe('');
		expect(draft.gross).toBe('');
	});
});

describe('materialRowDraft — was das Speichern der Zeile übernimmt (#115)', () => {
	it('schreibt Bestellt, Verbraucht, MwSt, Preis und die Preisbasis in einem Zug', () => {
		const position = material({ ordered_quantity: 10, unit_price: 1, tax_rate: null });
		let draft = draftFromMaterial(position);
		draft = editDraft(draft, 'ordered', '30');
		draft = editDraft(draft, 'actual', '25');
		draft = editDraft(draft, 'tax', '20');
		draft = editDraft(draft, 'net', '2');

		expect(draftUpdate(draft, position)).toEqual({
			ordered_quantity: 30,
			actual_quantity: 25,
			tax_rate: 20,
			unit_price: 2,
			price_is_net: true
		});
	});

	it('speichert den Bruttopreis, wenn zuletzt in Brutto getippt wurde', () => {
		const position = material({ tax_rate: 20 });
		const draft = editDraft(draftFromMaterial(position), 'gross', '12');

		expect(draftUpdate(draft, position)).toMatchObject({
			unit_price: 12,
			price_is_net: false
		});
	});

	it('rechnet die getippten Basismengen zurück in Gebinde', () => {
		// 50 Liter pro Fass: 200 Liter getippt sind 4 Fass in der Datenbank.
		const position = material({
			unit: 'Liter',
			packaging_unit: 'Fass',
			amount_per_packaging: 50,
			ordered_quantity: 4
		});
		const draft = editDraft(draftFromMaterial(position), 'ordered', '250');

		expect(draftUpdate(draft, position).ordered_quantity).toBe(5);
	});

	it('nimmt ein leeres Verbraucht-Feld als „nichts nachgetragen", nicht als 0', () => {
		const position = material({ actual_quantity: 8 });
		const draft = editDraft(draftFromMaterial(position), 'actual', '');

		expect(draftUpdate(draft, position).actual_quantity).toBeNull();
	});

	it('nimmt ein leeres Bestellt-Feld als 0 — eine Position ohne Bestellmenge bleibt eine Zeile', () => {
		const position = material({ ordered_quantity: 12 });
		const draft = editDraft(draftFromMaterial(position), 'ordered', '');

		expect(draftUpdate(draft, position).ordered_quantity).toBe(0);
	});

	it('löscht den Preis, wenn beide Preisfelder leer bleiben — die Zeile wird zur Preislücke', () => {
		const position = material({ unit_price: 10, tax_rate: 20, price_is_net: true });
		const draft = editDraft(draftFromMaterial(position), 'net', '');

		expect(draftUpdate(draft, position).unit_price).toBeNull();
	});
});

describe('materialRowDraft — was beim Tippen mitrechnet (#115)', () => {
	it('lässt Δ dem Entwurf folgen, nicht der gespeicherten Menge', () => {
		const position = material({ ordered_quantity: 30, actual_quantity: 30 });
		const draft = editDraft(draftFromMaterial(position), 'actual', '25');

		expect(deltaCell(position).text).toBe('±0');
		expect(deltaCell(draftPreview(draft, position)).text).toBe('-5');
	});

	it('lässt Gesamt dem Entwurf folgen — Preis und Menge zusammen', () => {
		const position = material({ ordered_quantity: 10, unit_price: 1, tax_rate: null });
		let draft = editDraft(draftFromMaterial(position), 'tax', '20');
		draft = editDraft(draft, 'net', '2');
		draft = editDraft(draft, 'actual', '25');

		// 2 netto + 20 % = 2,40 brutto × 25 verbraucht
		expect(rowTotal(draftPreview(draft, position))).toBe(60);
	});

	it('lässt die Gebinde-Umrechnung unter dem Mengenfeld mitlaufen', () => {
		const position = material({
			unit: 'Liter',
			packaging_unit: 'Fass',
			amount_per_packaging: 50,
			ordered_quantity: 4
		});
		const draft = editDraft(draftFromMaterial(position), 'ordered', '250');
		const vorschau = draftPreview(draft, position);

		expect(formatRequiredPackaging(vorschau.ordered_quantity, vorschau)).toBe('5 × Fass');
	});
});

describe('materialRowDraft — ob eine offene Zeile geändert ist (#115)', () => {
	it('nennt eine offene, unberührte Zeile ungeändert', () => {
		const position = material({ ordered_quantity: 10, unit_price: 2, tax_rate: 20, price_is_net: true });

		expect(isDirty(draftFromMaterial(position), position)).toBe(false);
	});

	it('erkennt eine geänderte Menge', () => {
		const position = material({ ordered_quantity: 10 });
		expect(isDirty(editDraft(draftFromMaterial(position), 'ordered', '11'), position)).toBe(true);
	});

	it('erkennt den Wechsel der Preisbasis, auch wenn beide Zahlen gleich bleiben', () => {
		// Netto 10 bei 20 % ergibt brutto 12. Tippt man dieselbe 12 in Brutto,
		// ändert sich die gespeicherte Zahl von 10 auf 12 — das ist eine Änderung.
		const position = material({ unit_price: 10, tax_rate: 20, price_is_net: true });

		expect(isDirty(editDraft(draftFromMaterial(position), 'gross', '12.00'), position)).toBe(true);
	});

	it('nennt eine Zeile ohne Preis ungeändert, auch wenn man in Brutto getippt und wieder gelöscht hat', () => {
		const position = material({ unit_price: null, price_is_net: true });
		const draft = editDraft(editDraft(draftFromMaterial(position), 'gross', '9'), 'gross', '');

		expect(isDirty(draft, position)).toBe(false);
	});
});
