import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { useCellEditor } from '@/hooks/useCellEditor';
import type { CellUpdate } from '@/lib/materialCellEdit';

import MaterialTable from './MaterialTable';

/* Seam dieses Tests (Acceptance Criteria aus #216/#217): `useCellEditor` hält
   die offene Zelle, `MaterialTable` malt sie und meldet Klick und Taste. Die
   Rechenregeln stehen in `materialCellEdit`, das Zustandsspiel in
   `materialCellEditor` — hier zählt, dass Klick, Auswahl, Enter, Tab, Esc und
   ein fehlgeschlagenes Speichern zusammen das Richtige tun. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};

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
			cellEdit={{
				editing: snapshot.editing,
				value: snapshot.value,
				touched: snapshot.touched,
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

let root: Root | null = null;

const mount = async (
	start: FestivalMaterialWithStation[],
	save?: (id: string, update: CellUpdate) => Promise<unknown>
) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	root = createRoot(host);
	await act(async () => {
		root?.render(<Harness start={start} save={save} />);
	});
};

afterEach(async () => {
	// Abhängen, nicht nur leerräumen: der grüne Blitz läuft auf einem Timer
	// weiter, und meldete er sich nach dem Abbau der Testumgebung, griffe React
	// ins tote `window` — ein unbehandelter Fehler, der andere Suites verfälscht.
	await act(async () => {
		root?.unmount();
	});
	root = null;
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

/** Die MwSt-Zelle ist eine Auswahl, kein Tippfeld (#217). */
const openSelect = () => document.querySelector<HTMLSelectElement>('tbody select');

/** Die offene Zelle, gleich welcher Art — ihre Vorlesehilfe nennt sie. */
const openCell = () => openField() ?? openSelect();

