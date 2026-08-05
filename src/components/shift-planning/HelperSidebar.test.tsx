import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HelperSidebar from './HelperSidebar';
import type { Helper } from '@/lib/helperService';
import type { Station, StationShift } from '@/lib/shiftService';

/**
 * Die Helferliste des Schichtplans ist nach ADR 0005 der einzige Ort, an dem
 * Helfer entstehen und verschwinden. Zwei Dinge werden hier eingeklagt: der
 * Wortlaut („Mitglied" heißt in einem Verein etwas anderes) und dass das `×`
 * seine neue Tragweite benennt — die Geste löscht jetzt, statt zu deaktivieren.
 */

const noop = () => {};

function makeHelper(overrides: Partial<Helper> = {}): Helper {
	return {
		id: 'h1',
		festival_id: 'f1',
		first_name: 'Hans',
		last_name: 'Huber',
		station_preferences: [],
		shift_preferences: [],
		created_at: '',
		updated_at: '',
		...overrides
	};
}

const render = (helpers: Helper[]) =>
	renderToStaticMarkup(
		<HelperSidebar
			helpers={helpers}
			stations={[] as Station[]}
			stationShifts={[] as StationShift[]}
			assignments={[]}
			stationHelpers={[]}
			stationPreferences={{}}
			shiftPreferences={{}}
			nameFilter=""
			stationFilter="all"
			assignmentFilter="all"
			onNameFilterChange={noop}
			onStationFilterChange={noop}
			onAssignmentFilterChange={noop}
			onDragStart={noop}
			onDragEnd={noop}
			onEditPreferences={noop}
			onEditHelper={noop}
			onDeleteHelper={noop}
		/>
	);

describe('HelperSidebar', () => {
	it('nennt die Liste Helfer und zählt sie', () => {
		const html = render([makeHelper(), makeHelper({ id: 'h2', last_name: 'Ebner' })]);

		expect(html).toContain('Helfer (2)');
		expect(html).not.toContain('Mitglied');
	});

	it('zeigt jeden Helfer mit Nachname und Vorname', () => {
		expect(render([makeHelper()])).toContain('Huber');
	});

	it('sagt am × und am Stift, dass es um einen Helfer geht', () => {
		const html = render([makeHelper()]);

		expect(html).toContain('Helfer bearbeiten');
		expect(html).toContain('Helfer aus dem Fest entfernen');
		expect(html).not.toContain('Mitglied löschen');
	});
});
