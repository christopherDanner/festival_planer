import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import StationsStep, { type StationsStepProps } from './StationsStep';
import type { Station } from '@/lib/shiftService';

const stations = [
	{ id: 's-ausschank', festival_id: 'f1', name: 'Ausschank', required_people: 14 },
	{ id: 's-grill', festival_id: 'f1', name: 'Grill', required_people: 6 }
] as Station[];

const render = (over: Partial<StationsStepProps> = {}) =>
	renderToStaticMarkup(
		<StationsStep
			stations={stations}
			shifts={[]}
			selectedStationIds={new Set(stations.map((s) => s.id))}
			copyAssignments={false}
			onSelectionChange={() => {}}
			onCopyAssignmentsChange={() => {}}
			onBack={() => {}}
			onNext={() => {}}
			{...over}
		/>
	);

describe('Schritt 2 „Stationen & Schichten"', () => {
	// Der Schnitt aus #95: Material ist ein eigener Schritt, kein zweiter Kasten
	// unter den Stationen.
	it('führt weiter zum Material, statt das Fest schon anzulegen', () => {
		const html = render();

		expect(html).toContain('WEITER: MATERIAL →');
		expect(html).toContain('← Name &amp; Datum');
		expect(html).not.toContain('Fest erstellen');
	});

	it('trägt kein Material mehr', () => {
		const html = render();

		expect(html).not.toContain('Materialien');
		expect(html).not.toContain('Bestellmenge');
	});

	it('zeigt am „Alle Stationen"-Schalter den Zwischenzustand', () => {
		expect(render({ selectedStationIds: new Set(['s-grill']) })).toContain(
			'data-state="indeterminate"'
		);
	});
});
