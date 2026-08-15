import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import StationFocusBox from './StationFocusBox';
import { buildStationBoard } from '@/lib/shiftBoard';
import type {
	Station,
	StationShift,
	ShiftAssignmentWithHelper,
	StationHelperWithDetails
} from '@/lib/shiftService';

/**
 * Der Fokus-Kasten einer Station (#102). Zwei Zweige, beide vollständig:
 * mit Schichten die Tages-Zwischentitel samt Schicht-Zeilen, ohne Schichten
 * ein Platz-Raster über `required_people` (Entscheid 1 aus #68).
 */

const noop = () => {};

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Ausschank',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function shift(over: Partial<StationShift> = {}): StationShift {
	return {
		id: 'sh1',
		festival_id: 'f1',
		station_id: 's1',
		name: '',
		start_date: '2026-07-25',
		start_time: '11:00',
		end_time: '15:00',
		required_people: 0,
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
		helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' },
		...over
	};
}

function member(over: Partial<StationHelperWithDetails> = {}): StationHelperWithDetails {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: 's1',
		helper_id: 'h9',
		created_at: '',
		helper: { id: 'h9', first_name: 'Roman', last_name: 'Aigner' },
		...over
	};
}

const render = (
	s: Station,
	shifts: StationShift[],
	assignments: ShiftAssignmentWithHelper[] = [],
	members: StationHelperWithDetails[] = []
) =>
	renderToStaticMarkup(
		<StationFocusBox
			board={buildStationBoard(s, shifts, assignments, members)}
			onAutoFill={noop}
			onEditStation={noop}
			onDeleteStation={noop}
			onAddShift={noop}
			onEditShift={noop}
			onDeleteShift={noop}
			onAssignToShift={noop}
			onAssignToStation={noop}
			onDropOnShift={noop}
			onDropOnStation={noop}
			onRemoveFromShift={noop}
			onRemoveFromStation={noop}
		/>
	);

// --- Kopf --------------------------------------------------------------------

describe('StationFocusBox — grüner Kopf', () => {
	it('nennt Station, Ort, Verantwortlichen und die offenen Plätze', () => {
		const html = render(
			station({
				description: 'Zelt Nord',
				responsible_helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }
			}),
			[shift({ required_people: 4 })],
			[assignment()]
		);

		expect(html).toContain('Ausschank');
		expect(html).toContain('Zelt Nord');
		expect(html).toContain('Hochauer Franz');
		expect(html).toContain('3 Plätze offen');
	});

	it('sagt bei voller Station, dass nichts offen ist', () => {
		const html = render(station(), [shift({ required_people: 1 })], [assignment()]);

		expect(html).toContain('voll besetzt');
		expect(html).not.toContain('Plätze offen');
	});

	it('trägt den gelben Knopf für die Auto-Füllung dieser Station', () => {
		// Versalien setzt die Schrift, nicht der Text (`uppercase`).
		expect(render(station(), [shift({ required_people: 1 })])).toMatch(
			/bg-gelb[^>]*uppercase[^>]*>Nur diese Station auto-füllen</
		);
	});

	it('legt Bearbeiten und Löschen in ein ⋮-Menü', () => {
		expect(render(station(), [shift()])).toContain('Menü der Station');
	});
});

// --- Station mit Schichten ---------------------------------------------------

