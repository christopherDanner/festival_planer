import { describe, it, expect, vi } from 'vitest';
import { createCellEditor, type CellRow } from '../materialCellEditor';

function row(over: Partial<CellRow> = {}): CellRow {
	return {
		id: 'bier',
		ordered_quantity: 10,
		actual_quantity: null,
		packaging_unit: null,
		amount_per_packaging: null,
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

		// Tab geht von Verbraucht in die Bestellt-Zelle der nächsten Zeile.
		expect(editor.getState().editing).toEqual({ id: 'wein', column: 'ordered' });
		expect(editor.getState().value).toBe('10');
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
