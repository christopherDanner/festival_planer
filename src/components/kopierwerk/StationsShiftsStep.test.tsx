import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import StationsShiftsStep, { type StationsShiftsStepProps } from './StationsShiftsStep';
import type { StationPreviewRow } from './stationChoice';

const ausschank: StationPreviewRow = {
	id: 'st-1',
	name: 'Ausschank',
	meta: 'Zelt Nord · 14 Pers. · 2 Schichten',
	shifts: [
		{
			id: 'sh-1',
			when: 'Sa 11–15',
			name: 'Frühschoppen',
			places: '4 Plätze',
			newWhen: 'Sa 24.07.2027'
		},
		{ id: 'sh-2', when: 'Sa 23–So 02', name: 'Barbetrieb', places: '2 Plätze', newWhen: 'Sa/So 24.–25.07.2027' }
	]
};

const kassa: StationPreviewRow = {
	id: 'st-2',
	name: 'Kassa',
	meta: 'Eingang · 7 Pers. · 0 Schichten',
	shifts: []
};

const render = (over: Partial<StationsShiftsStepProps> = {}) =>
	renderToStaticMarkup(
		<StationsShiftsStep
			rows={[ausschank, kassa]}
			selectedStationIds={new Set(['st-1', 'st-2'])}
			expandedStationIds={new Set()}
			copyAssignments={false}
			onToggleStation={() => {}}
			onToggleAllStations={() => {}}
			onToggleExpanded={() => {}}
			onCopyAssignmentsChange={() => {}}
			onBack={() => {}}
			onNext={() => {}}
			{...over}
		/>
	);

describe('Kopfzeile der Werkbank', () => {
	it('nennt den Schritt und den Merksatz', () => {
		const html = render();
		expect(html).toContain('Stationen &amp; Schichten');
		expect(html).toContain(
			'Alles Gewählte wird ins neue Fest kopiert — Schichten rücken automatisch auf die neuen Tage.'
		);
	});
});

describe('Stations-Zeilen', () => {
	it('zeigt je Station Name und Kurzangaben', () => {
		const html = render();
		expect(html).toContain('Ausschank');
		expect(html).toContain('Zelt Nord · 14 Pers. · 2 Schichten');
		expect(html).toContain('Kassa');
	});

	it('trägt je Zeile einen Falt-Knopf, der seinen Zustand anschreibt', () => {
		expect(render()).toContain('AUFKLAPPEN ▾');
		expect(render({ expandedStationIds: new Set(['st-1']) })).toContain('ZUKLAPPEN ▴');
	});

	it('füllt die Checkbox einer gewählten Station grün', () => {
		const html = render({ selectedStationIds: new Set(['st-1']) });
		expect(html).toContain('data-[state=checked]:bg-gruen');
	});

	// Gewählt wird auf Stations-Ebene (#64) — das Aufklappen ist reine Vorschau.
	// Eine Checkbox je Station, dazu „Alle Stationen" und „Zuweisungen übernehmen".
	it('gibt den Schichten keine eigene Checkbox', () => {
		const html = render({ expandedStationIds: new Set(['st-1']) });
		expect(html.match(/role="checkbox"/g)).toHaveLength(4);
	});
});

describe('Schicht-Vorschau', () => {
	it('bleibt zugeklappt unsichtbar', () => {
		expect(render()).not.toContain('Frühschoppen');
	});

	it('nennt aufgeklappt alten Termin, Name, Plätze und neuen Termin samt Pfeil', () => {
		const html = render({ expandedStationIds: new Set(['st-1']) });
		expect(html).toContain('Sa 11–15');
		expect(html).toContain('Frühschoppen');
		expect(html).toContain('4 Plätze');
		expect(html).toContain('→');
		expect(html).toContain('Sa 24.07.2027');
		expect(html).toContain('Sa/So 24.–25.07.2027');
	});

	it('sagt es, wenn eine Station gar keine Schichten hat', () => {
		expect(render({ expandedStationIds: new Set(['st-2']) })).toContain('Keine Schichten');
	});
});

/** Das Element mit dieser id aus dem Markup — Radix reicht die id an den Knopf durch. */
const tagWithId = (html: string, id: string) =>
	html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] ?? '';

describe('„Alle Stationen"-Umschalter', () => {
	it('steht auf gewählt, wenn alle gewählt sind', () => {
		expect(tagWithId(render(), 'alle-stationen')).toContain('data-state="checked"');
	});

	it('steht im Zwischenzustand, wenn nur ein Teil gewählt ist', () => {
		expect(tagWithId(render({ selectedStationIds: new Set(['st-1']) }), 'alle-stationen')).toContain(
			'data-state="indeterminate"'
		);
	});

	it('steht leer, wenn keine gewählt ist', () => {
		expect(tagWithId(render({ selectedStationIds: new Set() }), 'alle-stationen')).toContain(
			'data-state="unchecked"'
		);
	});
});

describe('„Zuweisungen übernehmen"', () => {
	it('verspricht nur, was der Kopier-Service tut', () => {
		const html = render();
		expect(html).toContain('Zuweisungen übernehmen');
		expect(html).toContain('Helfer bleiben sonst leer.');
		expect(html).not.toContain('Präferenz');
	});
});

describe('Fußzeile', () => {
	it('führt zurück zu Schritt 1 und weiter zum Material', () => {
		const html = render();
		expect(html).toContain('← Name &amp; Datum');
		expect(html).toContain('WEITER: MATERIAL →');
	});
});

describe('Handschrift', () => {
	// Umbruch statt Abschneiden (#94): kein `truncate`, kein hartes Beschneiden —
	// die Zeile darf über zwei Zeilen gehen, aber nichts verschlucken.
	it('lässt die Zeile unter 900px umbrechen statt abschneiden', () => {
		const html = render({ expandedStationIds: new Set(['st-1']) });
		expect(html).toContain('flex-wrap');
		expect(html).not.toContain('truncate');
		expect(html).not.toContain('overflow-hidden');
	});

	// Tippziele ≥ 40px am Handy (DESIGN-VISION §6): die Beschriftung neben der
	// Checkbox gehört dazu, sie schaltet über `htmlFor` mit.
	it('hält die Tippziele am Handy auf 40px', () => {
		const html = render();
		expect(html.match(/max-\[899px\]:min-h-10/g)?.length).toBeGreaterThanOrEqual(4);
		expect(tagWithId(html, 'station-st-1')).toContain('h-[18px]');
	});

	it('setzt den Fokus als Tinte-Outline, ohne Ring darunter', () => {
		expect(tagWithId(render(), 'alle-stationen')).toContain('focus-visible:outline-tinte');
		expect(tagWithId(render(), 'alle-stationen')).toContain('focus-visible:ring-0');
	});

	it('setzt Stationsnamen in die Akzentschrift', () => {
		expect(render()).toContain('font-display');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render()).not.toMatch(/rounded-/);
	});
});
