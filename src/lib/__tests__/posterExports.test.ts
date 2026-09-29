import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POSTER_FONT } from '@/lib/pdfFonts';
import { POSTER_MARGIN } from '@/lib/pdfPoster';

/** Jeder gedruckte Text mit der Schrift, in der er gesetzt wurde, und der
Grundlinie, auf der er sitzt. */
interface Printed {
	text: string;
	font: string;
	/** Grundlinie in mm; bei mehrzeiligem Text die der ersten Zeile. */
	y: number;
	/** Textfarbe als Hex, wie jsPDF sie führt („#192219"). */
	color: string;
}

/**
 * jsPDF hängt `text` pro Instanz an, nicht an den Prototyp — mitschreiben lässt
 * sich das Papier darum nur an dem Dokument, das `createPosterDoc` ausgibt.
 */
const recorder = vi.hoisted(() => ({
	printed: [] as { text: string; font: string; y: number; color: string }[]
}));

/**
 * Die Zeichen-Bausteine bleiben echt, werden aber mitgeschrieben — so prüfen
 * die Export-Tests, dass alle drei Papiere dieselben Bausteine benutzen, ohne
 * das gerasterte Blatt zu vergleichen.
 */
vi.mock('@/lib/pdfPoster', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/pdfPoster')>();
	return {
		...actual,
		createPosterDoc: vi.fn((options: Parameters<typeof actual.createPosterDoc>[0]) => {
			const doc = actual.createPosterDoc(options);
			const print = doc.text.bind(doc);
			doc.text = ((...args: Parameters<typeof doc.text>) => {
				const font = (doc as unknown as { getFont(): { fontName: string } }).getFont().fontName;
				// `getTextColor` fehlt in den mitgelieferten jsPDF-Typen, existiert
				// aber zur Laufzeit — dieselbe Ausnahme wie bei `setCharSpace`.
				const color = (doc as unknown as { getTextColor(): string }).getTextColor();
				const y = typeof args[2] === 'number' ? args[2] : 0;
				for (const line of Array.isArray(args[0]) ? args[0] : [args[0]]) {
					recorder.printed.push({ text: String(line), font, y, color });
				}
				return print(...args);
			}) as typeof doc.text;
			return doc;
		}),
		drawCheckbox: vi.fn(actual.drawCheckbox),
		drawPosterHead: vi.fn(actual.drawPosterHead),
		drawPosterFooter: vi.fn(actual.drawPosterFooter),
		drawRuler: vi.fn(actual.drawRuler),
		drawStamp: vi.fn(actual.drawStamp),
		drawSectionHeading: vi.fn(actual.drawSectionHeading)
	};
});

import * as poster from '@/lib/pdfPoster';
import { buildShiftPlanPdf, type ExportData } from '@/lib/exportService';
import { buildProgramSheetPdf, buildTaskListPdf } from '@/lib/scheduleExportService';
import { buildProgramSheet } from '@/lib/scheduleProgramSheet';
import { buildWorklist } from '@/lib/scheduleWorklist';
import { buildSponsoringOverviewPdf } from '@/lib/sponsoringExportService';
import type { ScheduleDayWithEntries } from '@/lib/scheduleService';
import { scheduleDay, scheduleEntry, schedulePhase } from './scheduleFactories';
import type { SponsoringOverviewRow } from '@/lib/sponsoringTotals';
import { OPEN_SLOT } from '@/lib/shiftBoard';
import { assignment, shift, station, stationHelper } from './shiftFixtures';

/** Was auf dem Papier steht, seit dem letzten Test-Beginn. */
function printed(): Printed[] {
	return recorder.printed;
}

/**
 * Wie jsPDF eine Farbrolle führt, wenn sie als Textfarbe gesetzt ist. Der Umweg
 * über ein eigenes Dokument statt einer gerechneten Hex-Zahl: jsPDF speichert
 * Farben normalisiert und rundet dabei — verglichen wird, was ankommt.
 */
