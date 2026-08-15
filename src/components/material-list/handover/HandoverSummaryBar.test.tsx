import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { matchRow } from '@/lib/__tests__/matchRowFactory';
import { handoverSummary } from '@/lib/materialHandover';
import type { SaveState } from '@/lib/materialSaveOrchestrator';
import HandoverSummaryBar from './HandoverSummaryBar';

/* Seam dieses Tests (aus #118 vor dem ersten Test festgehalten): `HandoverSummaryBar`
   ist die Fußleiste der Übernahme — sie zählt den ganzen Lauf, nicht den Reiter,
   und zwar über dieselben Stempel wie die Zeilen (`handoverSummary`). */

const ROWS = [
	matchRow({ name: 'Bier', targetOrdered: 900 }),
	matchRow({ name: 'Almdudler', targetOrdered: 300 }),
	matchRow({ name: 'Spritzwein', status: 'only-source', srcOrdered: 8 }),
	matchRow({ name: 'Kotelett' })
];

const render = (statesByKey: Record<string, SaveState> = {}) =>
	renderToStaticMarkup(<HandoverSummaryBar summary={handoverSummary(ROWS, {}, statesByKey)} />);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

describe('HandoverSummaryBar — was am Fuß steht', () => {
	it('zählt übernommene, neu anzulegende und ausgelassene Positionen', () => {
		const text = parse(render()).textContent ?? '';

		expect(text).toContain('2 Positionen übernommen');
		expect(text).toContain('1 wird neu angelegt');
		expect(text).toContain('1 ausgelassen');
	});

	it('schreibt missglückte Zeilen rot heraus', () => {
		const html = render({ [ROWS[0].key]: { status: 'error', error: 'Netzwerk weg' } });

		expect(html).toMatch(/text-rot[^>]*>1 nicht gespeichert/);
	});

	it('schweigt über Fehler, wo keine sind', () => {
		expect(parse(render()).textContent).not.toContain('nicht gespeichert');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});
