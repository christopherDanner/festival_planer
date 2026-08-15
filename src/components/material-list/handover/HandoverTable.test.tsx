import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { matchRow } from '@/lib/__tests__/matchRowFactory';
import type { MatchRow } from '@/lib/materialMatcher';
import type { SaveState } from '@/lib/materialSaveOrchestrator';
import HandoverTable, { HandoverCard, type HandoverTableProps } from './HandoverTable';

/* Seam dieses Tests (aus #118 vor dem ersten Test festgehalten): `HandoverTable`
   ist die Tabelle der Übernahme — **Vorjahr als getönte Referenzspalten**,
   Wunschmenge als gelbes Eingabefeld, Auto-Save-Stempel je Zeile. `HandoverCard`
   ist dieselbe Zeile am Handy (Karten statt querscrollender Tabelle, #116).
   Gesteuert: Werte und Zustände rein, Handler raus. */

const noop = () => {};

// 800 Liter Bier, Fass à 50 l → 16 Fass.
const BIER = matchRow({
	name: 'Bier',
	srcOrdered: 800,
	srcActual: 750,
	targetOrdered: 900,
	unit: 'l',
	packagingUnit: 'Fass',
	amountPerPackaging: 50
});

const props = (over: Partial<HandoverTableProps> = {}): HandoverTableProps => ({
	rows: [BIER],
	desiredByKey: { [BIER.key]: '900' },
	statesByKey: {},
	siblingsByName: new Map(),
	onDesiredChange: noop,
	onCommit: noop,
	onRetry: noop,
	onDelete: noop,
	...over
});

const render = (over: Partial<HandoverTableProps> = {}) =>
	renderToStaticMarkup(<HandoverTable {...props(over)} />);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

describe('HandoverTable — das Vorjahr als Referenz', () => {
	it('stellt Bestellt und Verbraucht des Quellfests in getönte Spalten', () => {
		const host = parse(render());
		const referenz = [...host.querySelectorAll('td')].filter((td) =>
			td.className.includes('bg-papier-getoent')
		);

		expect(host.textContent).toContain('Quellfest');
		expect(referenz).toHaveLength(2);
		expect(referenz[0].textContent).toContain('800');
		expect(referenz[1].textContent).toContain('750');
	});

	it('rechnet die Referenzmenge in Gebinde um', () => {
		expect(parse(render()).textContent).toContain('16 Fass');
	});

	it('schreibt „—", wo das Quellfest nichts hergibt', () => {
		const rows = [matchRow({ name: 'Zelt', status: 'only-target' })];
		const host = parse(render({ rows, desiredByKey: {} }));

		expect(host.textContent).toContain('—');
	});
});

describe('HandoverTable — die Wunschmenge', () => {
	it('bietet sie als gelbes Eingabefeld mit dem laufenden Wert', () => {
		const host = parse(render());
		const input = host.querySelector('input');

		expect(input?.className).toContain('bg-gelb');
		expect(input?.getAttribute('value')).toBe('900');
		expect(host.textContent).toContain('Wunschmenge');
	});

	it('rechnet auch die getippte Menge ins Gebinde um', () => {
		const host = parse(render({ desiredByKey: { [BIER.key]: '1000' } }));

		expect(host.textContent).toContain('20 Fass');
	});
});

describe('HandoverTable — der Auto-Save-Stempel', () => {
	it('stempelt eine Zeile mit vorgefundener Bestellmenge als gespeichert', () => {
		expect(parse(render()).textContent).toContain('✓ GESPEICHERT');
	});

	it('kündigt das Anlegen an, sobald die Quellzeile eine Wunschmenge trägt', () => {
		const spritzwein = matchRow({ name: 'Spritzwein', status: 'only-source', srcOrdered: 8 });
		const host = parse(
			render({ rows: [spritzwein], desiredByKey: { [spritzwein.key]: '8' } })
		);

		expect(host.textContent).toContain('WIRD NEU ANGELEGT');
		expect(host.textContent).toContain('gibt es im Zielfest noch nicht');
	});

	it('verspricht ohne Wunschmenge nichts', () => {
		const rows = [matchRow({ name: 'Spritzwein', status: 'only-source', srcOrdered: 8 })];
		const host = parse(render({ rows, desiredByKey: {} }));

		expect(host.textContent).toContain('NICHT ÜBERNEHMEN');
		expect(host.textContent).toContain('gibt es im Zielfest noch nicht');
	});

	it('reicht einen Fehler samt Wiederholen durch', () => {
		const statesByKey: Record<string, SaveState> = {
			[BIER.key]: { status: 'error', error: 'Netzwerk weg' }
		};
		const host = parse(render({ statesByKey }));

		expect(host.querySelector('[aria-label="Speichern wiederholen"]')).not.toBeNull();
	});
});

