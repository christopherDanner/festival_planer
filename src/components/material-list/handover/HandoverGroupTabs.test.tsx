import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { matchRow as row } from '@/lib/__tests__/matchRowFactory';
import { groupRowsByStation } from '@/lib/materialHandover';
import type { MatchRow } from '@/lib/materialMatcher';
import HandoverGroupTabs from './HandoverGroupTabs';

/* Seam dieses Tests (aus #118 vor dem ersten Test festgehalten): `HandoverGroupTabs`
   ist der Reiter-Streifen der Übernahme — dieselbe Handschrift wie die Reiter der
   Arbeitsliste (#113), aber die Übernahme kennt kein Geld: ein Reiter trägt
   Station, Anzahl und wie viele Positionen neu angelegt würden. */

const render = (rows: MatchRow[], active = 0) => {
	const groups = groupRowsByStation(rows);
	return renderToStaticMarkup(
		<HandoverGroupTabs
			groups={groups}
			activeGroupId={groups[active]?.id ?? null}
			onSelect={() => {}}
		/>
	);
};

describe('HandoverGroupTabs — was ein Reiter trägt', () => {
	it('zeigt Station und Anzahl der Positionen', () => {
		const html = render([row({ name: 'Bier' }), row({ name: 'Wein' })]);

		expect(html).toContain('Ausschank');
		expect(html).toMatch(/tabular-nums">2</);
	});

	it('kündigt an, wie viele Positionen der Station neu angelegt würden', () => {
		const html = render([row({ name: 'Bier' }), row({ name: 'Spritzwein', status: 'only-source' })]);

		expect(html).toMatch(/text-gruen[^>]*>1 neu/);
	});

	it('setzt einen Haken, wo nichts Neues dazukommt', () => {
		const html = render([row({ name: 'Bier' })]);

		expect(html).not.toContain('neu');
		expect(html).toContain('✓');
	});
});

describe('HandoverGroupTabs — der Streifen', () => {
	it('bricht um und scrollt nicht (Regel des Ampel-Streifens)', () => {
		const html = render([row({ name: 'Bier' })]);

		expect(html).toContain('flex-wrap');
		expect(html).not.toContain('overflow-x-auto');
	});

	it('hebt den aktiven Reiter gelb mit Versatz-Schatten hervor', () => {
		const html = render([row({ name: 'Bier' }), row({ name: 'Kohle', station: 'Grill' })], 1);
		const reiter = html.split('<button').slice(1);

		expect(reiter).toHaveLength(2);
		expect(reiter[0]).not.toContain('bg-gelb');
		expect(reiter[1]).toContain('bg-gelb');
		expect(reiter[1]).toContain('shadow-versatz');
		expect(reiter[1]).toContain('aria-checked="true"');
	});

	it('stellt die Positionen ohne Station als vollwertigen Reiter ans Ende', () => {
		const html = render([row({ name: 'Zelt', station: null }), row({ name: 'Bier' })]);

		expect(html.indexOf('Ohne Station')).toBeGreaterThan(html.indexOf('Ausschank'));
	});

	it('rendert nichts, wenn es keine Gruppen gibt', () => {
		expect(render([])).toBe('');
	});
});
