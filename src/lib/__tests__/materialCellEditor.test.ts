import { describe, it, expect, vi } from 'vitest';
import { createCellEditor, type CellRow } from '../materialCellEditor';

function row(over: Partial<CellRow> = {}): CellRow {
	return {
		id: 'bier',
		ordered_quantity: 10,
		actual_quantity: null,
		packaging_unit: null,
		amount_per_packaging: null,
		unit_price: 2,
		tax_rate: 20,
		price_is_net: true,
		...over
	};
}

const ROWS = [row(), row({ id: 'wein' }), row({ id: 'saft' })];

describe('createCellEditor — eine Zelle öffnen und wegschreiben (#216)', () => {
	it('öffnet genau die angeklickte Zelle mit ihrem gespeicherten Wert', () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[0], 'ordered');

		expect(editor.getState().editing).toEqual({ id: 'bier', column: 'ordered' });
		expect(editor.getState().value).toBe('10');
	});

	it('speichert beim Verlassen sofort — ohne Sammel-Speichern', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit(null, ROWS);

		expect(onSave).toHaveBeenCalledWith('bier', { actual_quantity: 8 });
		expect(editor.getState().editing).toBeNull();
	});

	it('schreibt nichts, wenn die Zelle steht wie sie stand', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'ordered');
		await editor.commit(null, ROWS);

		expect(onSave).not.toHaveBeenCalled();
	});

	it('lässt die eben gespeicherte Zeile grün aufblitzen', async () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit(null, ROWS);

		expect(editor.getState().savedIds).toEqual(['bier']);
	});
});

describe('createCellEditor — der Tastaturfluss (#216)', () => {
	it('öffnet nach Enter dieselbe Spalte der nächsten Zeile im Eingabezustand', async () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit('down', ROWS);

		expect(editor.getState().editing).toEqual({ id: 'wein', column: 'consumed' });
		expect(editor.getState().value).toBe('');
	});

	it('nimmt den Wert der Zelle mit, in die es springt', async () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[0], 'consumed');
		await editor.commit('forward', ROWS);

		// Tab geht von Verbraucht in die MwSt-Zelle derselben Zeile (#217).
		expect(editor.getState().editing).toEqual({ id: 'bier', column: 'tax' });
		expect(editor.getState().value).toBe('20');
	});

	it('läuft mit Tab bis in die Brutto-Zelle und dann erst in die nächste Zeile (#217)', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'gross');
		expect(editor.getState().value).toBe('2,40'); // 2 netto + 20 %
		await editor.commit('forward', ROWS);

		expect(onSave).not.toHaveBeenCalled(); // unberührt — die Quelle bleibt netto
		expect(editor.getState().editing).toEqual({ id: 'wein', column: 'ordered' });
	});

	it('merkt sich, ob in der Zelle getippt wurde — daran hängt der Preis (#217)', () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[0], 'gross');
		expect(editor.getState().touched).toBe(false);

		editor.type('2,40');
		// Derselbe Betrag, aber jetzt getippt: Brutto wird damit die Quelle.
		expect(editor.getState().touched).toBe(true);
	});

	it('macht die getippte Seite zur Quelle, auch wenn ihr Betrag schon dastand', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'gross');
		editor.type('2,40');
		await editor.commit(null, ROWS);

		expect(onSave).toHaveBeenCalledWith('bier', { unit_price: 2.4, price_is_net: false });
	});

	it('schreibt die getippte Preisseite samt ihrer Quelle weg (#217)', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'gross');
		editor.type('3');
		await editor.commit(null, ROWS);

		expect(onSave).toHaveBeenCalledWith('bier', { unit_price: 3, price_is_net: false });
	});

	it('schreibt die gewählte MwSt sofort weg — der Preis bleibt, wie er erfasst ist (#217)', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'tax');
		editor.type('10');
		await editor.commit(null, ROWS);

		expect(onSave).toHaveBeenCalledWith('bier', { tax_rate: 10 });
	});

	it('schließt am unteren Rand, statt oben wieder anzufangen', async () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[2], 'consumed');
		await editor.commit('down', ROWS);

		expect(editor.getState().editing).toBeNull();
	});

	it('stellt mit Esc den gespeicherten Wert wieder her, ohne zu schreiben', () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'ordered');
		editor.type('999');
		editor.cancel();

		expect(onSave).not.toHaveBeenCalled();
		expect(editor.getState().editing).toBeNull();

		editor.open(ROWS[0], 'ordered');
		expect(editor.getState().value).toBe('10');
	});
});

