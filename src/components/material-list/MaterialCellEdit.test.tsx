import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { useCellEditor } from '@/hooks/useCellEditor';
import type { CellUpdate } from '@/lib/materialCellEdit';

import MaterialTable from './MaterialTable';
import type { RowEditControls } from './MaterialTableCells';

/* Seam dieses Tests (Acceptance Criteria aus #216): `useCellEditor` hält die
   offene Zelle, `MaterialTable` malt sie und meldet Klick und Taste. Die
   Rechenregeln stehen in `materialCellEdit`, das Zustandsspiel in
   `materialCellEditor` — hier zählt, dass Klick, Enter, Tab, Esc und ein
   fehlgeschlagenes Speichern zusammen das Richtige tun. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};

/** Der Zeilenmodus ✎ bleibt vorerst für die Preise stehen (#216) — hier hat er
nichts offen, damit die Zellbearbeitung allein an der Reihe ist. */
const CLOSED_ROWS: RowEditControls = {
	draftsById: {},
	savedIds: [],
	focusId: null,
	onStartEdit: noop,
	onDraftChange: noop,
	onSaveRow: noop,
	onCancelRow: noop
};

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'bier',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Liter',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 100,
		actual_quantity: null,
		unit_price: 2,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const WEIN = material({ id: 'wein', name: 'Wein', ordered_quantity: 20 });
const SAFT = material({ id: 'saft', name: 'Saft', ordered_quantity: 5 });

/**
 * Die Arbeitsliste, so weit dieser Test sie braucht: `onSave` schreibt in den
 * Stand der Liste zurück, wie es das Nachladen nach der Mutation tut — nur so
 * lässt sich prüfen, dass Δ, Gesamt und der Fuß danach mitrechnen.
 */
const Harness: React.FC<{
	start: FestivalMaterialWithStation[];
	save?: (id: string, update: CellUpdate) => Promise<unknown>;
}> = ({ start, save }) => {
	const [materials, setMaterials] = useState(start);
	const { editor, snapshot } = useCellEditor({
		onSave: async (id, update) => {
			await save?.(id, update);
			setMaterials((rows) => rows.map((r) => (r.id === id ? { ...r, ...update } : r)));
		}
	});
	return (
		<MaterialTable
			materials={materials}
			showStation={false}
			onEdit={noop}
			onDelete={noop}
			onCopy={noop}
			rowEdit={CLOSED_ROWS}
			cellEdit={{
				editing: snapshot.editing,
				value: snapshot.value,
				saving: snapshot.saving,
				failed: snapshot.failed,
				savedIds: snapshot.savedIds,
				onOpen: (m, column) => editor.open(m, column),
				onType: editor.type,
				onCommit: (move) => void editor.commit(move, materials),
				onCancel: editor.cancel
			}}
		/>
	);
};

const mount = async (
	start: FestivalMaterialWithStation[],
	save?: (id: string, update: CellUpdate) => Promise<unknown>
) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(<Harness start={start} save={save} />);
	});
};

afterEach(() => {
	document.body.innerHTML = '';
});

const byLabel = <T extends HTMLElement>(label: string) =>
	document.querySelector<T>(`[aria-label="${label}"]`);

