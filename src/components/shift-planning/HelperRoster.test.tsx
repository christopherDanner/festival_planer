import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HelperRoster from './HelperRoster';
import { buildHelperRoster, type HelperFilter } from '@/lib/helperRoster';
import type { Helper } from '@/lib/helperService';
import type { ShiftAssignmentWithHelper, StationHelperWithDetails } from '@/lib/shiftService';

/**
 * Die Helferliste rechts an der Werkbank (#103, Variante C des Prototyps
 * `entscheid-schichtplan-helferliste.html`): Marken mit Zähler-Plakette,
 * Segment-Filter mit Zählern, Gruppierung nach Wunsch-Passung.
 *
 * Nach ADR 0005 ist sie zugleich der einzige Ort, an dem Helfer entstehen und
 * verschwinden — der Wortlaut („Mitglied" heißt in einem Verein etwas anderes)
 * und die Tragweite des Entfernens werden hier mit eingeklagt.
 */

const noop = () => {};

function helper(over: Partial<Helper> = {}): Helper {
	return {
		id: 'h1',
		festival_id: 'f1',
		first_name: 'Franz',
		last_name: 'Hochauer',
		station_preferences: [],
		shift_preferences: [],
		created_at: '',
		updated_at: '',
		...over
	};
}

function assignment(over: Partial<ShiftAssignmentWithHelper> = {}): ShiftAssignmentWithHelper {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		helper_id: 'h1',
		position: 1,
		created_at: '',
		updated_at: '',
		...over
	};
}

interface RenderOptions {
	helpers?: Helper[];
	assignments?: ShiftAssignmentWithHelper[];
	stationHelpers?: StationHelperWithDetails[];
	focusStationId?: string | null;
	focusStationName?: string | null;
	search?: string;
	filter?: HelperFilter;
	selectedHelperId?: string | null;
}

const render = ({
	helpers = [helper()],
	assignments = [],
	stationHelpers = [],
	focusStationId = 's1',
	focusStationName = 'Ausschank',
	search = '',
	filter = 'all',
	selectedHelperId = null
}: RenderOptions = {}) =>
	renderToStaticMarkup(
		<HelperRoster
			roster={buildHelperRoster({
				helpers,
				assignments,
				stationHelpers,
				focusStationId,
				search,
				filter
			})}
			focusStationName={focusStationName}
			search={search}
			onSearchChange={noop}
			filter={filter}
			onFilterChange={noop}
			selectedHelperId={selectedHelperId}
			onSelectHelper={noop}
			onDragStart={noop}
			onDragEnd={noop}
			onAddHelper={noop}
			onEditHelper={noop}
			onRemoveHelper={noop}
		/>
	);

// --- Rahmen und Kopf ---------------------------------------------------------

describe('HelperRoster — die Spalte', () => {
	it('klebt am oberen Rand, statt mit dem Fokus-Kasten wegzuscrollen', () => {
		expect(render()).toMatch(/class="[^"]*sticky/);
	});

	it('erscheint erst ab 900px — die Liste am Handy ist der eigene Schnitt (#105)', () => {
		const html = render();

		expect(html).toMatch(/class="[^"]*hidden[^"]*min-\[900px\]:block/);
	});

	it('schreibt die fokussierte Station in den Kopf', () => {
		expect(render()).toContain('Helfer für Ausschank');
	});

	it('gruppiert und betitelt neu, sobald der Fokus wechselt', () => {
		const html = render({ focusStationId: 's2', focusStationName: 'Grill' });

		expect(html).toContain('Helfer für Grill');
		expect(html).not.toContain('Ausschank');
	});

	it('nennt sich schlicht „Helfer", solange keine Station im Fokus steht', () => {
		const html = render({ focusStationId: null, focusStationName: null });

		expect(html).toContain('Helfer');
		expect(html).not.toContain('Helfer für');
	});

	it('sagt nirgends „Mitglied" — das heißt in einem Verein etwas anderes', () => {
		expect(render()).not.toContain('Mitglied');
	});
});

// --- Suche und Segment-Schalter ----------------------------------------------

describe('HelperRoster — Suche und Filter', () => {
	const drei = [
		helper({ id: 'h1', last_name: 'Hochauer' }),
		helper({ id: 'h2', last_name: 'Leitner', first_name: 'Maria' }),
		helper({ id: 'h3', last_name: 'Gruber', first_name: 'Peter' })
	];
	const eineSchicht = [assignment({ helper_id: 'h1' })];

	it('gibt den eingetippten Suchbegriff ins Feld zurück', () => {
		expect(render({ helpers: drei, search: 'leit' })).toContain('value="leit"');
	});

	it('zeigt nur, was die Suche übrig lässt', () => {
		const html = render({ helpers: drei, search: 'leit' });

		expect(html).toContain('Leitner Maria');
		expect(html).not.toContain('Hochauer Franz');
	});

	it('trägt die drei Knöpfe mit ihren Zählern', () => {
		const html = render({ helpers: drei, assignments: eineSchicht });

		expect(html).toContain('Alle (3)');
		expect(html).toContain('Frei (2)');
		expect(html).toContain('Zugeteilt (1)');
	});

	it('zählt in den Knöpfen mit, was die Suche übrig lässt', () => {
		const html = render({ helpers: drei, assignments: eineSchicht, search: 'leit' });

		expect(html).toContain('Alle (1)');
		expect(html).toContain('Frei (1)');
		expect(html).toContain('Zugeteilt (0)');
	});

	it('hebt den gedrückten Knopf hervor', () => {
		expect(render({ helpers: drei, filter: 'free' })).toMatch(/aria-checked="true"[^>]*>Frei/);
	});
});