function inkOf(color: readonly [number, number, number]): string {
	const doc = poster.createPosterDoc({ orientation: 'portrait' });
	doc.setTextColor(color[0], color[1], color[2]);
	return (doc as unknown as { getTextColor(): string }).getTextColor();
}

const POSTER_FONTS = [POSTER_FONT.body, POSTER_FONT.accent];

// ── Fixtures ─────────────────────────────────────────────────

const stamps = { created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };

function shiftPlanData(): ExportData {
	return {
		festivalName: 'Stadlfest 2026',
		festivalDate: '07.08.2026 – 09.08.2026',
		stations: [
			station({
				id: 'st-1',
				name: 'Ausschank',
				description: 'Zelt Nord',
				required_people: 2,
				responsible_helper: { id: 'm-1', first_name: 'Anna', last_name: 'Gruber' }
			}),
			station({ id: 'st-2', name: 'Kassa', required_people: 3 })
		],
		stationShifts: [
			shift({
				id: 'sh-1',
				station_id: 'st-1',
				name: 'Frühschoppen',
				start_date: '2026-08-08',
				start_time: '08:00:00',
				end_time: '12:00:00',
				required_people: 2
			}),
			shift({
				id: 'sh-2',
				station_id: 'st-2',
				name: 'Abend',
				start_date: '2026-08-08',
				start_time: '18:00:00',
				end_time: '23:00:00',
				required_people: 3
			})
		],
		assignments: [
			assignment({
				id: 'a-1',
				station_shift_id: 'sh-1',
				station_id: 'st-1',
				helper_id: 'm-1',
				position: 0,
				helper: { id: 'm-1', first_name: 'Anna', last_name: 'Gruber' }
			}),
			assignment({
				id: 'a-2',
				station_shift_id: 'sh-1',
				station_id: 'st-1',
				helper_id: 'm-2',
				position: 1,
				helper: { id: 'm-2', first_name: 'Bernd', last_name: 'Huber' }
			})
		],
		stationHelpers: []
	};
}

/**
 * Zwei Ablauf-Tage mit beiden Arten von Einträgen: der Aufbautag trägt in der
 * Phase „Aufbau" zwei Aufgaben und daneben einen Programmpunkt, der Festtag nur
 * Programm. Aus denselben Tagen entstehen beide Papiere — das ist der Punkt.
 */
function scheduleDays(): ScheduleDayWithEntries[] {
	return [
		scheduleDay({
			id: 'd-1',
			date: '2026-08-08',
			label: 'Festtag',
			is_auto_generated: true,
			phases: [schedulePhase({ id: 'p-1', schedule_day_id: 'd-1', name: 'Aufbau' })],
			entries: [
				scheduleEntry({
					id: 'e-1',
					schedule_day_id: 'd-1',
					schedule_phase_id: 'p-1',
					title: 'Zelt aufstellen',
					type: 'task',
					start_time: '08:00:00',
					end_time: '10:00:00',
					responsible_helper_id: 'm-1',
					responsible_helper: { id: 'm-1', first_name: 'Anna', last_name: 'Gruber' },
					status: 'done'
				}),
				scheduleEntry({
					id: 'e-2',
					schedule_day_id: 'd-1',
					schedule_phase_id: 'p-1',
					title: 'Kassa richten',
					type: 'task',
					start_time: '09:00:00',
					status: 'open'
				}),
				scheduleEntry({
					id: 'e-3',
					schedule_day_id: 'd-1',
					title: 'Fassanstich',
					type: 'program',
					start_time: '10:30:00',
					description: 'mit dem Bürgermeister'
				})
			]
		}),
		scheduleDay({
			id: 'd-2',
			date: '2026-08-09',
			label: null,
			entries: [
				scheduleEntry({
					id: 'e-4',
					schedule_day_id: 'd-2',
					title: 'Blasmusik — Einmarsch',
					type: 'program',
					start_time: '11:00:00'
				})
			]
		})
	];
}

