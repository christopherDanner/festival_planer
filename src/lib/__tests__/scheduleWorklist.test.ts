import { describe, it, expect } from 'vitest';

import {
	scheduleDay as day,
	scheduleEntry as entry,
	schedulePhase as phase,
	scheduleTask as task
} from './scheduleFactories';
import { buildWorklist } from '../scheduleWorklist';

/**
 * Seam dieses Tests (Fertig-wenn aus #122): `buildWorklist` beantwortet, was in
 * der Aufgaben-Werkliste steht — Gliederung Tag → Phase, die drei Zähler-Arten
 * und die Fußzeile. Die Ansicht (`TaskWorklist`) zeichnet nur noch.
 */

describe('buildWorklist — Gliederung Tag → Phase', () => {
	it('stellt Einträge ohne Phase direkt unter den Tag, vor die Phasen', () => {
		const worklist = buildWorklist({
			days: [
				day({
					phases: [phase({ id: 'p1', name: 'Anlieferung' })],
					entries: [
						task({ id: 't1', schedule_phase_id: 'p1' }),
						task({ id: 't2', schedule_phase_id: null })
					]
				})
			]
		});

		expect(worklist.days).toHaveLength(1);
		expect(worklist.days[0].groups.map((g) => g.phase?.name ?? null)).toEqual([
			null,
			'Anlieferung'
		]);
		expect(worklist.days[0].groups[0].tasks.map((t) => t.entry.id)).toEqual(['t2']);
	});

	it('zeigt nur Aufgaben — der Programmpunkt steht auf dem anderen Papier', () => {
		const worklist = buildWorklist({
			days: [day({ entries: [task({ id: 't1' }), entry({ id: 'p1', type: 'program' })] })]
		});

		expect(worklist.days[0].groups[0].tasks.map((t) => t.entry.id)).toEqual(['t1']);
	});

	it('lässt Tage ohne Aufgaben weg', () => {
		const worklist = buildWorklist({
			days: [
				day({ id: 'leer', date: '2026-07-23' }),
				day({ id: 'voll', date: '2026-07-24', entries: [task()] }),
				day({ id: 'nur-programm', date: '2026-07-25', entries: [entry({ type: 'program' })] })
			]
		});

		expect(worklist.days.map((d) => d.day.id)).toEqual(['voll']);
	});

	it('lässt leere Phasen weg — ein Zwischentitel ohne Zeile sagt nichts', () => {
		const worklist = buildWorklist({
			days: [
				day({
					phases: [phase({ id: 'p1' }), phase({ id: 'p2', name: 'Abbau', sort_order: 1 })],
					entries: [task({ schedule_phase_id: 'p2' })]
				})
			]
		});

		expect(worklist.days[0].groups.map((g) => g.phase?.name)).toEqual(['Abbau']);
	});

	it('behält die Reihenfolge des Tages — die Uhrzeit reiht im Service (ADR 0007)', () => {
		const worklist = buildWorklist({
			days: [
				day({
					entries: [
						task({ id: 'früh', start_time: '08:00:00' }),
						task({ id: 'spät', start_time: '18:00:00' }),
						task({ id: 'ohne', start_time: null })
					]
				})
			]
		});

		expect(worklist.days[0].groups[0].tasks.map((t) => t.entry.id)).toEqual([
			'früh',
			'spät',
			'ohne'
		]);
	});

	it('schreibt Tage in der Reihenfolge der Abfrage', () => {
		const worklist = buildWorklist({
			days: [
				day({ id: 'do', date: '2026-07-23', entries: [task()] }),
				day({ id: 'fr', date: '2026-07-24', entries: [task()] })
			]
		});

		expect(worklist.days.map((d) => d.day.id)).toEqual(['do', 'fr']);
	});
});

describe('buildWorklist — was eine Zeile trägt', () => {
	const firstTask = (over: Parameters<typeof task>[0]) =>
		buildWorklist({ days: [day({ entries: [task(over)] })] }).days[0].groups[0].tasks[0];

	it('nennt nur die Uhrzeit — der Tag steht schon im Zwischentitel', () => {
		expect(firstTask({ start_time: '08:00:00' }).time).toBe('08:00');
	});

	it('lässt die Zeit offen, wo keine erfasst ist', () => {
		expect(firstTask({ start_time: null }).time).toBeNull();
	});

	it('schreibt den Verantwortlichen wie überall: Nachname zuerst', () => {
		expect(
			firstTask({
				responsible_helper_id: 'h1',
				responsible_helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }
			}).responsible
		).toBe('Hochauer Franz');
	});

	it('kommt ohne Verantwortlichen aus', () => {
		expect(firstTask({ responsible_helper: null }).responsible).toBeNull();
	});

	it('merkt sich, ob die Aufgabe erledigt ist', () => {
		expect(firstTask({ status: 'done' }).done).toBe(true);
		expect(firstTask({ status: 'open' }).done).toBe(false);
	});
});