const click = async (el: Element | null | undefined) => {
	await act(async () => {
		el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

/** React hört auf das native `input`-Ereignis, nicht auf ein gesetztes `value`. */
const type = async (el: HTMLInputElement | null, value: string) => {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	await act(async () => {
		setter?.call(el, value);
		el?.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

const press = async (key: string, shiftKey = false) => {
	await act(async () => {
		document.activeElement?.dispatchEvent(
			new KeyboardEvent('keydown', { key, shiftKey, bubbles: true })
		);
	});
};

/** Das Eingabefeld, das gerade offen steht — es gibt höchstens eines. */
const openField = () => document.querySelector<HTMLInputElement>('tbody input');

describe('Zellbearbeitung — ein Klick macht die Zelle zum Feld (#216)', () => {
	it('öffnet genau die angeklickte Zelle, nicht die ganze Zeile', async () => {
		await mount([material(), WEIN]);
		expect(document.querySelectorAll('tbody input')).toHaveLength(0);

		await click(byLabel('Verbraucht von Bier'));

		expect(document.querySelectorAll('tbody input')).toHaveLength(1);
		expect(openField()?.getAttribute('aria-label')).toBe('Verbraucht von Bier');
	});

	it('stellt den Fokus ins Feld, damit sofort getippt werden kann', async () => {
		await mount([material()]);

		await click(byLabel('Bestellt von Bier'));

		expect(document.activeElement).toBe(openField());
	});

	it('lässt Zeilenhöhe und Spaltenraster stehen — nichts springt', async () => {
		await mount([material(), WEIN]);
		const before = document.querySelectorAll('tbody tr').length;

		await click(byLabel('Verbraucht von Bier'));

		expect(document.querySelectorAll('tbody tr')).toHaveLength(before);
		expect(document.querySelectorAll('.h-\\[56px\\]')).toHaveLength(2);
		expect(document.querySelectorAll('col')).toHaveLength(11);
	});
});

describe('Zellbearbeitung — die Zelle speichert beim Verlassen (#216)', () => {
	it('schreibt weg, sobald der Fokus die Zelle verlässt — ohne Sammel-Speichern', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material()], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '80');
		await act(async () => {
			openField()?.blur();
		});

		expect(save).toHaveBeenCalledWith('bier', { actual_quantity: 80 });
		expect(openField()).toBeNull();
	});

	it('trägt Δ, Gesamt und die Zwischensumme danach neu vor', async () => {
		await mount([material({ unit_price: 2, tax_rate: null })]);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '80');
		await press('Enter');

		const text = document.body.textContent ?? '';
		expect(text).toContain('-20'); // 80 verbraucht gegen 100 bestellt
		expect(text).toContain('160,00'); // 2 € × 80 — Zeilensumme und Zwischensumme
	});

	it('blitzt die gespeicherte Zeile grün auf', async () => {
		await mount([material()]);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '80');
		await press('Enter');

		expect(document.querySelector('.animate-blitz-gruen')).not.toBeNull();
	});
});

describe('Zellbearbeitung — der Tastaturfluss des Rechnungsabgleichs (#216)', () => {
	it('geht mit Enter in dieselbe Spalte der nächsten Zeile — Zahl, Enter, Zahl, Enter', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material(), WEIN, SAFT], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '80');
		await press('Enter');
		expect(openField()?.getAttribute('aria-label')).toBe('Verbraucht von Wein');

		await type(openField(), '15');
		await press('Enter');

		expect(save).toHaveBeenNthCalledWith(1, 'bier', { actual_quantity: 80 });
		expect(save).toHaveBeenNthCalledWith(2, 'wein', { actual_quantity: 15 });
		expect(openField()?.getAttribute('aria-label')).toBe('Verbraucht von Saft');
	});

	it('geht mit Shift+Enter eine Zeile hoch', async () => {
		await mount([material(), WEIN]);

		await click(byLabel('Verbraucht von Wein'));
		await press('Enter', true);

		expect(openField()?.getAttribute('aria-label')).toBe('Verbraucht von Bier');
	});

	it('läuft mit Tab durch die Mengenzellen — rechts, dann eine Zeile tiefer', async () => {
		await mount([material(), WEIN]);

		await click(byLabel('Bestellt von Bier'));
		await press('Tab');
		expect(openField()?.getAttribute('aria-label')).toBe('Verbraucht von Bier');

		await press('Tab');
		expect(openField()?.getAttribute('aria-label')).toBe('Bestellt von Wein');

		await press('Tab', true);
		expect(openField()?.getAttribute('aria-label')).toBe('Verbraucht von Bier');
	});

	it('stellt mit Esc den gespeicherten Wert wieder her', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material()], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '999');
		await press('Escape');

		expect(save).not.toHaveBeenCalled();
		expect(openField()).toBeNull();

		await click(byLabel('Verbraucht von Bier'));
		expect(openField()?.value).toBe('');
	});
});

describe('Zellbearbeitung — leer und 0 bei Verbraucht (#216)', () => {
	it('speichert eine geleerte Verbraucht-Zelle als „nicht erfasst"', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material({ actual_quantity: 40 })], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { actual_quantity: null });
	});

	it('speichert eine 0 als „nichts verbraucht"', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material()], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '0');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { actual_quantity: 0 });
	});

	it('macht aus einer geleerten Bestellt-Zelle eine 0', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material()], save);

		await click(byLabel('Bestellt von Bier'));
		await type(openField(), '');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { ordered_quantity: 0 });
	});
});

describe('Zellbearbeitung — Speicherfehler (#216)', () => {
	it('lässt die Zelle offen, rot markiert, mit dem getippten Wert und einer Meldung', async () => {
		const save = vi.fn().mockRejectedValue(new Error('offline'));
		await mount([material(), WEIN], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '80');
		await press('Enter');

		const field = openField();
		expect(field?.getAttribute('aria-label')).toBe('Verbraucht von Bier');
		expect(field?.value).toBe('80');
		expect(field?.getAttribute('aria-invalid')).toBe('true');
		expect(field?.className).toContain('border-rot');
		expect(document.querySelector('[role="alert"]')?.textContent).toContain('Nicht gespeichert');
	});

	it('speichert beim nächsten Enter und geht dann erst weiter', async () => {
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce(undefined);
		await mount([material(), WEIN], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '80');
		await press('Enter');
		await press('Enter');

		expect(save).toHaveBeenCalledTimes(2);
		expect(document.querySelector('[role="alert"]')).toBeNull();
		expect(openField()?.getAttribute('aria-label')).toBe('Verbraucht von Wein');
	});
});
