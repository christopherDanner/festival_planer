import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { FestivalMaterialWithStation } from '@/lib/materialService';

import MaterialCardList from './MaterialCardList';
import UnsavedCardsDialog from './UnsavedCardsDialog';
import { useMaterialCardDrafts } from './hooks/useMaterialCardDrafts';

/* Seam dieses Tests (aus #116 abgeleitet): `useMaterialCardDrafts` hält die
   offenen Karten und die Rückfrage beim Umschalten, `MaterialCardList` malt
   Karten und Sammel-Fußleiste. Die Rechenregeln stehen in `materialRowEdit`,
   die Optik einer Karte in `MaterialCard.test.tsx` — hier zählt, dass ✎, ✓, ✕
   und der Achsenwechsel zusammen das Richtige tun. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'mat1',
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
		unit_price: null,
		tax_rate: 20,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const WEIN = material({ id: 'mat2', name: 'Wein', ordered_quantity: 20 });

const Harness: React.FC<{
	materials: FestivalMaterialWithStation[];
	onSave: (id: string, updates: unknown) => void;
	onAxisChange: () => void;
}> = ({ materials, onSave, onAxisChange }) => {
	const cards = useMaterialCardDrafts(onSave);
	return (
		<>
			<button type="button" data-test="achse" onClick={() => cards.attempt(onAxisChange)}>
				Achse wechseln
			</button>
			<MaterialCardList
				materials={materials}
				showStation={false}
				cards={cards}
				onEdit={() => {}}
				onCopy={() => {}}
				onDelete={() => {}}
			/>
			<UnsavedCardsDialog cards={cards} />
		</>
	);
};

const mount = async (
	materials: FestivalMaterialWithStation[],
	onSave: (id: string, updates: unknown) => void = () => {},
	onAxisChange: () => void = () => {}
) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<Harness materials={materials} onSave={onSave} onAxisChange={onAxisChange} />
		);
	});
};

afterEach(() => {
	document.body.innerHTML = '';
});

const byLabel = <T extends HTMLElement>(label: string) =>
	document.querySelector<T>(`[aria-label="${label}"]`);

const byText = (needle: string) =>
	[...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(needle));

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

describe('MaterialCardList — ✎ öffnet den Zeilenmodus (#116)', () => {
	it('macht aus den Wert-Kacheln der einen Karte Eingabefelder', async () => {
		await mount([material(), WEIN]);
		expect(document.querySelectorAll('input')).toHaveLength(0);

		await click(byLabel('Werte von Bier bearbeiten'));

		expect(document.querySelectorAll('input')).toHaveLength(4);
		// Die Nachbarkarte bleibt lesend — ✎ öffnet genau eine Karte.
		expect(byLabel('Werte von Wein bearbeiten')).not.toBeNull();
	});

	it('rechnet Brutto mit, während Netto getippt wird', async () => {
		await mount([material()]);
		await click(byLabel('Werte von Bier bearbeiten'));

		await type(byLabel<HTMLInputElement>('Netto € für Bier'), '20');

		expect(byLabel<HTMLInputElement>('Brutto € für Bier')?.value).toBe('24.00');
	});

	it('rechnet Δ und Gesamt mit, während Mengen getippt werden', async () => {
		await mount([material()]);
		await click(byLabel('Werte von Bier bearbeiten'));

		await type(byLabel<HTMLInputElement>('Netto € für Bier'), '1');
		await type(byLabel<HTMLInputElement>('Verbraucht (Liter) für Bier'), '120');

		const text = document.body.textContent ?? '';
		expect(text).toContain('+20');
		expect(text).toContain('144,00'); // 1 netto + 20 % = 1,20 × 120
	});
});

describe('MaterialCardList — ✓ und ✕ (#116)', () => {
	it('übernimmt beim Speichern alle fünf Werte in einem Zug', async () => {
		const onSave = vi.fn();
		await mount([material()], onSave);
		await click(byLabel('Werte von Bier bearbeiten'));

		await type(byLabel<HTMLInputElement>('Verbraucht (Liter) für Bier'), '80');
		await type(byLabel<HTMLInputElement>('Brutto € für Bier'), '12');
		await click(byLabel('Werte von Bier speichern'));

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave.mock.calls[0][0]).toBe('mat1');
		expect(onSave.mock.calls[0][1]).toEqual({
			ordered_quantity: 100,
			actual_quantity: 80,
			tax_rate: 20,
			unit_price: 12,
			price_is_net: false
		});
	});

	it('schließt die Karte nach dem Speichern wieder', async () => {
		await mount([material()]);
		await click(byLabel('Werte von Bier bearbeiten'));
		await click(byLabel('Werte von Bier speichern'));

		expect(document.querySelectorAll('input')).toHaveLength(0);
		expect(byLabel('Werte von Bier bearbeiten')).not.toBeNull();
	});

	it('lässt die Position beim Abbrechen unverändert', async () => {
		const onSave = vi.fn();
		await mount([material()], onSave);
		await click(byLabel('Werte von Bier bearbeiten'));

		await type(byLabel<HTMLInputElement>('Verbraucht (Liter) für Bier'), '80');
		await click(byLabel('Bearbeiten von Bier abbrechen'));

		expect(onSave).not.toHaveBeenCalled();
		expect(document.querySelectorAll('input')).toHaveLength(0);
	});
});

describe('MaterialCardList — mehrere offene Karten (#116)', () => {
	it('stellt die Sammel-Fußleiste erst auf, wenn mehr als eine Karte offen ist', async () => {
		await mount([material(), WEIN]);
		await click(byLabel('Werte von Bier bearbeiten'));
		expect(document.body.textContent).not.toContain('Karten offen');

		await click(byLabel('Werte von Wein bearbeiten'));

		expect(document.body.textContent).toContain('2 Karten offen');
	});

	it('zählt in der Fußleiste, welche davon geändert sind', async () => {
		await mount([material(), WEIN]);
		await click(byLabel('Werte von Bier bearbeiten'));
		await click(byLabel('Werte von Wein bearbeiten'));

		await type(byLabel<HTMLInputElement>('Bestellt (Liter) für Wein'), '30');

		expect(document.body.textContent).toContain('davon 1 geändert');
	});

	it('speichert über die Fußleiste alle offenen Karten', async () => {
		const onSave = vi.fn();
		await mount([material(), WEIN], onSave);
		await click(byLabel('Werte von Bier bearbeiten'));
		await click(byLabel('Werte von Wein bearbeiten'));

		await click(byText('Alle 2 speichern'));

		expect(onSave).toHaveBeenCalledTimes(2);
		expect(document.querySelectorAll('input')).toHaveLength(0);
	});

	it('schließt über die Fußleiste alle offenen Karten, ohne zu speichern', async () => {
		const onSave = vi.fn();
		await mount([material(), WEIN], onSave);
		await click(byLabel('Werte von Bier bearbeiten'));
		await click(byLabel('Werte von Wein bearbeiten'));

		await click(byText('Alle verwerfen'));

		expect(onSave).not.toHaveBeenCalled();
		expect(document.querySelectorAll('input')).toHaveLength(0);
	});
});

describe('MaterialCardList — Warnung beim Umschalten (#116)', () => {
	it('wechselt die Achse ohne Rückfrage, solange nichts geändert ist', async () => {
		const onAxisChange = vi.fn();
		await mount([material()], () => {}, onAxisChange);
		await click(byLabel('Werte von Bier bearbeiten'));

		await click(document.querySelector('[data-test="achse"]'));

		expect(onAxisChange).toHaveBeenCalledTimes(1);
		expect(document.body.textContent).not.toContain('Ungespeicherte');
	});

	it('warnt statt still zu verwerfen, wenn eine Karte geändert ist', async () => {
		const onAxisChange = vi.fn();
		await mount([material()], () => {}, onAxisChange);
		await click(byLabel('Werte von Bier bearbeiten'));
		await type(byLabel<HTMLInputElement>('Bestellt (Liter) für Bier'), '120');

		await click(document.querySelector('[data-test="achse"]'));

		expect(onAxisChange).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('Ungespeicherte');
	});

	it('führt den Wechsel nach „Speichern" aus und übernimmt die Karte', async () => {
		const onSave = vi.fn();
		const onAxisChange = vi.fn();
		await mount([material()], onSave, onAxisChange);
		await click(byLabel('Werte von Bier bearbeiten'));
		await type(byLabel<HTMLInputElement>('Bestellt (Liter) für Bier'), '120');
		await click(document.querySelector('[data-test="achse"]'));

		await click(byText('Speichern'));

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onAxisChange).toHaveBeenCalledTimes(1);
	});

	it('führt den Wechsel nach „Verwerfen" aus und speichert nichts', async () => {
		const onSave = vi.fn();
		const onAxisChange = vi.fn();
		await mount([material()], onSave, onAxisChange);
		await click(byLabel('Werte von Bier bearbeiten'));
		await type(byLabel<HTMLInputElement>('Bestellt (Liter) für Bier'), '120');
		await click(document.querySelector('[data-test="achse"]'));

		await click(byText('Verwerfen'));

		expect(onSave).not.toHaveBeenCalled();
		expect(onAxisChange).toHaveBeenCalledTimes(1);
	});

	it('lässt bei „Zurück" alles stehen — Karte offen, Achse unverändert', async () => {
		const onSave = vi.fn();
		const onAxisChange = vi.fn();
		await mount([material()], onSave, onAxisChange);
		await click(byLabel('Werte von Bier bearbeiten'));
		await type(byLabel<HTMLInputElement>('Bestellt (Liter) für Bier'), '120');
		await click(document.querySelector('[data-test="achse"]'));

		await click(byText('Zurück'));

		expect(onSave).not.toHaveBeenCalled();
		expect(onAxisChange).not.toHaveBeenCalled();
		expect(byLabel<HTMLInputElement>('Bestellt (Liter) für Bier')?.value).toBe('120');
	});
});

describe('MaterialCardList — nichts scrollt horizontal (#116)', () => {
	it('stapelt die Karten, statt eine Fläche quer scrollen zu lassen', async () => {
		await mount([material(), WEIN]);

		expect(document.querySelector('.overflow-x-auto')).toBeNull();
		expect(document.querySelectorAll('table')).toHaveLength(0);
	});
});
