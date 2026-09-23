import { describe, it, expect } from 'vitest';
import { cellText, cellUnit, cellUpdate, isCellDirty, nextCell } from '../materialCellEdit';

/** 4 Fass à 50 Liter bestellt, nichts nachgetragen. */
const fass = {
	packaging_unit: 'Fass',
	amount_per_packaging: 50,
	ordered_quantity: 4,
	actual_quantity: null
};

describe('cellText — was beim Öffnen der Zelle im Feld steht (#216)', () => {
	it('zeigt die Menge in der Basiseinheit, nicht in Gebinden', () => {
		expect(cellText('ordered', fass)).toBe('200');
	});

	it('lässt eine nicht erfasste Verbraucht-Menge leer', () => {
		expect(cellText('consumed', fass)).toBe('');
	});
});

describe('cellUpdate — leer und 0 sind bei Verbraucht zweierlei (#216)', () => {
	const stueck = {
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 10,
		actual_quantity: 8
	};

	it('speichert eine geleerte Verbraucht-Zelle als „nicht erfasst"', () => {
		// Leer zählt nicht in den Verbrauchswert (CONTEXT.md) …
		expect(cellUpdate('consumed', '', stueck)).toEqual({ actual_quantity: null });
	});

	it('speichert eine 0 in Verbraucht als „nichts verbraucht"', () => {
		// … eine 0 dagegen schon, mit 0 × Bruttopreis.
		expect(cellUpdate('consumed', '0', stueck)).toEqual({ actual_quantity: 0 });
	});

	it('macht aus einer geleerten Bestellt-Zelle eine 0 — keine Position ohne Menge', () => {
		expect(cellUpdate('ordered', '', stueck)).toEqual({ ordered_quantity: 0 });
	});

	it('rechnet die getippte Basismenge in Gebinde zurück', () => {
		expect(cellUpdate('consumed', '150', fass)).toEqual({ actual_quantity: 3 });
	});

	it('nimmt das Dezimalkomma, wie es auf der Rechnung steht', () => {
		// „auch angebrochene (2,5)" (CONTEXT.md). Ein verworfenes Komma machte aus
		// 2,5 ein „nicht erfasst" — genau das stille Verwerfen, das ADR 0013
		// ausschließt.
		expect(cellUpdate('consumed', '2,5', stueck)).toEqual({ actual_quantity: 2.5 });
		expect(cellUpdate('ordered', '2,5', stueck)).toEqual({ ordered_quantity: 2.5 });
	});

	it('lässt Gekritzeltes stehen, statt es als 0 wegzuschreiben', () => {
		expect(cellUpdate('consumed', 'abc', stueck)).toEqual({ actual_quantity: 8 });
		expect(cellUpdate('ordered', 'abc', stueck)).toEqual({ ordered_quantity: 10 });
	});
});

describe('isCellDirty — geschrieben wird nur, was etwas ändert (#216)', () => {
	const stueck = {
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null
	};

	it('hält die unberührte Zelle für unverändert', () => {
		expect(isCellDirty('ordered', '0', stueck)).toBe(false);
		expect(isCellDirty('consumed', '', stueck)).toBe(false);
	});

	it('zählt eine geleerte Bestellt-Zelle über einer 0 nicht als Änderung', () => {
		// Leer *ist* hier 0 — sonst stünde in der Liste ein Schreibvorgang, den
		// niemand ausgelöst hat.
		expect(isCellDirty('ordered', '', stueck)).toBe(false);
	});

	it('unterscheidet bei Verbraucht die 0 von der leeren Zelle', () => {
		expect(isCellDirty('consumed', '0', stueck)).toBe(true);
		expect(isCellDirty('consumed', '', { ...stueck, actual_quantity: 0 })).toBe(true);
	});

	it('merkt die neue Zahl — auch in Gebinden gerechnet', () => {
		expect(isCellDirty('consumed', '150', fass)).toBe(true);
		expect(isCellDirty('ordered', '200', fass)).toBe(false);
	});
});

describe('cellUnit — worin diese eine Position getippt wird (#218)', () => {
	const stueck = {
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 10,
		actual_quantity: null
	};

	it('folgt der Wahl des Spaltenkopfs, solange die Position ein Gebinde hat', () => {
		expect(cellUnit('packaging', fass)).toBe('packaging');
		expect(cellUnit('base', fass)).toBe('base');
	});

	it('lässt eine Position ohne Gebinde in der Basiseinheit — auch im Gebinde-Modus', () => {
		// „Positionen ohne Gebinde bleiben in der Basiseinheit" (CONTEXT.md).
		expect(cellUnit('packaging', stueck)).toBe('base');
	});

	it('zählt ein Gebinde ohne Inhaltsmenge nicht — 1 Karton à nichts ist keine Umrechnung', () => {
		expect(cellUnit('packaging', { ...stueck, packaging_unit: 'Karton' })).toBe('base');
	});
});