describe('createCellEditor — die Nachbarzelle kennt den eben gespeicherten Stand (#217)', () => {
	it('öffnet Brutto mit dem eben getippten Netto, nicht mit dem Betrag von vorher', async () => {
		// `rows` ist der Stand beim Tastendruck; das Nachladen der Liste ist beim
		// Sprung noch unterwegs. Ohne den eben geschriebenen Wert stünde in der
		// Brutto-Zelle 2,40 — der Preis von *vor* dem Tippen, und „die andere Seite
		// rechnet sofort nach" (#217) bräche genau an der Stelle, an der man hinsieht.
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[0], 'net');
		editor.type('10');
		await editor.commit('forward', ROWS);

		expect(editor.getState().editing).toEqual({ id: 'bier', column: 'gross' });
		expect(editor.getState().value).toBe('12,00'); // 10 netto + 20 %
	});

	it('misst „unberührt" danach am neuen Stand, nicht am alten', async () => {
		// Sonst verglich die Brutto-Zelle ihre 12,00 gegen den überholten Preis.
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'net');
		editor.type('10');
		await editor.commit('forward', ROWS);
		await editor.commit('forward', ROWS);

		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('nimmt ihn auch in den Klick mit, der während des Speicherns wartete', async () => {
		let release: (() => void) | null = null;
		const onSave = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'net');
		editor.type('10');
		const done = editor.commit(null, ROWS);
		// Der Klick trägt die Zeile mit, wie sie beim Klick dastand — auch sie ist
		// beim Ausgang des Speicherns überholt.
		editor.open(ROWS[0], 'gross');
		release!();
		await done;

		expect(editor.getState().value).toBe('12,00');
	});
});

describe('createCellEditor — Speicherfehler (#216)', () => {
	const reject = () => vi.fn().mockRejectedValue(new Error('offline'));

	it('lässt die Zelle offen, rot markiert und mit dem getippten Wert', async () => {
		const editor = createCellEditor({ onSave: reject() });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit('down', ROWS);

		expect(editor.getState().editing).toEqual({ id: 'bier', column: 'consumed' });
		expect(editor.getState().value).toBe('8');
		expect(editor.getState().failed).toBe(true);
		expect(editor.getState().savedIds).toEqual([]);
	});

	it('speichert beim nächsten Enter — und geht dann erst weiter', async () => {
		const onSave = vi
			.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit('down', ROWS);
		await editor.commit('down', ROWS);

		expect(onSave).toHaveBeenCalledTimes(2);
		expect(onSave).toHaveBeenLastCalledWith('bier', { actual_quantity: 8 });
		expect(editor.getState().failed).toBe(false);
		expect(editor.getState().editing).toEqual({ id: 'wein', column: 'consumed' });
	});

	it('hält die rote Zelle fest, statt sie für einen Klick daneben zu räumen', async () => {
		const editor = createCellEditor({ onSave: reject() });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit(null, ROWS);
		editor.open(ROWS[1], 'consumed');

		// Sonst nähme der Klick auf die nächste Zelle das Getippte still mit.
		expect(editor.getState().editing).toEqual({ id: 'bier', column: 'consumed' });
		expect(editor.getState().value).toBe('8');
	});

	it('lässt den Klick auf eine andere Zelle warten, bis das Speichern durch ist', async () => {
		let release: (() => void) | null = null;
		const onSave = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				})
		);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		// Der Klick auf die nächste Zelle löst erst den Blur aus, dann sich selbst.
		const done = editor.commit(null, ROWS);
		editor.open(ROWS[1], 'ordered');
		release!();
		await done;

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(editor.getState().editing).toEqual({ id: 'wein', column: 'ordered' });
	});

	it('vergisst den wartenden Klick, wenn das Speichern scheitert', async () => {
		let fail: ((reason: Error) => void) | null = null;
		const onSave = vi
			.fn()
			.mockImplementationOnce(() => new Promise((_, reject) => (fail = reject)))
			.mockResolvedValueOnce(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		const done = editor.commit(null, ROWS);
		editor.open(ROWS[2], 'ordered');
		fail!(new Error('offline'));
		await done;
		// Erneutes Enter: es geht eine Zeile tiefer, nicht zum längst vergessenen Klick.
		await editor.commit('down', ROWS);

		expect(editor.getState().editing).toEqual({ id: 'wein', column: 'consumed' });
	});
});