function sponsoringRows(): SponsoringOverviewRow[] {
	const position = { categoryId: 'c-1', label: 'Bierzelt-Banner', value: 150, overridden: false };
	return [
		{
			sponsoringId: 's-1',
			companyName: 'Bäckerei Öhler',
			positions: [position],
			positionsByCategoryId: { 'c-1': position },
			freeAmount: 50,
			inKind: null,
			total: 200,
			previousTotal: null
		}
	];
}

beforeEach(() => {
	// Nur die Aufrufliste leeren — die Bausteine sollen weiter echt zeichnen.
	vi.clearAllMocks();
	recorder.printed.length = 0;
});

describe('buildShiftPlanPdf — Schichtplan in Plakat-Optik', () => {
	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		buildShiftPlanPdf(shiftPlanData());

		expect(printed().length).toBeGreaterThan(0);
		expect([...new Set(printed().map((p) => p.font))].sort()).toEqual([...POSTER_FONTS].sort());
	});

	it('trägt Plakat-Kopf mit Festdatum und Fußzeile mit Seitenzähler', () => {
		buildShiftPlanPdf(shiftPlanData());

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				title: 'Stadlfest 2026',
				subtitle: 'Schichtplan',
				note: '07.08.2026 – 09.08.2026'
			})
		);
		expect(poster.drawPosterFooter).toHaveBeenCalled();
		expect(printed().map((p) => p.text)).toContain('Stadlfest 2026 — Schichtplan — Seite 1/1');
	});

	it('steht im Hochformat — die Werkbank hat die Stationsspalten abgeschafft', () => {
		buildShiftPlanPdf(shiftPlanData());

		expect(poster.createPosterDoc).toHaveBeenCalledWith({ orientation: 'portrait' });
	});

	it('gliedert nach Station → Tag → Schicht, wie die Werkbank', () => {
		buildShiftPlanPdf(shiftPlanData());

		// Je Station eine Sektionszeile mit ihrem Soll/Ist.
		expect(
			vi.mocked(poster.drawSectionHeading).mock.calls.map(([, o]) => [o.label, o.note])
		).toEqual([
			['Ausschank', '2/2 Personen'],
			['Kassa', '0/3 Personen']
		]);

		const texts = printed().map((p) => p.text);
		// Ort und Leitung stehen im Stations-Kopf …
		expect(texts).toContain('Zelt Nord · Leitung: Gruber Anna');
		// … darunter der Tag, darunter Zeit und Name der Schicht.
		expect(texts).toContain('SAMSTAG 8. AUGUST');
		expect(texts).toContain('1 Schicht · voll besetzt');
		expect(texts).toContain('08–12');
		expect(texts).toContain('Frühschoppen');
	});

	it('weist fehlende Besetzungen als offen aus, statt sie wegzulassen', () => {
		buildShiftPlanPdf(shiftPlanData());

		const texts = printed().map((p) => p.text);
		expect(texts).toContain('1 Gruber Anna');
		// Die Abendschicht der Kassa ist unbesetzt — drei offene Plätze.
		expect(texts.filter((t) => t.endsWith(OPEN_SLOT))).toHaveLength(3);
		expect(texts).toContain('3 offen');
	});

	it('gibt einer Station ohne Schichten ihren Platz-Block übers ganze Fest', () => {
		const data = shiftPlanData();
		data.stationShifts = data.stationShifts.filter((s) => s.station_id !== 'st-2');
		data.stationHelpers = [
			stationHelper({ station_id: 'st-2', helper: { id: 'm-3', first_name: 'Cilli', last_name: 'Wenzl' } })
		];

		buildShiftPlanPdf(data);

		const texts = printed().map((p) => p.text);
		expect(texts).toContain('GANZES FEST');
		expect(texts).toContain('Keine Schichten');
		expect(texts).toContain('1 Wenzl Cilli');
	});

	it('führt Stationsmitglieder ohne Schicht am Fuß der Station', () => {
		const data = shiftPlanData();
		data.stationHelpers = [
			stationHelper({ station_id: 'st-1', helper: { id: 'm-3', first_name: 'Cilli', last_name: 'Wenzl' } })
		];

		buildShiftPlanPdf(data);

		expect(printed().map((p) => p.text)).toContain('Ohne Schicht: Wenzl Cilli');
	});

	it('zeigt je Station ein Maßband und stempelt die volle Station ab', () => {
		buildShiftPlanPdf(shiftPlanData());

		// Ein Maßband je Station.
		expect(poster.drawRuler).toHaveBeenCalledTimes(2);
		expect(poster.drawRuler).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ value: 2, max: 2 })
		);
		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: 'Voll besetzt', tone: 'gruen' })
		);
		// Die leere Station sagt Klartext, wie viele fehlen.
		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: '3 fehlen', tone: 'rot' })
		);
	});

	it('bricht die Seite um, statt in die Fußzeile zu drucken', () => {
		/* Tages-Titel und Mitglieder-Zeile zeichnet dieses Papier selbst;
		`autoTable` bricht nur seine eigenen Zeilen um. Wo eine Tabelle endet,
		hängt an der Menge der Schichten — die Schleife schiebt diese Kante
		darum durch die ganze Seite, statt auf einen glücklichen Fixture-Wert zu
		hoffen. */
		for (let shiftCount = 1; shiftCount <= 10; shiftCount++) {
			recorder.printed.length = 0;
			const data = shiftPlanData();
			data.stationShifts = ['st-1', 'st-2'].flatMap((stationId) =>
				['2026-08-08', '2026-08-09'].flatMap((date) =>
					Array.from({ length: shiftCount }, (_, k) =>
						shift({
							id: `sh-${stationId}-${date}-${k}`,
							station_id: stationId,
							start_date: date,
							start_time: `${String(4 + k).padStart(2, '0')}:00`,
							end_time: '23:00',
							required_people: 3
						})
					)
				)
			);
			data.assignments = [];
			data.stationHelpers = ['st-1', 'st-2'].map((stationId) =>
				stationHelper({ id: `m-${stationId}`, station_id: stationId })
			);

			buildShiftPlanPdf(data);

			// A4 hoch ist 297mm, die getönte Fußzeile 8mm — nur ihre eigene
			// Seitenzahl darf dort stehen.
			const inFooter = printed().filter((p) => p.y > 297 - 8 && !p.text.includes('— Seite '));
			expect({ shiftCount, inFooter }).toEqual({ shiftCount, inFooter: [] });
		}
	});

	it('hält Stempel und Stations-Kopf im Rahmen, auch bei langem Wortlaut', () => {
		const data = shiftPlanData();
		data.stations[0].description = 'Zelt Nord hinten beim Stadl, gleich neben der Kassa und dem Klo';
		data.stations[1].required_people = 120;

		buildShiftPlanPdf(data);

		// Der Stempel wird rechts angeschlagen, damit der Rahmen am Rand endet
		// (210mm ist die Breite von A4 hoch).
		for (const [, options] of vi.mocked(poster.drawStamp).mock.calls) {
			expect(options.align).toBe('right');
			expect(options.x).toBeLessThanOrEqual(210 - POSTER_MARGIN + 0.01);
		}
		// Die Meta-Zeile wird gekürzt, statt ins Maßband zu laufen.
		const meta = printed().filter((p) => p.text.startsWith('Zelt Nord'));
		expect(meta).toHaveLength(1);
		expect(meta[0].text.endsWith('…')).toBe(true);
	});
});