describe('buildWorklist — Filter Alle / Offen / Erledigt', () => {
	/** Ein Tag mit zwei offenen und einer erledigten Aufgabe in einer Phase. */
	const dreiAufgaben = [
		day({
			phases: [phase({ id: 'p1', name: 'Anlieferung' })],
			entries: [
				task({ id: 'offen1', schedule_phase_id: 'p1', status: 'open' }),
				task({ id: 'erledigt', schedule_phase_id: 'p1', status: 'done' }),
				task({ id: 'offen2', schedule_phase_id: 'p1', status: 'open' })
			]
		})
	];

	const gezeigte = (filter: 'all' | 'open' | 'done') =>
		buildWorklist({ days: dreiAufgaben, filter }).days.flatMap((d) =>
			d.groups.flatMap((g) => g.tasks.map((t) => t.entry.id))
		);

	it('zeigt ohne Filter alles', () => {
		expect(gezeigte('all')).toEqual(['offen1', 'erledigt', 'offen2']);
	});

	it('zeigt unter „Offen" nur die offenen Aufgaben', () => {
		expect(gezeigte('open')).toEqual(['offen1', 'offen2']);
	});

	it('zeigt unter „Erledigt" nur die erledigten', () => {
		expect(gezeigte('done')).toEqual(['erledigt']);
	});

	it('zählt in den Segmenten den Gesamtbestand — nicht die gezeigten Zeilen', () => {
		for (const filter of ['all', 'open', 'done'] as const) {
			expect(buildWorklist({ days: dreiAufgaben, filter }).counts).toEqual({
				all: 3,
				open: 2,
				done: 1
			});
		}
	});

	it('zählt in den Gruppenköpfen dagegen die gezeigten Zeilen', () => {
		const offen = buildWorklist({ days: dreiAufgaben, filter: 'open' });

		expect(offen.days[0].open).toBe(2);
		expect(offen.days[0].groups[0]).toMatchObject({ done: 0, total: 2 });
	});

	it('nennt am Tag die offenen und an der Phase erledigt von gesamt', () => {
		const alle = buildWorklist({ days: dreiAufgaben });

		expect(alle.days[0].open).toBe(2);
		expect(alle.days[0].groups[0]).toMatchObject({ done: 1, total: 3 });
	});

	it('lässt Tage und Phasen ohne Treffer aus der Ansicht fallen', () => {
		const worklist = buildWorklist({
			days: [
				day({ id: 'do', date: '2026-07-23', entries: [task({ status: 'done' })] }),
				day({
					id: 'fr',
					date: '2026-07-24',
					phases: [phase({ id: 'p1' }), phase({ id: 'p2', name: 'Abbau', sort_order: 1 })],
					entries: [
						task({ id: 'a', schedule_phase_id: 'p1', status: 'done' }),
						task({ id: 'b', schedule_phase_id: 'p2', status: 'open' })
					]
				})
			],
			filter: 'open'
		});

		expect(worklist.days.map((d) => d.day.id)).toEqual(['fr']);
		expect(worklist.days[0].groups.map((g) => g.phase?.name)).toEqual(['Abbau']);
	});
});

describe('buildWorklist — Filter Verantwortlicher', () => {
	/** Schlüssel und Verknüpfung, wie die Abfrage sie liefert. */
	const wer = (id: string, first: string, last: string) => ({
		responsible_helper_id: id,
		responsible_helper: { id, first_name: first, last_name: last }
	});

	const zweiVerantwortliche = [
		day({
			entries: [
				task({ id: 'zelt', ...wer('h1', 'Franz', 'Hochauer') }),
				task({ id: 'kassa', ...wer('h2', 'Eva', 'Auer') }),
				task({ id: 'niemand' })
			]
		})
	];

	it('zeigt nur die Aufgaben des gewählten Verantwortlichen', () => {
		const worklist = buildWorklist({ days: zweiVerantwortliche, responsibleId: 'h1' });

		expect(worklist.days[0].groups[0].tasks.map((t) => t.entry.id)).toEqual(['zelt']);
	});

	it('zeigt ohne Wahl alle Aufgaben, auch die ohne Verantwortlichen', () => {
		const worklist = buildWorklist({ days: zweiVerantwortliche });

		expect(worklist.days[0].groups[0].tasks.map((t) => t.entry.id)).toEqual([
			'zelt',
			'kassa',
			'niemand'
		]);
	});

	it('bietet die Verantwortlichen des Fests alphabetisch zur Auswahl', () => {
		const worklist = buildWorklist({ days: zweiVerantwortliche });

		expect(worklist.responsibles).toEqual([
			{ id: 'h2', name: 'Auer Eva' },
			{ id: 'h1', name: 'Hochauer Franz' }
		]);
	});

	it('nennt jeden Verantwortlichen einmal, egal wie viele Aufgaben er trägt', () => {
		const worklist = buildWorklist({
			days: [
				day({
					entries: [
						task({ id: 'a', ...wer('h1', 'Franz', 'Hochauer') }),
						task({ id: 'b', ...wer('h1', 'Franz', 'Hochauer') })
					]
				})
			]
		});

		expect(worklist.responsibles).toEqual([{ id: 'h1', name: 'Hochauer Franz' }]);
	});

	it('hält die Auswahlliste unabhängig von den Filtern — sonst verschwände die Wahl', () => {
		const worklist = buildWorklist({
			days: zweiVerantwortliche,
			filter: 'done',
			responsibleId: 'h1'
		});

		expect(worklist.responsibles.map((r) => r.id)).toEqual(['h2', 'h1']);
	});

	it('wirkt zusammen mit dem Status-Filter', () => {
		const worklist = buildWorklist({
			days: [
				day({
					entries: [
						task({ id: 'offen', ...wer('h1', 'Franz', 'Hochauer') }),
						task({ id: 'erledigt', status: 'done', ...wer('h1', 'Franz', 'Hochauer') }),
						task({ id: 'fremd', ...wer('h2', 'Eva', 'Auer') })
					]
				})
			],
			filter: 'open',
			responsibleId: 'h1'
		});

		expect(worklist.days[0].groups[0].tasks.map((t) => t.entry.id)).toEqual(['offen']);
	});

	it('zählt in den Segmenten weiter den Gesamtbestand des Fests', () => {
		const worklist = buildWorklist({ days: zweiVerantwortliche, responsibleId: 'h1' });

		expect(worklist.counts).toEqual({ all: 3, open: 3, done: 0 });
	});
});