describe('HandoverTable — Handgriffe an der Zeile', () => {
	it('bietet das Löschen nur, wo die Position im Zielfest steht', () => {
		const rows: MatchRow[] = [
			BIER,
			matchRow({ name: 'Spritzwein', status: 'only-source', srcOrdered: 8 })
		];
		const host = parse(render({ rows, desiredByKey: {} }));

		expect(host.querySelectorAll('[aria-label="Position löschen"]')).toHaveLength(1);
	});

	it('sagt an, wenn dieselbe Position in mehreren Stationen steht', () => {
		const siblingsByName = new Map([
			[
				BIER.normalizedName,
				[BIER, matchRow({ name: 'Bier', station: 'Grill', srcOrdered: 200 })]
			]
		]);
		const host = parse(render({ siblingsByName }));

		expect(host.textContent).toContain('2×');
		expect(host.querySelector('[data-siblings]')?.getAttribute('title')).toContain('Grill');
	});

	it('nennt Kategorie und Lieferant unter dem Namen statt in eigenen Spalten', () => {
		const rows = [matchRow({ name: 'Bier', category: 'Getränke', supplier: 'Metro' })];
		const host = parse(render({ rows, desiredByKey: {} }));

		expect(host.textContent).toContain('Getränke · Metro');
		expect([...host.querySelectorAll('th')].map((th) => th.textContent)).not.toContain('Lieferant');
	});

	it('schlüsselt eine über mehrere Stationen verteilte Referenzmenge auf', () => {
		const rows = [
			matchRow({
				name: 'Bier',
				srcOrdered: 1000,
				srcAggregateCount: 2,
				sourceDetails: [
					{ stationName: 'Ausschank', ordered: 800, actual: null },
					{ stationName: 'Grill', ordered: 200, actual: null }
				]
			})
		];
		const host = parse(render({ rows, desiredByKey: {} }));

		expect(host.textContent).toContain('Σ2');
		expect(host.querySelector('[data-aggregate]')?.getAttribute('title')).toContain(
			'Ausschank: 800'
		);
	});

	it('scrollt bei Bedarf im eigenen Rahmen, nicht mit der ganzen Seite', () => {
		expect(render()).toContain('overflow-x-auto');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});

describe('HandoverCard — dieselbe Zeile am Handy', () => {
	const renderCard = (row: MatchRow, over: Partial<HandoverTableProps> = {}) =>
		renderToStaticMarkup(
			<HandoverCard
				{...props(over)}
				row={row}
				siblings={props(over).siblingsByName.get(row.normalizedName) ?? [row]}
			/>
		);

	it('trägt Referenzwerte, Wunschmenge und Stempel als Kacheln', () => {
		const host = parse(renderCard(BIER));

		expect(host.textContent).toContain('Bier');
		expect(host.textContent).toContain('800');
		expect(host.textContent).toContain('750');
		expect(host.querySelector('input')?.getAttribute('value')).toBe('900');
		expect(host.textContent).toContain('✓ GESPEICHERT');
	});

	it('scrollt nicht quer — die Karte trägt keine Tabelle', () => {
		const html = renderCard(BIER);

		expect(html).not.toContain('<table');
		expect(html).not.toContain('overflow-x-auto');
	});

	it('rechnet die getippte Menge ins Gebinde um und rechnet ohne sie gar nicht', () => {
		expect(parse(renderCard(BIER)).textContent).toContain('18 Fass');

		const leer = parse(renderCard(BIER, { desiredByKey: {} })).textContent ?? '';
		expect(leer).not.toContain('NaN');
	});
});