/** Eine Auswahl treffen, wie es die Maus tut: Wert setzen, `change` melden. */
const choose = async (el: HTMLSelectElement | null, value: string) => {
	const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
	await act(async () => {
		setter?.call(el, value);
		el?.dispatchEvent(new Event('change', { bubbles: true }));
	});
};

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

	it('läuft mit Tab durch alle fünf tippbaren Zellen und dann in die nächste Zeile (#217)', async () => {
		await mount([material(), WEIN]);

		await click(byLabel('Bestellt von Bier'));
		const weg: (string | null | undefined)[] = [];
		for (let i = 0; i < 5; i++) {
			await press('Tab');
			weg.push(openCell()?.getAttribute('aria-label'));
		}

		expect(weg).toEqual([
			'Verbraucht von Bier',
			'MwSt von Bier',
			'Netto von Bier',
			'Brutto von Bier',
			'Bestellt von Wein'
		]);
	});

	it('führt Shift+Tab denselben Weg zurück', async () => {
		await mount([material(), WEIN]);

		await click(byLabel('Bestellt von Wein'));
		await press('Tab', true);

		expect(openCell()?.getAttribute('aria-label')).toBe('Brutto von Bier');
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

	it('nimmt das Dezimalkomma der Lieferantenrechnung an', async () => {
		// Ein `type="number"` verwürfe es still: die Zelle zeigte „2,5" und
		// speicherte „nicht erfasst".
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material()], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '2,5');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { actual_quantity: 2.5 });
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

describe('Zellbearbeitung — die Preise in der Zelle (#217)', () => {
	/** 10 € netto, 20 % — Netto ist die Quelle. */
	const PREIS = material({ unit_price: 10, tax_rate: 20, price_is_net: true });

	it('macht die MwSt-Zelle zur Auswahl — keine, 10, 13, 20 %', async () => {
		await mount([PREIS]);

		await click(byLabel('MwSt von Bier'));

		const options = [...(openSelect()?.options ?? [])].map((o) => o.value);
		expect(options).toEqual(['', '10', '13', '20']);
		expect(openSelect()?.value).toBe('20');
	});

	it('lässt einen abweichend erfassten Satz wählbar, statt ihn zu schlucken', async () => {
		await mount([material({ unit_price: 10, tax_rate: 7, price_is_net: true })]);

		await click(byLabel('MwSt von Bier'));

		expect([...(openSelect()?.options ?? [])].map((o) => o.value)).toContain('7');
	});

	it('speichert die gewählte MwSt sofort und geht weiter nach Netto', async () => {
		// Ohne den Sprung bräche der Tastaturfluss genau hier ab: die Zelle ginge
		// zu und der Fokus läge im Dokument statt in der Tabelle.
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([PREIS], save);

		await click(byLabel('MwSt von Bier'));
		await choose(openSelect(), '10');

		expect(save).toHaveBeenCalledWith('bier', { tax_rate: 10 });
		expect(openCell()?.getAttribute('aria-label')).toBe('Netto von Bier');
	});

	it('speichert beim Blättern mit der Pfeiltaste noch nicht', async () => {
		// Ein geschlossenes `<select>` meldet jede Pfeiltaste als `change`. Wer
		// von 20 nach 10 blättert, käme sonst nie an — die 13 unterwegs wäre
		// gespeichert und die Zelle zu.
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([PREIS], save);

		await click(byLabel('MwSt von Bier'));
		await press('ArrowUp');
		await choose(openSelect(), '13');

		expect(save).not.toHaveBeenCalled();
		expect(openSelect()?.value).toBe('13');

		// Erst Tab bestätigt — dann speichert die Zelle und geht weiter.
		await press('Tab');
		expect(save).toHaveBeenCalledWith('bier', { tax_rate: 13 });
	});

	it('rechnet nach dem Steuersatzwechsel die Gegenseite neu, nicht die Quelle', async () => {
		await mount([PREIS]);

		await click(byLabel('MwSt von Bier'));
		await choose(openSelect(), '10');

		// Die Auswahl ist weitergesprungen: Netto steht als Feld da und trägt
		// unverändert die erfasste Quelle.
		expect(openField()?.value).toBe('10,00');
		expect(byLabel('Brutto von Bier')?.textContent).toContain('11,00'); // 10 + 10 %
	});

	it('macht Netto tippbar und schreibt es als Quelle weg', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material({ unit_price: 12, tax_rate: 20, price_is_net: false })], save);

		await click(byLabel('Netto von Bier'));
		// Mit Komma wie die gelesene Zelle — der Betrag darf beim Anklicken nicht
		// die Schreibweise wechseln.
		expect(openField()?.value).toBe('10,00'); // 12 brutto bei 20 %
		await type(openField(), '20');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { unit_price: 20, price_is_net: true });
	});

	it('macht Brutto tippbar und schreibt es als Quelle weg', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([PREIS], save);

		await click(byLabel('Brutto von Bier'));
		await type(openField(), '24');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { unit_price: 24, price_is_net: false });
	});

	it('zeigt der Nachbarzelle den eben gespeicherten Preis, nicht den von vorher', async () => {
		// Netto 10 → 20 tippen, Tab: Brutto muss mit 24,00 aufgehen. Das Nachladen
		// der Liste ist da noch unterwegs — der Sprung darf nicht auf ihm warten.
		await mount([PREIS]);

		await click(byLabel('Netto von Bier'));
		await type(openField(), '20');
		await press('Tab');

		expect(openField()?.getAttribute('aria-label')).toBe('Brutto von Bier');
		expect(openField()?.value).toBe('24,00');
	});

	it('lässt die Gegenseite schon beim Tippen mitrechnen', async () => {
		await mount([PREIS]);

		await click(byLabel('Netto von Bier'));
		await type(openField(), '20');

		// Noch nichts gespeichert — die Brutto-Zelle zeigt trotzdem 20 + 20 %.
		expect(byLabel('Brutto von Bier')?.textContent).toContain('24,00');
	});

	it('lässt Gesamt der Zeile beim Tippen mitrechnen', async () => {
		await mount([material({ unit_price: 10, tax_rate: null, ordered_quantity: 10 })]);

		await click(byLabel('Brutto von Bier'));
		await type(openField(), '3');

		expect(document.querySelector('tbody tr')?.textContent).toContain('30,00');
	});

	it('macht aus einem geleerten Preisfeld eine Preislücke', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([PREIS], save);

		await click(byLabel('Netto von Bier'));
		await type(openField(), '');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { unit_price: null, price_is_net: true });
	});

	it('verändert einen unberührten Preis nicht durch seine Rundung', async () => {
		// 0,8334 € je Liter steht in der Zelle als 0,83. Wer nur hindurchtabt,
		// darf den gespeicherten Preis nicht auf Cent kürzen.
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material({ unit_price: 0.8334, tax_rate: 20, price_is_net: true })], save);

		await click(byLabel('Netto von Bier'));
		expect(openField()?.value).toBe('0,83');
		await press('Tab');

		expect(save).not.toHaveBeenCalled();
	});

	it('macht die Gegenseite zur Quelle, wenn man ihren Betrag abtippt', async () => {
		// 50,00 steht in Brutto einer netto erfassten Position. Wer ihn von der
		// Rechnung abtippt, meint *brutto* — sonst rechnete der nächste
		// Steuersatzwechsel die falsche Seite um.
		const save = vi.fn().mockResolvedValue(undefined);
		await mount([material({ unit_price: 41.67, tax_rate: 20, price_is_net: true })], save);

		await click(byLabel('Brutto von Bier'));
		// So tippt man wirklich: leeren und den Betrag von der Rechnung setzen.
		await type(openField(), '');
		await type(openField(), '50,00');
		await press('Enter');

		expect(save).toHaveBeenCalledWith('bier', { unit_price: 50, price_is_net: false });
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

	it('holt den Fokus zurück ins Feld — „Enter versucht es erneut" braucht ihn', async () => {
		// Der Fehlschlag kommt typisch aus dem Blur: der Fokus ist dann längst
		// woanders, und die rote Zelle wäre nur per Klick wieder erreichbar.
		const save = vi.fn().mockRejectedValue(new Error('offline'));
		await mount([material(), WEIN], save);

		await click(byLabel('Verbraucht von Bier'));
		await type(openField(), '80');
		await act(async () => {
			openField()?.blur();
		});

		expect(document.activeElement).toBe(openField());
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