describe('StationFocusBox — Station mit Schichten', () => {
	const shifts = [
		shift({
			id: 'sh-sa',
			start_date: '2026-07-25',
			start_time: '11:00',
			end_time: '15:00',
			required_people: 2,
			name: 'Frühschoppen'
		}),
		shift({
			id: 'sh-nacht',
			start_date: '2026-07-25',
			end_date: '2026-07-26',
			start_time: '23:00',
			end_time: '02:00',
			required_people: 1
		}),
		shift({ id: 'sh-so', start_date: '2026-07-26', start_time: '09:00', end_time: '13:00', required_people: 1 })
	];
	// Frühschoppen voll besetzt, Nacht- und Sonntagsschicht leer.
	const html = () =>
		render(station(), shifts, [
			assignment({ station_shift_id: 'sh-sa' }),
			assignment({
				id: 'a2',
				station_shift_id: 'sh-sa',
				helper_id: 'h2',
				position: 2,
				helper: { id: 'h2', first_name: 'Maria', last_name: 'Leitner' }
			})
		]);

	it('setzt je Tag einen grünen Zwischentitel mit Schicht- und Offen-Zähler', () => {
		expect(html()).toContain('Samstag 25. Juli');
		expect(html()).toContain('2 Schichten');
		expect(html()).toContain('1 offen');
		expect(html()).toContain('Sonntag 26. Juli');
	});

	it('nennt einen vollen Tag voll besetzt, statt eine Null zu zeigen', () => {
		const voll = render(
			station(),
			[shift({ id: 'sh-sa', required_people: 1 })],
			[assignment({ station_shift_id: 'sh-sa' })]
		);

		expect(voll).toContain('voll besetzt');
		expect(voll).not.toContain('0 offen');
	});

	it('schreibt Zeit, Name und Plätze in die Schicht-Zeile', () => {
		expect(html()).toContain('11–15');
		expect(html()).toContain('Frühschoppen · 2 Plätze');
	});

	it('macht die Schicht über Mitternacht am Zeit-Chip explizit', () => {
		expect(html()).toContain('23–02 +1');
	});

	it('stempelt den Status der Zeile — offen rot, voll grün', () => {
		expect(html()).toMatch(/text-rot[^>]*>1 OFFEN</);
		expect(html()).toMatch(/text-gruen[^>]*>VOLL</);
	});

	it('zeigt belegte Plätze mit Nummer und Namen, freie als roten Platzhalter', () => {
		const markup = html();

		expect(markup).toContain('Hochauer Franz');
		expect(markup).toContain('+ HELFER HIERHER ZIEHEN');
		expect(markup).toContain('minmax(150px,1fr)');
	});

	it('führt die Stationsmitglieder ohne Schicht in der Fußzeile', () => {
		const markup = render(station(), shifts, [], [member()]);

		expect(markup).toContain('Stationsmitglieder ohne Schicht');
		expect(markup).toContain('Aigner Roman');
	});

	it('meldet nicht „voll besetzt", solange ein freier Platz im Kasten steht', () => {
		// Frühschicht überbesetzt (3 auf 2), Nachtschicht halb leer: roh gezählt
		// wären das 4/4 — Kopf und Tages-Zwischentitel widersprächen einander.
		const markup = render(
			station(),
			[
				shift({ id: 'sh-sa', required_people: 2, start_time: '11:00' }),
				shift({ id: 'sh-spaet', required_people: 2, start_time: '19:00' })
			],
			[
				assignment({ id: 'a1', station_shift_id: 'sh-sa', helper_id: 'h1', position: 1 }),
				assignment({ id: 'a2', station_shift_id: 'sh-sa', helper_id: 'h2', position: 2 }),
				assignment({ id: 'a3', station_shift_id: 'sh-sa', helper_id: 'h3', position: 3 }),
				assignment({ id: 'a4', station_shift_id: 'sh-spaet', helper_id: 'h4', position: 1 })
			]
		);

		expect(markup).toContain('1 Plätze offen');
		expect(markup).not.toContain('voll besetzt');
		expect(markup).toContain('+ HELFER HIERHER ZIEHEN');
	});

	it('bietet am Fuß das Anlegen einer Schicht an', () => {
		expect(html()).toContain('+ Schicht anlegen');
		expect(html()).not.toContain('Zeitfenster');
	});
});

// --- Station ohne Schichten --------------------------------------------------

describe('StationFocusBox — Station ohne Schichten', () => {
	const s = station({ required_people: 3 });
	const html = () => render(s, [], [], [member()]);

	it('zeigt statt Schicht-Zeilen ein Platz-Raster über das ganze Fest', () => {
		expect(html()).toContain('GANZES FEST');
		expect(html()).toContain('Keine Schichten · 3 Plätze');
	});

	it('füllt das Raster aus den Stationsmitgliedern und lässt den Rest offen', () => {
		const markup = html();

		expect(markup).toContain('Aigner Roman');
		expect(markup.split('+ HELFER HIERHER ZIEHEN').length - 1).toBe(2);
	});

	it('trägt denselben Status wie eine Schicht-Zeile', () => {
		expect(html()).toMatch(/text-rot[^>]*>2 OFFEN</);
	});

	it('lässt die Fußzeile weg — dieselben Leute stehen schon im Raster', () => {
		expect(html()).not.toContain('Stationsmitglieder ohne Schicht');
	});

	it('erklärt am Knopf, was eine Schicht hier bewirkt', () => {
		expect(html()).toContain('Station in Zeitfenster aufteilen');
	});
});
