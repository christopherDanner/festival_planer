import { describe, it, expect } from 'vitest';

import {
	startRowDraft,
	editRowDraft,
	rowDraftPreview,
	rowDraftUpdates,
	isRowDraftDirty,
	draftsSummary,
	type EditableRow,
	type RowDraft
} from '../materialRowEdit';

/** Eine Position ohne Gebinde: gespeicherte Menge = Basismenge. */
function row(over: Partial<EditableRow> = {}): EditableRow {
	return {
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		...over
	};
}

/** 4 Fass à 50 Liter bestellt — gespeichert wird in Fass, getippt in Liter. */
const fass = {
	packaging_unit: 'Fass',
	amount_per_packaging: 50
};

/** Die getippte Fassung einer Position, ohne den Umweg über fünf Tastendrücke. */
function draftOf(r: EditableRow, typed: Partial<RowDraft> = {}): RowDraft {
	return { ...startRowDraft(r), ...typed };
}

describe('materialRowEdit — der Anfangszustand einer Karte (#116)', () => {
	it('trägt die gespeicherten Werte als Text ein, Mengen in Basiseinheiten', () => {
		const draft = startRowDraft(
			row({ ...fass, ordered_quantity: 4, actual_quantity: 3, tax_rate: 20, unit_price: 10, price_is_net: true })
		);

		expect(draft).toEqual({
			ordered: '200',
			consumed: '150',
			taxRate: '20',
			net: '10.00',
			gross: '12.00',
			priceSource: 'net'
		});
	});

	it('lässt Verbraucht leer, solange nichts nachgetragen ist — 0 wäre eine Aussage', () => {
		expect(startRowDraft(row({ ordered_quantity: 5 })).consumed).toBe('');
	});

	it('lässt beide Preisfelder leer, wo kein Preis erfasst ist', () => {
		const draft = startRowDraft(row({ unit_price: null, tax_rate: 20 }));
		expect(draft.net).toBe('');
		expect(draft.gross).toBe('');
	});

	it('nennt „keine" als leeren Steuersatz statt als 0', () => {
		expect(startRowDraft(row({ tax_rate: null })).taxRate).toBe('');
	});
});

describe('materialRowEdit — Netto ⇄ Brutto rechnen live gegenseitig (#115)', () => {
	const zehnProzent = row({ tax_rate: 10 });

	it('rechnet Brutto mit, während Netto getippt wird', () => {
		const draft = editRowDraft(startRowDraft(zehnProzent), 'net', '20');

		expect(draft.gross).toBe('22.00');
		expect(draft.priceSource).toBe('net');
	});

	it('rechnet Netto mit, während Brutto getippt wird', () => {
		const draft = editRowDraft(startRowDraft(zehnProzent), 'gross', '22');

		expect(draft.net).toBe('20.00');
		expect(draft.priceSource).toBe('gross');
	});

	it('zeigt ohne Steuersatz in beiden Feldern denselben Wert', () => {
		const draft = editRowDraft(startRowDraft(row({ tax_rate: null })), 'net', '7.5');

		expect(draft.net).toBe('7.5');
		expect(draft.gross).toBe('7.50');
	});

	it('lässt die zuletzt getippte Seite Quelle bleiben, wenn der Steuersatz wechselt', () => {
		const netGetippt = editRowDraft(editRowDraft(startRowDraft(row()), 'net', '20'), 'taxRate', '20');
		expect(netGetippt.net).toBe('20');
		expect(netGetippt.gross).toBe('24.00');

		const bruttoGetippt = editRowDraft(editRowDraft(startRowDraft(row()), 'gross', '24'), 'taxRate', '20');
		expect(bruttoGetippt.gross).toBe('24');
		expect(bruttoGetippt.net).toBe('20.00');
	});

	it('gleicht beide Felder an, wenn der Steuersatz auf „keine" fällt', () => {
		const mitSteuer = editRowDraft(startRowDraft(row({ tax_rate: 20 })), 'net', '20');
		const ohne = editRowDraft(mitSteuer, 'taxRate', '');

		expect(ohne.net).toBe('20');
		expect(ohne.gross).toBe('20.00');
	});

	it('leert die mitgerechnete Seite mit, wenn das Preisfeld geleert wird', () => {
		const draft = editRowDraft(startRowDraft(row({ unit_price: 10, tax_rate: 20 })), 'net', '');

		expect(draft.net).toBe('');
		expect(draft.gross).toBe('');
	});

	it('nimmt das Dezimalkomma an — auf dem Handy liegt es auf der Taste', () => {
		expect(editRowDraft(startRowDraft(row({ tax_rate: 20 })), 'net', '2,50').gross).toBe('3.00');
	});

	it('rührt die Preisfelder nicht an, wenn eine Menge getippt wird', () => {
		const start = editRowDraft(startRowDraft(row({ tax_rate: 20 })), 'net', '10');
		const nachMenge = editRowDraft(start, 'ordered', '12');

		expect(nachMenge.ordered).toBe('12');
		expect(nachMenge.net).toBe('10');
		expect(nachMenge.gross).toBe('12.00');
	});
});