describe('buildProgramSheetPdf — der Programmzettel als Aushang', () => {
	const sheetPdf = (days = scheduleDays()) =>
		buildProgramSheetPdf({ festivalName: 'Stadlfest 2026', sheet: buildProgramSheet(days) });

	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		sheetPdf();

		expect(printed().length).toBeGreaterThan(0);
		expect([...new Set(printed().map((p) => p.font))].sort()).toEqual([...POSTER_FONTS].sort());
	});

	it('trägt den Plakat-Kopf mit Festname und „Programm" sowie die Fußzeile', () => {
		sheetPdf();

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ title: 'Stadlfest 2026', subtitle: 'Programm' })
		);
		// Der Kopf trägt die Aufschrift des Aushangs, die Fußzeile den Namen des
		// Papiers (CONTEXT.md, *Programmzettel*).
		expect(printed().map((p) => p.text)).toContain('Stadlfest 2026 — Programmzettel — Seite 1/1');
	});

	it('druckt dieselben Punkte in derselben Reihenfolge wie der Bildschirm', () => {
		sheetPdf();

		const texts = printed().map((p) => p.text);
		expect(texts.filter((t) => ['Fassanstich', 'Blasmusik — Einmarsch'].includes(t))).toEqual([
			'Fassanstich',
			'Blasmusik — Einmarsch'
		]);
		expect(texts).toContain('10:30');
		expect(texts).toContain('11:00');
	});

	it('lässt Aufgaben, Phasen und Verantwortliche weg — der Zettel geht ans Publikum', () => {
		sheetPdf();

		const texts = printed().map((p) => p.text);
		expect(texts).not.toContain('Zelt aufstellen');
		expect(texts).not.toContain('AUFBAU');
		expect(texts.some((t) => t.includes('Gruber'))).toBe(false);
	});

	it('setzt die Tage als Tages-Zwischentitel — dieselbe Sorte wie am Bildschirm', () => {
		sheetPdf();

		expect(
			vi.mocked(poster.drawSectionHeading).mock.calls.map(([, options]) => [
				options.label,
				options.variant
			])
		).toEqual([
			['Samstag 8. August · Festtag', 'day'],
			['Sonntag 9. August', 'day']
		]);
	});

	it('stellt die Beschreibung leise unter den Titel', () => {
		sheetPdf();

		const beschreibung = printed().find((p) => p.text === 'mit dem Bürgermeister');
		const titel = printed().find((p) => p.text === 'Fassanstich');
		expect(beschreibung).toBeDefined();
		expect(beschreibung?.color).toBe(inkOf(poster.POSTER_COLOR.tinteSoft));
		expect(beschreibung?.y).toBeGreaterThan(titel!.y);
	});

	it('nennt die Anzahl der Punkte leise am Fuß, wie am Bildschirm', () => {
		sheetPdf();

		const zahl = printed().find((p) => p.text === '2 Punkte');
		expect(zahl?.color).toBe(inkOf(poster.POSTER_COLOR.tinteSoft));
		// Kein Stempel: der Aushang schlägt nichts ab, er zählt nur.
		expect(poster.drawStamp).not.toHaveBeenCalled();
	});

	it('sagt es, wenn das Fest noch kein Programm hat', () => {
		sheetPdf([]);

		expect(printed().map((p) => p.text)).toContain('Noch kein Programmpunkt erfasst.');
	});

	it('bricht die Seite um, statt in die Fußzeile zu drucken', () => {
		// Zwischentitel und Zeilen zeichnet dieses Papier selbst — wo eine Zeile
		// endet, hängt an der Menge der Punkte. Die Schleife schiebt diese Kante
		// durch die ganze Seite, statt auf einen glücklichen Fixture-Wert zu hoffen.
		for (let punkte = 1; punkte <= 60; punkte += 7) {
			recorder.printed.length = 0;
			const days = [
				scheduleDay({
					id: 'd-1',
					date: '2026-08-08',
					entries: Array.from({ length: punkte }, (_, k) =>
						scheduleEntry({
							id: `e-${k}`,
							schedule_day_id: 'd-1',
							title: `Programmpunkt ${k}`,
							type: 'program',
							start_time: '10:00:00',
							description: 'Beschreibung, die über die Breite des Zettels hinauswächst und umbricht'
						})
					)
				})
			];

			sheetPdf(days);

			// A4 hoch ist 297mm, die getönte Fußzeile 8mm — nur ihre eigene
			// Seitenzahl darf dort stehen.
			const inFooter = printed().filter((p) => p.y > 297 - 8 && !p.text.includes('— Seite '));
			expect({ punkte, inFooter }).toEqual({ punkte, inFooter: [] });
		}
	});
});

