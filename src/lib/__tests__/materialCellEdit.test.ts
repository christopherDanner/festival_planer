import { describe, it, expect } from 'vitest';
import {
	cellText,
	cellUpdate,
	isCellDirty,
	nextCell,
	previewCell,
	taxOptions,
	type CellValues,
	type EditableColumn
} from '../materialCellEdit';

/** Ohne Preis — die Mengenfälle interessiert er nicht. */
const ohnePreis = { unit_price: null, tax_rate: null, price_is_net: false };

/** 4 Fass à 50 Liter bestellt, nichts nachgetragen. */
const fass: CellValues = {
	...ohnePreis,
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
	const stueck: CellValues = {
		...ohnePreis,
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
	const stueck: CellValues = {
		...ohnePreis,
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

/* ------------------------------------------------------------------ */
/*  Die Preiszellen (#217)                                             */
/* ------------------------------------------------------------------ */

/** 41,67 € netto je Fass, 20 % — netto erfasst. */
const netto: CellValues = {
	packaging_unit: null,
	amount_per_packaging: null,
	ordered_quantity: 1,
	actual_quantity: null,
	unit_price: 41.67,
	tax_rate: 20,
	price_is_net: true
};

/** Derselbe Preis, brutto erfasst. */
const brutto: CellValues = { ...netto, unit_price: 50, price_is_net: false };

describe('taxOptions — die Auswahl der MwSt-Zelle (#217)', () => {
	it('bietet keine, 10, 13 und 20 %', () => {
		expect(taxOptions(null)).toEqual(['', '10', '13', '20']);
	});

	it('lässt einen abweichend erfassten Satz wählbar, statt ihn still zu schlucken', () => {
		expect(taxOptions(7)).toEqual(['', '7', '10', '13', '20']);
	});
});

describe('cellText — was in den Preiszellen steht (#217)', () => {
	it('zeigt beide Seiten des Preises, die erfasste wie die gerechnete', () => {
		expect(cellText('net', netto)).toBe('41.67');
		expect(cellText('gross', netto)).toBe('50.00'); // 41,67 + 20 %
	});

	it('nennt den Steuersatz als Zahl, „keine" als leere Auswahl', () => {
		expect(cellText('tax', netto)).toBe('20');
		expect(cellText('tax', { ...netto, tax_rate: null })).toBe('');
	});

	it('lässt eine Preislücke leer — sie ist kein 0-Preis', () => {
		expect(cellText('net', { ...netto, unit_price: null })).toBe('');
		expect(cellText('gross', { ...netto, unit_price: null })).toBe('');
	});
});

describe('cellUpdate — die zuletzt getippte Seite ist die Quelle (#217)', () => {
	it('macht die getippte Netto-Zelle zur Quelle', () => {
		expect(cellUpdate('net', '10', brutto)).toEqual({ unit_price: 10, price_is_net: true });
	});

	it('macht die getippte Brutto-Zelle zur Quelle', () => {
		expect(cellUpdate('gross', '12', netto)).toEqual({ unit_price: 12, price_is_net: false });
	});

	it('nimmt auch hier das Dezimalkomma der Rechnung an', () => {
		expect(cellUpdate('net', '2,50', brutto)).toEqual({ unit_price: 2.5, price_is_net: true });
	});

	it('macht aus einem geleerten Preisfeld eine Preislücke', () => {
		expect(cellUpdate('net', '', netto)).toEqual({ unit_price: null, price_is_net: true });
	});

	it('lässt Gekritzeltes stehen, statt den Preis zu löschen', () => {
		expect(cellUpdate('net', '4l,67', netto)).toEqual({ unit_price: 41.67, price_is_net: true });
	});

	it('schreibt ein unberührtes Preisfeld nicht auf seine Cent-Anzeige zurück', () => {
		// 41,67 € je 50-Liter-Fass sind 0,8334 € je Liter. Die Zelle zeigt 0,83 —
		// wer sie nur verlässt, dürfte das Fass nicht um 17 Cent verbilligen.
		const feiner: CellValues = { ...netto, unit_price: 0.8334 };

		expect(cellText('net', feiner)).toBe('0.83');
		expect(cellUpdate('net', '0.83', feiner)).toEqual({
			unit_price: 0.8334,
			price_is_net: true
		});
	});

	it('lässt die Gegenseite eines unberührten Preises die Quelle in Ruhe', () => {
		// Die Brutto-Zelle einer netto erfassten Position zeigt 50,00. Verlassen
		// ohne Tippen darf `price_is_net` nicht umlegen.
		expect(cellUpdate('gross', '50.00', netto)).toEqual({
			unit_price: 41.67,
			price_is_net: true
		});
	});

	it('schreibt beim Steuersatz nur ihn — der erfasste Preis bleibt Quelle', () => {
		expect(cellUpdate('tax', '10', netto)).toEqual({ tax_rate: 10 });
		expect(cellUpdate('tax', '', netto)).toEqual({ tax_rate: null });
	});
});

describe('isCellDirty — die Preiszellen (#217)', () => {
	it('hält ein unberührtes Preisfeld für unverändert — beide Seiten', () => {
		expect(isCellDirty('net', '41.67', netto)).toBe(false);
		expect(isCellDirty('gross', '50.00', netto)).toBe(false);
		expect(isCellDirty('tax', '20', netto)).toBe(false);
	});

	it('zählt den Wechsel der Quelle als Änderung, auch bei gleicher Zahl', () => {
		// 50 brutto über einer netto erfassten Position: dieselbe Zahl, andere
		// Bedeutung — ohne das bliebe `price_is_net` für immer, wie es war.
		expect(isCellDirty('gross', '50', netto)).toBe(true);
	});

	it('merkt den neuen Steuersatz und den neuen Preis', () => {
		expect(isCellDirty('tax', '10', netto)).toBe(true);
		expect(isCellDirty('net', '42', netto)).toBe(true);
	});

	it('zählt eine geleerte Preiszelle über einer Preislücke nicht als Änderung', () => {
		const luecke: CellValues = { ...netto, unit_price: null };
		expect(isCellDirty('net', '', luecke)).toBe(false);
	});
});

describe('previewCell — die Gegenseite rechnet beim Tippen mit (#217)', () => {
	it('lässt Brutto der getippten Netto-Zelle folgen', () => {
		expect(cellText('gross', previewNet('10'))).toBe('12.00'); // 10 + 20 %
	});

	it('rechnet beim Wechsel des Steuersatzes die Gegenseite neu, nicht die Quelle', () => {
		const zehn = previewCell('tax', '10', netto);
		expect(cellText('net', zehn)).toBe('41.67');
		expect(cellText('gross', zehn)).toBe('45.84'); // 41,67 + 10 %
	});
});

/** Die Position, wie sie mit `value` in der Netto-Zelle aussähe. */
function previewNet(value: string): CellValues {
	return previewCell('net', value, netto);
}

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

	it('läuft mit Tab durch alle fünf tippbaren Zellen und dann in die nächste Zeile (#217)', () => {
		// Bestellt → Verbraucht → MwSt → Netto → Brutto → nächste Zeile.
		const spalten: EditableColumn[] = ['ordered', 'consumed', 'tax', 'net', 'gross'];
		const weg = spalten.map((column) => nextCell(ids, { id: 'bier', column }, 'forward'));

		expect(weg).toEqual([
			{ id: 'bier', column: 'consumed' },
			{ id: 'bier', column: 'tax' },
			{ id: 'bier', column: 'net' },
			{ id: 'bier', column: 'gross' },
			{ id: 'wein', column: 'ordered' }
		]);
	});

	it('führt Shift+Tab denselben Weg zurück', () => {
		expect(nextCell(ids, { id: 'wein', column: 'ordered' }, 'back')).toEqual({
			id: 'bier',
			column: 'gross'
		});
		expect(nextCell(ids, { id: 'bier', column: 'net' }, 'back')).toEqual({
			id: 'bier',
			column: 'tax'
		});
	});

	it('führt Enter auch in den Preisspalten dieselbe Spalte hinunter', () => {
		expect(nextCell(ids, { id: 'bier', column: 'net' }, 'down')).toEqual({
			id: 'wein',
			column: 'net'
		});
	});

	it('hört am Rand des Kastens auf, statt umzubrechen', () => {
		expect(nextCell(ids, { id: 'saft', column: 'consumed' }, 'down')).toBeNull();
		expect(nextCell(ids, { id: 'bier', column: 'consumed' }, 'up')).toBeNull();
		expect(nextCell(ids, { id: 'saft', column: 'gross' }, 'forward')).toBeNull();
		expect(nextCell(ids, { id: 'bier', column: 'ordered' }, 'back')).toBeNull();
	});

	it('führt nirgendwohin, wo die Zeile nicht mehr steht', () => {
		// Ein Kategorie-Chip oder die Suche kann die Zeile aus dem Kasten nehmen.
		expect(nextCell(ids, { id: 'weg', column: 'consumed' }, 'down')).toBeNull();
	});
});
