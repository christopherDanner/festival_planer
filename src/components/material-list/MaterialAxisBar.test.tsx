import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialAxisBar from './MaterialAxisBar';
import type { MaterialAxis } from '@/lib/materialGrouping';

const render = (axis: MaterialAxis = 'station') =>
	renderToStaticMarkup(<MaterialAxisBar axis={axis} onAxisChange={() => {}} />);

describe('MaterialAxisBar', () => {
	it('bietet die vier Achsen in der Reihenfolge der Entscheidung', () => {
		const html = render();
		const reihenfolge = ['STATION', 'LIEFERANT', 'KATEGORIE', 'ALLE'].map((l) => html.indexOf(l));

		expect(reihenfolge.every((i) => i >= 0)).toBe(true);
		expect([...reihenfolge].sort((a, b) => a - b)).toEqual(reihenfolge);
	});

	it('beschriftet den Schalter, damit klar ist, was er sortiert', () => {
		expect(render()).toContain('Sortiert nach');
	});

	it('markiert die gewählte Achse', () => {
		expect(render('supplier')).toMatch(/aria-checked="true"[^>]*>LIEFERANT/);
	});
});