// --- Gruppierung -------------------------------------------------------------

describe('HelperRoster — Gruppierung nach Wunsch-Passung', () => {
	const zwei = [
		helper({ id: 'h1', last_name: 'Hochauer', station_preferences: ['s1'] }),
		helper({ id: 'h2', last_name: 'Leitner', first_name: 'Maria' })
	];

	it('setzt die Wünschenden mit grüner Aufschrift voran', () => {
		const html = render({ helpers: zwei });

		expect(html).toMatch(/text-gruen[^>]*>Wünschen sich diese Station \(1\)</);
		expect(html.indexOf('Hochauer')).toBeLessThan(html.indexOf('Leitner'));
	});

	it('schreibt die Restgruppe in Tinte-soft', () => {
		expect(render({ helpers: zwei })).toMatch(/text-tinte-soft[^>]*>Weitere \(1\)</);
	});

	it('lässt die Aufschriften weg, wenn sich niemand diese Station wünscht', () => {
		const html = render({ helpers: [helper()] });

		expect(html).not.toContain('Wünschen sich diese Station');
		expect(html).not.toContain('Weitere');
		expect(html).toContain('Hochauer Franz');
	});
});

// --- Die Marke ---------------------------------------------------------------

describe('HelperRoster — die Marke', () => {
	it('ist ein button — sonst ließe sie sich später nicht mit der Tastatur zuteilen', () => {
		expect(render()).toMatch(/<button[^>]*>Hochauer Franz<\/button>/);
	});

	it('lässt sich auf eine Schicht ziehen', () => {
		expect(render()).toMatch(/<button[^>]*draggable="true"/);
	});

	it('trägt die Zahl der Schicht-Zuteilungen als Oswald-Plakette', () => {
		const html = render({
			assignments: [
				assignment({ id: 'a1', station_shift_id: 'sh1' }),
				assignment({ id: 'a2', station_shift_id: 'sh2' })
			]
		});

		expect(html).toMatch(/font-display[^>]*bg-tinte[^>]*>.*?2/);
		// Eine nackte „2" sagt einem Screenreader nichts.
		expect(html).toContain('2 Schicht-Zuteilungen');
	});

	it('bleibt ohne Zuteilung plakettenlos', () => {
		expect(render()).not.toContain('Schicht-Zuteilungen');
	});

	it('zählt die bloße Stationsmitgliedschaft nicht auf die Plakette', () => {
		const html = render({
			stationHelpers: [
				{ id: 'm1', festival_id: 'f1', station_id: 's1', helper_id: 'h1', created_at: '' }
			]
		});

		expect(html).not.toContain('Schicht-Zuteilungen');
	});

	it('hebt die ausgewählte Marke gelb mit Versatz-Schatten hervor', () => {
		const html = render({ selectedHelperId: 'h1' });

		expect(html).toContain('bg-gelb');
		expect(html).toContain('shadow-versatz');
		expect(render()).not.toContain('shadow-versatz');
	});
});

// --- ⋮-Menü und Fuß ----------------------------------------------------------

describe('HelperRoster — ⋮-Menü an der Marke', () => {
	it('steht dauerhaft an der Marke, nicht erst bei Hover', () => {
		const html = render();

		expect(html).toContain('Menü für Hochauer Franz');
		// Am Touchgerät wäre ein erst bei Hover eingeblendetes ⋮ unauffindbar
		// (Auflage zu Variante C in #68).
		expect(html).not.toContain('opacity-0');
		expect(html).not.toContain('group-hover');
	});
});

describe('HelperRoster — der Fuß', () => {
	it('bietet das Anlegen eines Helfers in gestricheltem Rahmen an', () => {
		expect(render()).toMatch(/border-dashed[^>]*>\+ Neuen Helfer anlegen …/);
	});
});

// --- Leere Liste -------------------------------------------------------------

describe('HelperRoster — wenn nichts dasteht', () => {
	it('sagt einem Fest ohne Helfer, dass noch keiner da ist', () => {
		const html = render({ helpers: [] });

		expect(html).toContain('Noch kein Helfer');
		expect(html).toContain('+ Neuen Helfer anlegen …');
	});

	it('unterscheidet davon die leer gefilterte Liste', () => {
		const html = render({ search: 'xyz' });

		expect(html).toContain('Kein Helfer passt');
		expect(html).not.toContain('Noch kein Helfer');
	});
});
