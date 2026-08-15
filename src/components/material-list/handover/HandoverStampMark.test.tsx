import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { handoverStamp } from '@/lib/materialHandover';
import type { MatchRow, MatchRowStatus } from '@/lib/materialMatcher';
import type { SaveState } from '@/lib/materialSaveOrchestrator';
import HandoverStampMark from './HandoverStampMark';

/* Seam dieses Tests (aus #118 vor dem ersten Test festgehalten): `HandoverStampMark`
   ist die Plakat-Darstellung des Auto-Save-Zustands — der Zustand selbst kommt aus
   `handoverStamp`, gespeichert wird weiterhin im `materialSaveOrchestrator`. */

function row(over: { status?: MatchRowStatus; targetOrdered?: number } = {}): MatchRow {
	return {
		key: 'k',
		status: over.status ?? 'match',
		name: 'Bier',
		normalizedName: 'bier',
		stationName: 'Ausschank',
		targetMaterial: null,
		sourceMaterials: [],
		srcOrderedTotal: null,
		srcActualTotal: null,
		srcAggregateCount: 0,
		supplier: null,
		category: null,
		unit: 'Stück',
		packagingUnit: null,
		amountPerPackaging: null,
		targetOrderedQuantity: over.targetOrdered ?? null,
		sourceDetails: []
	};
}

const render = (
	over: { status?: MatchRowStatus; targetOrdered?: number },
	desired = '',
	state?: SaveState
) =>
	renderToStaticMarkup(
		<HandoverStampMark stamp={handoverStamp(row(over), desired, state)} onRetry={() => {}} />
	);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

describe('HandoverStampMark — die drei Stempel aus #118', () => {
	it('stempelt eine übernommene Zeile grün', () => {
		const html = render({ targetOrdered: 18 }, '18');

		expect(html).toContain('✓ GESPEICHERT');
		expect(html).toContain('text-gruen');
	});

	it('stempelt eine Zeile, die neu angelegt wird, grün durchgefärbt', () => {
		const html = render({ status: 'only-source' });

		expect(html).toContain('WIRD NEU ANGELEGT');
		expect(html).toContain('bg-gruen');
	});

	it('stempelt eine ausgelassene Zeile gestrichelt', () => {
		const html = render({});

		expect(html).toContain('NICHT ÜBERNEHMEN');
		expect(html).toContain('border-dashed');
	});
});

describe('HandoverStampMark — Speichern und Scheitern', () => {
	it('macht den Fehler-Stempel zum Knopf, der es noch einmal versucht', () => {
		const host = parse(render({}, '18', { status: 'error', error: 'Netzwerk weg' }));
		const button = host.querySelector('button');

		expect(button?.getAttribute('aria-label')).toBe('Speichern wiederholen');
		expect(button?.getAttribute('title')).toContain('Netzwerk weg');
		expect(host.textContent).toContain('NICHT GESPEICHERT');
	});

	it('lässt einen laufenden Speichervorgang stehen, ohne Knopf', () => {
		const host = parse(render({}, '18', { status: 'saving' }));

		expect(host.textContent).toContain('SPEICHERT');
		expect(host.querySelector('button')).toBeNull();
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render({})).not.toContain('rounded');
	});
});