describe('materialRowEdit — Δ und Gesamt rechnen live mit (#116)', () => {
	it('liest Δ aus den getippten Mengen, nicht aus den gespeicherten', () => {
		const r = row({ ordered_quantity: 30, actual_quantity: 30 });
		const draft = editRowDraft(startRowDraft(r), 'consumed', '35');

		expect(rowDraftPreview(draft, r).delta).toEqual({ text: '+5', tone: 'over' });
	});

	it('rechnet Gesamt aus getippter Menge und getipptem Preis', () => {
		const r = row({ ordered_quantity: 10 });
		const draft = editRowDraft(editRowDraft(startRowDraft(r), 'net', '2'), 'taxRate', '20');

		// 2 netto + 20 % = 2,40 brutto × 10 bestellt
		expect(rowDraftPreview(draft, r).total).toBe(24);
	});

	it('lässt Gesamt leer, solange kein Preis getippt ist — die Karte verfälscht keine Summe', () => {
		const r = row({ ordered_quantity: 10 });
		expect(rowDraftPreview(startRowDraft(r), r).total).toBeNull();
	});

	it('rechnet die Gebinde-Umrechnung unter den Mengen mit', () => {
		const r = row({ ...fass, ordered_quantity: 4 });
		const draft = editRowDraft(startRowDraft(r), 'ordered', '300');

		expect(rowDraftPreview(draft, r).orderedPackaging).toBe('6 × Fass');
		expect(rowDraftPreview(draft, r).consumedPackaging).toBeNull();
	});
});

describe('materialRowEdit — Speichern übernimmt die ganze Zeile in einem Zug (#115)', () => {
	it('schreibt Bestellt, Verbraucht, MwSt, Preis und price_is_net zusammen', () => {
		const r = row({ ordered_quantity: 1 });
		let draft = startRowDraft(r);
		draft = editRowDraft(draft, 'ordered', '30');
		draft = editRowDraft(draft, 'consumed', '25');
		draft = editRowDraft(draft, 'taxRate', '20');
		draft = editRowDraft(draft, 'gross', '12');

		expect(rowDraftUpdates(draft, r)).toEqual({
			ordered_quantity: 30,
			actual_quantity: 25,
			tax_rate: 20,
			unit_price: 12,
			price_is_net: false
		});
	});

	it('rechnet getippte Basismengen in die gespeicherten Gebinde-Mengen zurück', () => {
		const r = row({ ...fass, ordered_quantity: 4 });
		const draft = editRowDraft(startRowDraft(r), 'ordered', '250');

		expect(rowDraftUpdates(draft, r).ordered_quantity).toBe(5);
	});

	it('speichert die getippte Seite als Preis — nicht die mitgerechnete', () => {
		const r = row({ tax_rate: 10 });
		const netto = editRowDraft(startRowDraft(r), 'net', '20');

		expect(rowDraftUpdates(netto, r)).toMatchObject({ unit_price: 20, price_is_net: true });
	});

	it('löscht den Preis, wo das Feld geleert wurde — die Position wird wieder Preislücke', () => {
		const r = row({ unit_price: 10, tax_rate: 20, price_is_net: true });
		const draft = editRowDraft(startRowDraft(r), 'net', '');

		expect(rowDraftUpdates(draft, r).unit_price).toBeNull();
	});

	it('nimmt ein geleertes Verbraucht-Feld als „nicht erfasst", ein geleertes Bestellt als 0', () => {
		const r = row({ ordered_quantity: 5, actual_quantity: 5 });
		let draft = editRowDraft(startRowDraft(r), 'consumed', '');
		draft = editRowDraft(draft, 'ordered', '');

		expect(rowDraftUpdates(draft, r)).toMatchObject({ ordered_quantity: 0, actual_quantity: null });
	});
});