describe('buildTaskListPdf — die Aufgabenliste als Kopie des Bildschirms', () => {
	/** Das Fest liegt am 9., der Aufbautag davor — so trägt die Fußzeile Zahlen. */
	const listPdf = (over: Partial<Parameters<typeof buildWorklist>[0]> = {}) =>
		buildTaskListPdf({
			festivalName: 'Stadlfest 2026',
			worklist: buildWorklist({
				days: scheduleDays(),
				festivalStart: '2026-08-09',
				festivalEnd: '2026-08-09',
				...over
			})
		});

	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		listPdf();

		expect(printed().length).toBeGreaterThan(0);
		expect([...new Set(printed().map((p) => p.font))].sort()).toEqual([...POSTER_FONTS].sort());
	});

	it('trägt den Plakat-Kopf mit „Aufgabenliste" und die Fußzeile', () => {
		listPdf();

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ title: 'Stadlfest 2026', subtitle: 'Aufgabenliste' })
		);
		expect(printed().map((p) => p.text)).toContain('Stadlfest 2026 — Aufgabenliste — Seite 1/1');
	});

	it('sagt im Kopf, welcher Filter galt', () => {
		listPdf({ filter: 'open' });

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ note: 'Offen' })
		);
	});

	it('nennt im Kopf auch den gewählten Verantwortlichen', () => {
		listPdf({ responsibleId: 'm-1' });

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ note: 'Alle Aufgaben · Verantwortlich: Gruber Anna' })
		);
	});

	it('druckt die Zeilen des Bildschirms — gefiltert wie er', () => {
		listPdf({ filter: 'open' });

		const texts = printed().map((p) => p.text);
		expect(texts).toContain('Kassa richten');
		expect(texts).not.toContain('Zelt aufstellen');
		// Der Programmpunkt steht auf dem anderen Papier (ADR 0007).
		expect(texts).not.toContain('Fassanstich');
	});

	it('gliedert Tag → Phase → Aufgabe wie die Werkliste', () => {
		listPdf();

		expect(
			vi.mocked(poster.drawSectionHeading).mock.calls.map(([, options]) => [
				options.label,
				options.note
			])
		).toEqual([['Samstag 8. August · Festtag', '1 offen']]);
		const texts = printed().map((p) => p.text);
		expect(texts).toContain('AUFBAU');
		expect(texts).toContain('1/2');
	});

	it('setzt je Zeile ein Kästchen und hakt die erledigte Aufgabe ab', () => {
		listPdf();

		expect(poster.drawCheckbox).toHaveBeenCalledTimes(2);
		expect(
			vi.mocked(poster.drawCheckbox).mock.calls.map(([, options]) => options.done)
		).toEqual([true, false]);
	});

	it('schließt mit denselben drei Zahlen wie die Fußzeile der Werkliste', () => {
		listPdf();

		expect(printed().map((p) => p.text)).toContain(
			'1 offen vor dem Fest · 0 in der Nachbereitung · 1 von 2 erledigt'
		);
	});

	it('sagt es mit dem Satz des Bildschirms, wenn der Filter nichts übrig lässt', () => {
		listPdf({ filter: 'open', responsibleId: 'm-1' });

		expect(printed().map((p) => p.text)).toContain(
			'Keine Aufgabe passt zu Filter und Verantwortlichem.'
		);
	});

	it('sagt es, wenn das Fest noch keine Aufgabe hat', () => {
		buildTaskListPdf({ festivalName: 'Stadlfest 2026', worklist: buildWorklist({ days: [] }) });

		expect(printed().map((p) => p.text)).toContain('Noch keine Aufgabe in diesem Fest.');
	});

	it('wiederholt Tag und Phase am Kopf der Folgeseite', () => {
		// Der Spaltenkopf wandert von selbst mit, der Zwischentitel nicht — ohne
		// ihn stünden die Aufgaben auf Seite 2 ohne Zuordnung.
		const days = [
			scheduleDay({
				id: 'd-1',
				date: '2026-08-08',
				label: 'Festtag',
				phases: [schedulePhase({ id: 'p-1', schedule_day_id: 'd-1', name: 'Aufbau' })],
				entries: Array.from({ length: 60 }, (_, k) =>
					scheduleEntry({
						id: `t-${k}`,
						schedule_day_id: 'd-1',
						schedule_phase_id: 'p-1',
						title: `Aufgabe ${k}`,
						type: 'task',
						start_time: '08:00:00',
						status: 'open'
					})
				)
			})
		];

		buildTaskListPdf({ festivalName: 'Stadlfest 2026', worklist: buildWorklist({ days }) });

		expect(printed().map((p) => p.text)).toContain(
			'Samstag 8. August · Festtag · Aufbau (Fortsetzung)'
		);
	});

	it('bricht die Seite um, statt in die Fußzeile zu drucken', () => {
		/* Tages- und Phasentitel zeichnet dieses Papier selbst; `autoTable` bricht
		nur seine eigenen Zeilen um. Wo eine Tabelle endet, hängt an der Menge der
		Aufgaben — die Schleife schiebt diese Kante durch die ganze Seite. */
		for (let aufgaben = 1; aufgaben <= 60; aufgaben += 7) {
			recorder.printed.length = 0;
			const days = [
				scheduleDay({
					id: 'd-1',
					date: '2026-08-08',
					phases: [schedulePhase({ id: 'p-1', schedule_day_id: 'd-1', name: 'Aufbau' })],
					entries: Array.from({ length: aufgaben }, (_, k) =>
						scheduleEntry({
							id: `t-${k}`,
							schedule_day_id: 'd-1',
							schedule_phase_id: 'p-1',
							title: `Aufgabe ${k} mit einem Wortlaut, der über die Spalte hinauswächst`,
							type: 'task',
							start_time: '08:00:00',
							status: 'open'
						})
					)
				})
			];

			buildTaskListPdf({ festivalName: 'Stadlfest 2026', worklist: buildWorklist({ days }) });

			const inFooter = printed().filter((p) => p.y > 297 - 8 && !p.text.includes('— Seite '));
			expect({ aufgaben, inFooter }).toEqual({ aufgaben, inFooter: [] });
		}
	});
});

describe('buildSponsoringOverviewPdf — Sponsoring-Übersicht in Plakat-Optik', () => {
	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		buildSponsoringOverviewPdf(sponsoringRows(), {
			festivalName: 'Stadlfest 2026',
			date: new Date('2026-08-05T12:00:00Z')
		});

		expect(printed().length).toBeGreaterThan(0);
		expect([...new Set(printed().map((p) => p.font))].sort()).toEqual([...POSTER_FONTS].sort());
	});

	it('trägt Plakat-Kopf mit Druckdatum, Sponsoren-Stempel und Fußzeile', () => {
		buildSponsoringOverviewPdf(sponsoringRows(), {
			festivalName: 'Stadlfest 2026',
			date: new Date('2026-08-05T12:00:00Z')
		});

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ subtitle: 'Sponsoring-Übersicht', note: '05.08.2026' })
		);
		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: '1 Sponsor' })
		);
		expect(printed().map((p) => p.text)).toContain(
			'Stadlfest 2026 — Sponsoring-Übersicht — Seite 1/1'
		);
		// Umlaute aus dem Latin-Subset landen unverstümmelt auf dem Papier.
		expect(printed().map((p) => p.text)).toContain('Bäckerei Öhler');
	});
});