describe('buildWorklist — die Fußzeile', () => {
	/** Aufbau (23.), Festtage (24.–26.), Nachbereitung (27.) — je eine offene
	und eine erledigte Aufgabe. */
	const fuenfTage = ['2026-07-23', '2026-07-24', '2026-07-26', '2026-07-27'].map((date) =>
		day({
			id: date,
			date,
			entries: [
				task({ id: `${date}-offen`, status: 'open' }),
				task({ id: `${date}-fertig`, status: 'done' })
			]
		})
	);

	const fest = { days: fuenfTage, festivalStart: '2026-07-24', festivalEnd: '2026-07-26' };

	it('zählt die offenen Aufgaben vor dem Fest', () => {
		expect(buildWorklist(fest).footer.openBefore).toBe(1);
	});

	it('zählt die offenen Aufgaben der Nachbereitung', () => {
		expect(buildWorklist(fest).footer.openAfter).toBe(1);
	});

	it('rechnet die Fußzeile über den Gesamtbestand, nicht über die gezeigten Zeilen', () => {
		expect(buildWorklist({ ...fest, filter: 'done' }).footer).toEqual({
			openBefore: 1,
			openAfter: 1
		});
	});

	it('zählt den Starttag zum Fest, nicht zur Vorbereitung', () => {
		const worklist = buildWorklist({
			days: [day({ date: '2026-07-24', entries: [task()] })],
			festivalStart: '2026-07-24',
			festivalEnd: '2026-07-26'
		});

		expect(worklist.footer).toEqual({ openBefore: 0, openAfter: 0 });
	});

	it('nimmt bei einem eintägigen Fest den Starttag auch als Ende', () => {
		const worklist = buildWorklist({
			days: [
				day({ id: 'vor', date: '2026-07-23', entries: [task()] }),
				day({ id: 'fest', date: '2026-07-24', entries: [task()] }),
				day({ id: 'nach', date: '2026-07-25', entries: [task()] })
			],
			festivalStart: '2026-07-24'
		});

		expect(worklist.footer).toEqual({ openBefore: 1, openAfter: 1 });
	});

	it('teilt ohne Fest-Datum gar nicht — dann gibt es kein Davor und kein Danach', () => {
		const worklist = buildWorklist({ days: fuenfTage });

		expect(worklist.footer).toEqual({ openBefore: 0, openAfter: 0 });
	});
});

describe('buildWorklist — die Aufschrift des Tages', () => {
	it('nennt Tag und Label: „Donnerstag 23. Juli · Aufbau"', () => {
		const worklist = buildWorklist({
			days: [day({ date: '2026-07-23', label: 'Aufbau', entries: [task()] })]
		});

		expect(worklist.days[0].title).toBe('Donnerstag 23. Juli · Aufbau');
	});

	it('wiederholt den Wochentag nicht, den die Festtage als Label tragen', () => {
		const worklist = buildWorklist({
			days: [day({ date: '2026-07-23', label: 'Donnerstag', entries: [task()] })]
		});

		expect(worklist.days[0].title).toBe('Donnerstag 23. Juli');
	});

	it('kommt ohne Label aus', () => {
		const worklist = buildWorklist({
			days: [day({ date: '2026-07-23', label: null, entries: [task()] })]
		});

		expect(worklist.days[0].title).toBe('Donnerstag 23. Juli');
	});
});
