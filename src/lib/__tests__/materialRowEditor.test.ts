import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRowEditor } from '../materialRowEditor';
import { sumTotals, withoutPrice } from '../materialCosts';
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

afterEach(() => {
	vi.useRealTimers();
});

describe('createRowEditor — eine Zeile öffnen und tippen (#115)', () => {
	it('öffnet die Zeile mit dem Entwurf ihrer gespeicherten Werte', () => {
		const editor = createRowEditor({ onSave: vi.fn() });
		const bier = material({ ordered_quantity: 10, unit_price: 2, tax_rate: 20 });

		editor.open(bier);

		expect(editor.getState().draftsById['m1']).toMatchObject({ ordered: '10', net: '2.00', gross: '2.40' });
		expect(editor.getState().open).toBe(1);
		expect(editor.getState().dirty).toBe(0);
	});

	it('zählt die Zeile erst als geändert, wenn sich ein Wert unterscheidet', () => {
		const editor = createRowEditor({ onSave: vi.fn() });
		editor.open(material({ ordered_quantity: 10 }));

		editor.edit('m1', 'ordered', '10');
		expect(editor.getState().dirty).toBe(0);

		editor.edit('m1', 'ordered', '12');
		expect(editor.getState().dirty).toBe(1);
	});

	it('öffnet auf Wunsch alle Zeilen der Gruppe auf einmal', () => {
		const editor = createRowEditor({ onSave: vi.fn() });

		editor.openAll([material({ id: 'a' }), material({ id: 'b' }), material({ id: 'c' })]);

		expect(editor.getState().open).toBe(3);
	});

	it('meldet jede Änderung an seine Zuhörer', () => {
		const editor = createRowEditor({ onSave: vi.fn() });
		const listener = vi.fn();
		const unsubscribe = editor.subscribe(listener);

		editor.open(material());
		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();
		editor.edit('m1', 'ordered', '5');
		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe('createRowEditor — speichern (#115)', () => {
	it('übergibt Mengen, MwSt, Preis und Preisbasis in einem Zug und schließt die Zeile', () => {
		const onSave = vi.fn();
		const editor = createRowEditor({ onSave });
		editor.open(material({ ordered_quantity: 10 }));

		editor.edit('m1', 'ordered', '30');
		editor.edit('m1', 'actual', '25');
		editor.edit('m1', 'tax', '20');
		editor.edit('m1', 'net', '2');
		editor.save('m1');

		expect(onSave).toHaveBeenCalledWith('m1', {
			ordered_quantity: 30,
			actual_quantity: 25,
			tax_rate: 20,
			unit_price: 2,
			price_is_net: true
		});
		expect(editor.getState().open).toBe(0);
	});

	it('lässt die gespeicherte Zeile kurz aufblitzen und dann wieder ruhig werden', () => {
		vi.useFakeTimers();
		const editor = createRowEditor({ onSave: vi.fn(), flashMs: 900 });
		editor.open(material());

		editor.edit('m1', 'ordered', '5');
		editor.save('m1');
		expect(editor.getState().savedIds).toEqual(['m1']);

		vi.advanceTimersByTime(900);
		expect(editor.getState().savedIds).toEqual([]);
	});

	it('schreibt eine offene, unberührte Zeile nicht — Speichern ohne Änderung ist keine Änderung', () => {
		const onSave = vi.fn();
		const editor = createRowEditor({ onSave });
		editor.open(material({ ordered_quantity: 10 }));

		editor.save('m1');

		expect(onSave).not.toHaveBeenCalled();
		expect(editor.getState().open).toBe(0);
	});

	it('speichert alle offenen Zeilen auf einen Griff', () => {
		const onSave = vi.fn();
		const editor = createRowEditor({ onSave });
		editor.openAll([material({ id: 'a' }), material({ id: 'b' }), material({ id: 'c' })]);

		editor.edit('a', 'net', '1');
		editor.edit('b', 'net', '2');
		editor.saveAll();

		expect(onSave).toHaveBeenCalledTimes(2);
		expect(editor.getState().open).toBe(0);
	});

	it('lässt nach dem Sammel-Speichern die Preislücken und die Zwischensumme stimmen', () => {
		// Eine Lieferantenrechnung: drei Zeilen offen, zwei bekommen einen Preis.
		const positionen = [
			material({ id: 'a', name: 'Bier', ordered_quantity: 10 }),
			material({ id: 'b', name: 'Wein', ordered_quantity: 5 }),
			material({ id: 'c', name: 'Saft', ordered_quantity: 7 })
		];
		const gespeichert = new Map(positionen.map((m) => [m.id, m]));
		const editor = createRowEditor({
			onSave: (id, update) => gespeichert.set(id, { ...gespeichert.get(id)!, ...update })
		});

		editor.openAll(positionen);
		editor.edit('a', 'tax', '20');
		editor.edit('a', 'net', '2');
		editor.edit('b', 'gross', '3.30');
		editor.saveAll();

		const danach = [...gespeichert.values()];
		expect(withoutPrice(danach)).toBe(1);
		// 2 netto + 20 % = 2,40 × 10 = 24, dazu 3,30 brutto × 5 = 16,50
		expect(sumTotals(danach)).toBe(40.5);
	});
});

describe('createRowEditor — abbrechen (#115)', () => {
	it('lässt die Position unverändert', () => {
		const onSave = vi.fn();
		const editor = createRowEditor({ onSave });
		editor.open(material({ ordered_quantity: 10 }));

		editor.edit('m1', 'ordered', '999');
		editor.cancel('m1');

		expect(onSave).not.toHaveBeenCalled();
		expect(editor.getState().draftsById['m1']).toBeUndefined();
		expect(editor.getState().open).toBe(0);
	});

	it('verwirft auf einen Griff alle offenen Zeilen', () => {
		const onSave = vi.fn();
		const editor = createRowEditor({ onSave });
		editor.openAll([material({ id: 'a' }), material({ id: 'b' })]);

		editor.edit('a', 'ordered', '3');
		editor.cancelAll();

		expect(onSave).not.toHaveBeenCalled();
		expect(editor.getState().open).toBe(0);
	});
});

describe('createRowEditor — Rückfrage beim Sichtwechsel (#115)', () => {
	it('hält den Achsenwechsel zurück und warnt, solange eine Zeile ungespeichert ist', () => {
		const editor = createRowEditor({ onSave: vi.fn() });
		const wechseln = vi.fn();
		editor.open(material({ ordered_quantity: 10 }));
		editor.edit('m1', 'ordered', '12');

		editor.requestViewChange('axis', wechseln);

		expect(editor.getState().guard).toBe('axis');
		expect(wechseln).not.toHaveBeenCalled();
	});

	it('lässt den Wechsel durch, wenn nur unberührte Zeilen offen sind — und schließt sie', () => {
		const editor = createRowEditor({ onSave: vi.fn() });
		const wechseln = vi.fn();
		editor.open(material({ ordered_quantity: 10 }));

		editor.requestViewChange('group', wechseln);

		expect(wechseln).toHaveBeenCalledTimes(1);
		expect(editor.getState().guard).toBeNull();
		expect(editor.getState().open).toBe(0);
	});

	it('speichert auf „Speichern" und wechselt dann', () => {
		const onSave = vi.fn();
		const editor = createRowEditor({ onSave });
		const wechseln = vi.fn();
		editor.open(material({ ordered_quantity: 10 }));
		editor.edit('m1', 'ordered', '12');
		editor.requestViewChange('search', wechseln);

		editor.resolveGuard('save');

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(wechseln).toHaveBeenCalledTimes(1);
		expect(editor.getState().guard).toBeNull();
	});

	it('wirft auf „Verwerfen" die Entwürfe weg und wechselt', () => {
		const onSave = vi.fn();
		const editor = createRowEditor({ onSave });
		const wechseln = vi.fn();
		editor.open(material({ ordered_quantity: 10 }));
		editor.edit('m1', 'ordered', '12');
		editor.requestViewChange('category', wechseln);

		editor.resolveGuard('discard');

		expect(onSave).not.toHaveBeenCalled();
		expect(wechseln).toHaveBeenCalledTimes(1);
		expect(editor.getState().open).toBe(0);
	});

	it('bleibt auf „Zurück" stehen — der Wechsel findet nicht statt, die Entwürfe bleiben', () => {
		const editor = createRowEditor({ onSave: vi.fn() });
		const wechseln = vi.fn();
		editor.open(material({ ordered_quantity: 10 }));
		editor.edit('m1', 'ordered', '12');
		editor.requestViewChange('axis', wechseln);

		editor.resolveGuard('back');

		expect(wechseln).not.toHaveBeenCalled();
		expect(editor.getState().guard).toBeNull();
		expect(editor.getState().draftsById['m1']?.ordered).toBe('12');
	});
});
