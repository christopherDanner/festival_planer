import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import RowEditGuardDialog from './RowEditGuardDialog';

/* Seam dieses Tests (aus #115): die Rückfrage, die ein Sichtwechsel mit
   ungespeicherten Zeilen auslöst. Wann sie kommt, entscheidet der
   `materialRowEditor` — hier zählt, dass sie warnt und dass ihre drei
   Antworten ankommen. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = async (over: Partial<React.ComponentProps<typeof RowEditGuardDialog>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(<RowEditGuardDialog change="axis" dirty={1} onAnswer={() => {}} {...over} />);
	});
	return host;
};

afterEach(() => {
	document.body.innerHTML = '';
});

const knopf = (label: string) =>
	[...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(label));

const klick = async (label: string) => {
	await act(async () => {
		knopf(label)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

describe('RowEditGuardDialog — warnen statt still verwerfen (#115)', () => {
	it('warnt beim Achsenwechsel mit einer ungespeicherten Zeile', async () => {
		await mount({ change: 'axis', dirty: 1 });
		const text = document.body.textContent ?? '';

		expect(text).toContain('Achse');
		expect(text).toContain('1 geänderte Zeile');
	});

	/** Jeder Griff, der offene Zeilen aus dem Bild nähme, hat sein eigenes Wort —
	„Ungespeicherte Zeilen" allein sagt nicht, was man gerade angefasst hat. */
	it.each([
		['group', 'Reiter'],
		['category', 'Kategorie'],
		['search', 'Suche'],
		['mode', 'Übernahme'],
		['rows', 'zuzuklappen']
	] as const)('nennt %s beim Namen', async (change, wort) => {
		await mount({ change });
		expect(document.body.textContent).toContain(wort);
	});

	it('bietet Speichern, Verwerfen und Zurück an', async () => {
		const onAnswer = vi.fn();
		await mount({ onAnswer });

		await klick('SPEICHERN');
		expect(onAnswer).toHaveBeenLastCalledWith('save');

		await klick('VERWERFEN');
		expect(onAnswer).toHaveBeenLastCalledWith('discard');

		await klick('ZURÜCK');
		expect(onAnswer).toHaveBeenLastCalledWith('back');
	});

	it('bleibt weg, solange kein Wechsel zurückgehalten wird', async () => {
		await mount({ change: null });
		expect(document.body.textContent).toBe('');
	});
});