describe('createCellEditor — die Eingabe-Einheit der Spalte (#218)', () => {
	/** 4 Fass à 50 Liter bestellt. */
	const fass = row({ packaging_unit: 'Fass', amount_per_packaging: 50, ordered_quantity: 4 });

	it('öffnet die Zelle in Gebinden, wenn der Spaltenkopf darauf steht', () => {
		const editor = createCellEditor({
			onSave: vi.fn().mockResolvedValue(undefined),
			units: () => ({ ordered: 'packaging', consumed: 'base' })
		});

		editor.open(fass, 'ordered');
		expect(editor.getState().value).toBe('4');

		editor.cancel();
		editor.open(fass, 'consumed');
		expect(editor.getState().value).toBe('');
	});

	it('speichert die getippte Zahl der Gebinde-Spalte als Gebinde', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({
			onSave,
			units: () => ({ ordered: 'base', consumed: 'packaging' })
		});

		editor.open(fass, 'consumed');
		editor.type('2,5');
		await editor.commit(null, [fass]);

		expect(onSave).toHaveBeenCalledWith('bier', { actual_quantity: 2.5 });
	});

	it('nimmt beim Sprung die Einheit der Spalte an, in die es geht', async () => {
		// Tab führt von Bestellt (Basis) nach Verbraucht (Gebinde) — dieselbe
		// Zeile, zwei Einheiten, weil der Kopf je Spalte entscheidet.
		const editor = createCellEditor({
			onSave: vi.fn().mockResolvedValue(undefined),
			units: () => ({ ordered: 'base', consumed: 'packaging' })
		});

		editor.open({ ...fass, actual_quantity: 3 }, 'ordered');
		expect(editor.getState().value).toBe('200');

		await editor.commit('forward', [{ ...fass, actual_quantity: 3 }]);
		expect(editor.getState().editing).toEqual({ id: 'bier', column: 'consumed' });
		expect(editor.getState().value).toBe('3');
	});

	it('bleibt ohne Angabe bei der Basiseinheit', () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(fass, 'ordered');
		expect(editor.getState().value).toBe('200');
	});
});

describe('createCellEditor — der Blur der verlassenen Zelle (#216)', () => {
	it('überhört ihn, statt die eben aufgegangene Zelle wieder zuzumachen', async () => {
		const editor = createCellEditor({ onSave: vi.fn().mockResolvedValue(undefined) });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit('down', ROWS);
		// Das Feld der alten Zelle geht aus dem Bild und meldet dabei seinen Blur.
		await editor.commit(null, ROWS, { id: 'bier', column: 'consumed' });

		expect(editor.getState().editing).toEqual({ id: 'wein', column: 'consumed' });
	});

	it('nimmt ihn an, solange er die offene Zelle meint', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const editor = createCellEditor({ onSave });

		editor.open(ROWS[0], 'consumed');
		editor.type('8');
		await editor.commit(null, ROWS, { id: 'bier', column: 'consumed' });

		expect(onSave).toHaveBeenCalledWith('bier', { actual_quantity: 8 });
	});
});