describe('materialRowEdit — geändert oder nicht (#116)', () => {
	const r = row({ ordered_quantity: 4, actual_quantity: 3, unit_price: 10, tax_rate: 20, price_is_net: true });

	it('nennt eine frisch geöffnete Karte ungeändert — Abbrechen lässt die Position unberührt', () => {
		expect(isRowDraftDirty(startRowDraft(r), r)).toBe(false);
	});

	it('nennt eine Karte ungeändert, in der nur die mitgerechnete Seite neu formatiert dasteht', () => {
		// Netto 10 noch einmal getippt: derselbe Preis, dieselbe Quelle.
		expect(isRowDraftDirty(editRowDraft(startRowDraft(r), 'net', '10'), r)).toBe(false);
	});

	it('nennt eine Karte geändert, sobald ein Wert abweicht', () => {
		expect(isRowDraftDirty(editRowDraft(startRowDraft(r), 'consumed', '2'), r)).toBe(true);
	});

	it('nennt den Wechsel der Preisquelle eine Änderung — er kippt price_is_net', () => {
		expect(isRowDraftDirty(editRowDraft(startRowDraft(r), 'gross', '12'), r)).toBe(true);
	});

	it('lässt einen Preis unter Cent-Genauigkeit die Karte nicht sofort „geändert" nennen', () => {
		// Das Feld zeigt 0,105 € als „0.11"; verglichen wird gegen die frisch
		// geöffnete Karte, nicht gegen die gespeicherte Zahl.
		const genau = row({ ordered_quantity: 1, unit_price: 0.105, tax_rate: null });

		expect(isRowDraftDirty(startRowDraft(genau), genau)).toBe(false);
	});

	it('lässt eine Menge mit langem Nachkomma-Rest die Karte nicht „geändert" nennen', () => {
		const krumm = row({ ...fass, ordered_quantity: 1 / 3 });

		expect(isRowDraftDirty(startRowDraft(krumm), krumm)).toBe(false);
	});
});

describe('materialRowEdit — die Sammel-Fußleiste zählt (#116)', () => {
	const r = row({ ordered_quantity: 4 });

	it('zählt offene Karten und darunter die geänderten', () => {
		const summary = draftsSummary([
			{ draft: startRowDraft(r), row: r },
			{ draft: editRowDraft(startRowDraft(r), 'ordered', '9'), row: r },
			{ draft: editRowDraft(startRowDraft(r), 'net', '3'), row: r }
		]);

		expect(summary).toEqual({ open: 3, dirty: 2 });
	});

	it('zählt nichts, wo keine Karte offen ist', () => {
		expect(draftsSummary([])).toEqual({ open: 0, dirty: 0 });
	});

	it('nimmt die Entwürfe, wie die Karten sie halten — je Position einer', () => {
		const drafts = { a: draftOf(r, { ordered: '9' }) };
		expect(draftsSummary(Object.values(drafts).map((draft) => ({ draft, row: r })))).toEqual({
			open: 1,
			dirty: 1
		});
	});
});