describe('cellText und cellUpdate im Gebinde-Modus (#218)', () => {
	const stueck = {
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 10,
		actual_quantity: null
	};

	it('zeigt im Feld die Gebinde, nicht die Basismenge', () => {
		// 4 Fass à 50 Liter: in Basis 200, in Gebinden 4.
		expect(cellText('ordered', fass, 'packaging')).toBe('4');
		expect(cellText('ordered', fass, 'base')).toBe('200');
	});

	it('schreibt angebrochene Gebinde mit Komma, wie sie auf der Rechnung stehen', () => {
		expect(cellText('consumed', { ...fass, actual_quantity: 2.5 }, 'packaging')).toBe('2,5');
	});

	it('speichert die getippte Zahl als Gebinde, ohne sie umzurechnen', () => {
		expect(cellUpdate('consumed', '3', fass, 'packaging')).toEqual({ actual_quantity: 3 });
		expect(cellUpdate('ordered', '2,5', fass, 'packaging')).toEqual({ ordered_quantity: 2.5 });
	});

	it('rechnet in der Basiseinheit weiter zurück, wenn die Spalte auf Basis steht', () => {
		expect(cellUpdate('consumed', '150', fass, 'base')).toEqual({ actual_quantity: 3 });
	});

	it('nimmt bei einer Position ohne Gebinde weiter die Basiseinheit an', () => {
		expect(cellText('ordered', stueck, 'packaging')).toBe('10');
		expect(cellUpdate('ordered', '12', stueck, 'packaging')).toEqual({ ordered_quantity: 12 });
	});

	it('trägt leer und 0 auch in Gebinden auseinander', () => {
		expect(cellUpdate('consumed', '', fass, 'packaging')).toEqual({ actual_quantity: null });
		expect(cellUpdate('consumed', '0', fass, 'packaging')).toEqual({ actual_quantity: 0 });
		expect(cellUpdate('ordered', '', fass, 'packaging')).toEqual({ ordered_quantity: 0 });
	});

	it('kommt in beide Richtungen an derselben Zahl an', () => {
		// Hin und zurück: was im Feld steht, speichert sich zum gespeicherten Stand.
		for (const unit of ['base', 'packaging'] as const) {
			const text = cellText('ordered', fass, unit);
			expect(cellUpdate('ordered', text, fass, unit)).toEqual({ ordered_quantity: 4 });
			expect(isCellDirty('ordered', text, fass, unit)).toBe(false);
		}
	});

	it('merkt die neue Zahl in Gebinden', () => {
		expect(isCellDirty('ordered', '5', fass, 'packaging')).toBe(true);
		expect(isCellDirty('ordered', '4', fass, 'packaging')).toBe(false);
	});

	it('lässt Gekritzeltes auch in Gebinden stehen', () => {
		expect(cellUpdate('consumed', 'abc', fass, 'packaging')).toEqual({ actual_quantity: null });
		expect(cellUpdate('ordered', 'abc', fass, 'packaging')).toEqual({ ordered_quantity: 4 });
	});
});

describe('nextCell — der Tastaturfluss des Rechnungsabgleichs (#216)', () => {
	const ids = ['bier', 'wein', 'saft'];

	it('führt Enter in dieselbe Spalte der nächsten Zeile — Zahl, Enter, Zahl, Enter', () => {
		expect(nextCell(ids, { id: 'bier', column: 'consumed' }, 'down')).toEqual({
			id: 'wein',
			column: 'consumed'
		});
	});

	it('führt Shift+Enter eine Zeile hoch', () => {
		expect(nextCell(ids, { id: 'wein', column: 'consumed' }, 'up')).toEqual({
			id: 'bier',
			column: 'consumed'
		});
	});

	it('lässt Tab durch die Mengenzellen laufen — erst rechts, dann eine Zeile tiefer', () => {
		expect(nextCell(ids, { id: 'bier', column: 'ordered' }, 'forward')).toEqual({
			id: 'bier',
			column: 'consumed'
		});
		expect(nextCell(ids, { id: 'bier', column: 'consumed' }, 'forward')).toEqual({
			id: 'wein',
			column: 'ordered'
		});
	});

	it('führt Shift+Tab denselben Weg zurück', () => {
		expect(nextCell(ids, { id: 'wein', column: 'ordered' }, 'back')).toEqual({
			id: 'bier',
			column: 'consumed'
		});
		expect(nextCell(ids, { id: 'bier', column: 'consumed' }, 'back')).toEqual({
			id: 'bier',
			column: 'ordered'
		});
	});

	it('hört am Rand des Kastens auf, statt umzubrechen', () => {
		expect(nextCell(ids, { id: 'saft', column: 'consumed' }, 'down')).toBeNull();
		expect(nextCell(ids, { id: 'bier', column: 'consumed' }, 'up')).toBeNull();
		expect(nextCell(ids, { id: 'saft', column: 'consumed' }, 'forward')).toBeNull();
		expect(nextCell(ids, { id: 'bier', column: 'ordered' }, 'back')).toBeNull();
	});

	it('führt nirgendwohin, wo die Zeile nicht mehr steht', () => {
		// Ein Kategorie-Chip oder die Suche kann die Zeile aus dem Kasten nehmen.
		expect(nextCell(ids, { id: 'weg', column: 'consumed' }, 'down')).toBeNull();
	});
});
