import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { matchRow } from '@/lib/__tests__/matchRowFactory';
import { groupRowsByStation } from '@/lib/materialHandover';
import type { MatchRow } from '@/lib/materialMatcher';
import HandoverGroupBox from './HandoverGroupBox';

/* Seam dieses Tests (aus #118 vor dem ersten Test festgehalten): `HandoverGroupBox`
   ist der Stations-Kasten der Übernahme — grüner Halftone-Kopf wie in der
   Arbeitsliste (#113), aber er zählt Positionen und Neuanlagen statt Geld. */

const render = (rows: MatchRow[]) => {
	const [group] = groupRowsByStation(rows);
	return renderToStaticMarkup(
		<HandoverGroupBox group={group}>
			<p>Übernahme-Tabelle</p>
		</HandoverGroupBox>
	);
};

describe('HandoverGroupBox — der Kopf des Kastens', () => {
	it('trägt Stationsname und Anzahl auf grüner Plakatfläche', () => {
		const html = render([matchRow({ name: 'Bier' }), matchRow({ name: 'Wein' })]);

		expect(html).toContain('poster');
		expect(html).toContain('Ausschank');
		expect(html).toContain('2 Positionen');
	});

	it('stempelt, wie viele Positionen der Station neu angelegt würden', () => {
		const html = render([
			matchRow({ name: 'Bier' }),
			matchRow({ name: 'Spritzwein', status: 'only-source' })
		]);

		expect(html).toContain('1 wird neu angelegt');
	});

	it('setzt den Stempel bei mehreren in die Mehrzahl', () => {
		const html = render([
			matchRow({ name: 'Spritzwein', status: 'only-source' }),
			matchRow({ name: 'Sturm', status: 'only-source' })
		]);

		expect(html).toContain('2 werden neu angelegt');
	});

	it('lässt den Stempel weg, wo nichts Neues dazukommt', () => {
		expect(render([matchRow({ name: 'Bier' })])).not.toContain('neu angelegt');
	});

	it('zeigt die durchgereichte Tabelle', () => {
		expect(render([matchRow({ name: 'Bier' })])).toContain('Übernahme-Tabelle');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render([matchRow({ name: 'Bier' })])).not.toContain('rounded');
	});
});
