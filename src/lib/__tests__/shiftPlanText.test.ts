import { describe, expect, it } from 'vitest';

import { fullPlanText, helperPlanText, OPEN_SLOT } from '@/lib/shiftPlanText';
import { assignment, helper, shift, station, stationHelper } from './shiftFixtures';
import type { ShiftPlanTextData } from '@/lib/shiftPlanText';

/* Seam dieses Tests (#109, vor dem ersten Test festgehalten): `shiftPlanText`
   setzt den Schichtplan als Text für Zwischenablage und WhatsApp — dieselbe
   Gliederung wie Werkbank und Papier (Station → Tag → Schicht → Plätze), und
   offene Plätze stehen als offen drin. Gegliedert wird in `shiftBoard`; hier
   zählt nur der Wortlaut. */

const FEST = { festivalName: 'Stadlfest 2026', festivalDate: '25.07.2026 – 26.07.2026' };

function data(over: Partial<ShiftPlanTextData> = {}): ShiftPlanTextData {
	return {
		...FEST,
		stations: [],
		stationShifts: [],
		assignments: [],
		stationHelpers: [],
		...over
	};
}

/** Eine Station mit zwei Tagen; die Frühschicht halb besetzt. */
function zweiTage(): ShiftPlanTextData {
	return data({
		stations: [
			station({
				description: 'Zelt Nord',
				responsible_helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }
			})
		],
		stationShifts: [
			shift({ id: 'sh-sa', name: 'Frühschoppen', required_people: 2 }),
			shift({
				id: 'sh-nacht',
				start_date: '2026-07-25',
				end_date: '2026-07-26',
				start_time: '23:00',
				end_time: '02:00',
				required_people: 1
			}),
			shift({
				id: 'sh-so',
				start_date: '2026-07-26',
				start_time: '09:00',
				end_time: '13:00',
				required_people: 1
			})
		],
		assignments: [assignment({ station_shift_id: 'sh-sa' })]
	});
}

describe('fullPlanText — der ganze Plan als Text', () => {
	it('nennt im Kopf Papier, Fest und Datum', () => {
		expect(fullPlanText(zweiTage()).split('\n').slice(0, 3)).toEqual([
			'SCHICHTPLAN',
			'Stadlfest 2026',
			'25.07.2026 – 26.07.2026'
		]);
	});

	it('trägt je Station Name, Ort, Leitung und Soll/Ist', () => {
		const text = fullPlanText(zweiTage());

		expect(text).toContain('=== AUSSCHANK ===');
		expect(text).toContain('Zelt Nord · Leitung: Hochauer Franz · 1/4 besetzt');
	});

	it('gliedert nach Tag und schreibt Zeit, Name und Plätze in die Schicht-Zeile', () => {
		const text = fullPlanText(zweiTage());

		expect(text).toContain('Samstag 25. Juli');
		expect(text).toContain('11–15 · Frühschoppen · 2 Plätze');
		expect(text).toContain('Sonntag 26. Juli');
	});

	it('macht die Schicht über Mitternacht an der Zeit explizit', () => {
		expect(fullPlanText(zweiTage())).toContain('23–02 +1');
	});

	it('weist fehlende Besetzungen als offen aus, statt sie wegzulassen', () => {
		const text = fullPlanText(zweiTage());

		expect(text).toContain('  1 Hochauer Franz');
		expect(text).toContain(`  2 ${OPEN_SLOT}`);
		// Drei Schichten mit 4 Plätzen, einer davon besetzt.
		expect(text.split(OPEN_SLOT).length - 1).toBe(3);
	});

	it('gibt einer Station ohne Schichten ihren Platz-Block übers ganze Fest', () => {
		const text = fullPlanText(
			data({
				stations: [station({ required_people: 2 })],
				stationHelpers: [stationHelper()]
			})
		);

		expect(text).toContain('Ohne Schichten · 1/2 besetzt');
		expect(text).toContain('GANZES FEST · Keine Schichten · 2 Plätze');
		expect(text).toContain('  1 Aigner Roman');
		expect(text).toContain(`  2 ${OPEN_SLOT}`);
	});

	it('führt Stationsmitglieder ohne Schicht am Fuß der Station', () => {
		const withMembers = { ...zweiTage(), stationHelpers: [stationHelper()] };

		expect(fullPlanText(withMembers)).toContain('Ohne Schicht: Aigner Roman');
	});

	it('reiht die Stationen wie die Reiter der Werkbank — nach Anlage, nicht nach Namen', () => {
		const text = fullPlanText(
			data({
				stations: [
					station({ id: 's2', name: 'Bar', created_at: '2026-01-02T10:00:00Z' }),
					station({ id: 's1', name: 'Ausschank', created_at: '2026-01-01T10:00:00Z' })
				]
			})
		);

		expect(text.indexOf('=== AUSSCHANK ===')).toBeLessThan(text.indexOf('=== BAR ==='));
	});

	it('sagt es, wenn das Fest noch keine Station hat', () => {
		expect(fullPlanText(data())).toContain('Noch keine Station angelegt.');
	});
});

describe('helperPlanText — der Plan einer Person', () => {
	it('nennt Person, Fest und die Schichten unter ihrem Tag', () => {
		const text = helperPlanText(zweiTage(), helper());

		expect(text).toContain('EINSATZPLAN');
		expect(text).toContain('Hochauer Franz');
		expect(text).toContain('=== AUSSCHANK ===');
		expect(text).toContain('Samstag 25. Juli');
		expect(text).toContain('11–15 · Frühschoppen');
		expect(text).toContain('Gesamt: 1 Zuweisung');
	});

	it('zeigt nur die eigenen Schichten — nicht die der anderen', () => {
		const text = helperPlanText(zweiTage(), helper());

		expect(text).not.toContain('Sonntag 26. Juli');
		expect(text).not.toContain(OPEN_SLOT);
	});

	it('weist eine Stationsmitgliedschaft ohne Schicht als solche aus', () => {
		const text = helperPlanText(
			data({
				stations: [station({ required_people: 1 }), station({ id: 's2', name: 'Kassa' })],
				stationShifts: [shift({ id: 'sh-sa', required_people: 1 })],
				stationHelpers: [
					stationHelper({ station_id: 's2', helper_id: 'h1', helper: undefined })
				]
			}),
			helper()
		);

		expect(text).toContain('=== KASSA ===');
		expect(text).toContain('Stationsmitglied ohne Schicht');
		expect(text).toContain('Gesamt: 1 Zuweisung');
	});

	it('sagt es, wenn die Person nirgends eingeteilt ist', () => {
		const text = helperPlanText(zweiTage(), helper({ id: 'h-frei', last_name: 'Frei' }));

		expect(text).toContain('Keine Zuweisungen.');
		expect(text).not.toContain('Gesamt:');
	});
});
