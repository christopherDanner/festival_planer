import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { MaterialGroup } from '@/lib/materialGrouping';

import MaterialGroupDrawer, { MaterialGroupSheetList } from './MaterialGroupDrawer';

const noop = () => {};

function group(over: Partial<MaterialGroup> = {}): MaterialGroup {
	return {
		id: 'station:s1',
		key: 's1',
		name: 'Ausschank',
		unassigned: false,
		materials: [],
		count: 13,
		total: 4400,
		withoutPrice: 0,
		...over
	};
}

const bar = (groups: MaterialGroup[], activeGroupId: string | null, axis: 'station' | 'all' = 'station') =>
	renderToStaticMarkup(
		<MaterialGroupDrawer groups={groups} axis={axis} activeGroupId={activeGroupId} onSelect={noop} />
	);

const sheet = (groups: MaterialGroup[], activeGroupId: string | null) =>
	renderToStaticMarkup(
		<MaterialGroupSheetList groups={groups} activeGroupId={activeGroupId} onSelect={noop} />
	);

/** Ohne Auszeichnung — die Zahlen stehen in eigenen Elementen. */
function text(html: string): string {
	return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

describe('MaterialGroupDrawer — der gelbe Balken (#116)', () => {
	it('nennt die aktive Gruppe mit Anzahl und Zwischensumme', () => {
		const html = bar([group()], 'station:s1');

		expect(text(html)).toContain('Ausschank');
		expect(text(html)).toContain('13');
		expect(text(html)).toContain('€ 4.400');
	});

	it('warnt am Balken, wo Preise fehlen — sonst sähe man die Lücke erst im Kasten', () => {
		expect(text(bar([group({ withoutPrice: 3 })], 'station:s1'))).toContain('3 ⚠');
		expect(text(bar([group({ withoutPrice: 0 })], 'station:s1'))).not.toContain('⚠');
	});

	it('trägt Gelb und Versatz-Schatten — er ist die Auswahl, nicht eine Aufschrift', () => {
		const html = bar([group()], 'station:s1');

		expect(html).toContain('bg-gelb');
		expect(html).toContain('shadow-versatz');
	});

	it('ist ein Antippziel und sagt, wohin es führt', () => {
		const html = bar([group()], 'station:s1');

		expect(html).toContain('<button');
		expect(html).toContain('Gruppe wählen');
	});

	it('entfällt auf der Achse ALLE — dort gibt es genau einen Kasten', () => {
		expect(bar([group({ id: 'all:alle', name: 'Alle Positionen' })], 'all:alle', 'all')).toBe('');
	});

	it('entfällt, solange keine Gruppe da ist', () => {
		expect(bar([], null)).toBe('');
	});
});

describe('MaterialGroupDrawer — die Schublade (#116)', () => {
	const groups = [
		group(),
		group({ id: 'station:s2', key: 's2', name: 'Küche', count: 20, total: 2100, withoutPrice: 2 })
	];

	it('zeigt *alle* Gruppen als vollwertige Kästen — darum Schublade und nicht Dropdown', () => {
		const html = text(sheet(groups, 'station:s1'));

		expect(html).toContain('Ausschank');
		expect(html).toContain('Küche');
		expect(html).toContain('13 Positionen');
		expect(html).toContain('20 Positionen');
	});

	it('trägt je Gruppe die Zwischensumme und die Preislücken', () => {
		const html = text(sheet(groups, 'station:s1'));

		expect(html).toContain('€ 4.400');
		expect(html).toContain('€ 2.100');
		expect(html).toContain('2 ohne Preis');
	});

	it('sagt an der lückenlosen Gruppe „vollständig" statt gar nichts', () => {
		expect(text(sheet(groups, 'station:s1'))).toContain('vollständig');
	});

	it('hebt die aktive Gruppe hervor', () => {
		const html = sheet(groups, 'station:s2');
		const rows = html.split('<button').slice(1);

		expect(rows[0]).not.toContain('bg-gelb');
		expect(rows[1]).toContain('bg-gelb');
	});

	it('gibt jeder Zeile ein Antippziel von mindestens 40 px (DESIGN-VISION §6)', () => {
		expect(sheet(groups, 'station:s1')).toContain('min-h-');
	});
});
