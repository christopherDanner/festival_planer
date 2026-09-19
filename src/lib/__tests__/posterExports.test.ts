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
}

/**
 * jsPDF hängt `text` pro Instanz an, nicht an den Prototyp — mitschreiben lässt
 * sich das Papier darum nur an dem Dokument, das `createPosterDoc` ausgibt.
 */
const recorder = vi.hoisted(() => ({ printed: [] as { text: string; font: string; y: number }[] }));

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
				const y = typeof args[2] === 'number' ? args[2] : 0;
				for (const line of Array.isArray(args[0]) ? args[0] : [args[0]]) {
					recorder.printed.push({ text: String(line), font, y });
				}
				return print(...args);
			}) as typeof doc.text;
			return doc;
		}),
		drawPosterHead: vi.fn(actual.drawPosterHead),
		drawPosterFooter: vi.fn(actual.drawPosterFooter),
		drawRuler: vi.fn(actual.drawRuler),
		drawStamp: vi.fn(actual.drawStamp),
		drawSectionHeading: vi.fn(actual.drawSectionHeading)
	};
});

import * as poster from '@/lib/pdfPoster';
import { buildShiftPlanPdf, type ExportData } from '@/lib/exportService';
import { buildSchedulePdf, type ScheduleExportOptions } from '@/lib/scheduleExportService';
import { buildSponsoringOverviewPdf } from '@/lib/sponsoringExportService';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';
import type { SponsoringOverviewRow } from '@/lib/sponsoringTotals';
import { OPEN_SLOT } from '@/lib/shiftBoard';
import { assignment, shift, station, stationHelper } from './shiftFixtures';

/** Was auf dem Papier steht, seit dem letzten Test-Beginn. */
function printed(): Printed[] {
	return recorder.printed;
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

function scheduleOptions(overrides: Partial<ScheduleExportOptions> = {}): ScheduleExportOptions {
	const days: ScheduleDayWithPhases[] = [
		{
			id: 'd-1',
			festival_id: 'f1',
			date: '2026-08-08',
			label: 'Festtag',
			is_auto_generated: true,
			sort_order: 0,
			...stamps,
			phases: [
				{
					id: 'p-1',
					schedule_day_id: 'd-1',
					festival_id: 'f1',
					name: 'Aufbau',
					sort_order: 0,
					...stamps,
					entries: [
						{
							id: 'e-1',
							schedule_phase_id: 'p-1',
							festival_id: 'f1',
							title: 'Zelt aufstellen',
							type: 'task',
							start_time: '08:00:00',
							end_time: '10:00:00',
							responsible_helper_id: 'm-1',
							responsible_helper: { id: 'm-1', first_name: 'Anna', last_name: 'Gruber' },
							status: 'done',
							description: null,
							sort_order: 0,
							...stamps
						}
					]
				},
				{
					id: 'p-2',
					schedule_day_id: 'd-1',
					festival_id: 'f1',
					name: 'Frühschoppen',
					sort_order: 1,
					...stamps,
					entries: [
						{
							id: 'e-2',
							schedule_phase_id: 'p-2',
							festival_id: 'f1',
							title: 'Blasmusik — Einmarsch',
							type: 'program',
							start_time: '10:30:00',
							end_time: null,
							responsible_helper_id: null,
							responsible_helper: null,
							status: 'open',
							description: null,
							sort_order: 0,
							...stamps
						}
					]
				}
			]
		}
	];

	return {
		festivalName: 'Stadlfest 2026',
		days,
		selectedDayIds: new Set(['d-1']),
		selectedPhaseIds: new Set(['p-1', 'p-2']),
		entryTypeFilter: 'all',
		...overrides
	};
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

describe('buildSchedulePdf — Ablaufplan in Plakat-Optik', () => {
	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		buildSchedulePdf(scheduleOptions());

		expect(printed().length).toBeGreaterThan(0);
		expect([...new Set(printed().map((p) => p.font))].sort()).toEqual([...POSTER_FONTS].sort());
	});

	it('heißt „Ablaufplan", auch wenn nur Programmpunkte gewählt sind', () => {
		// Der Programmzettel darf laut CONTEXT.md/ADR 0007 weder Phasen noch
		// Verantwortliche zeigen — dieses Papier tut beides. Es so zu betiteln
		// wäre eine falsche Aufschrift; die zwei echten Papiere baut #67.
		for (const entryTypeFilter of ['all', 'task', 'program'] as const) {
			vi.clearAllMocks();
			buildSchedulePdf(scheduleOptions({ entryTypeFilter }));
			expect(poster.drawPosterHead).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ subtitle: 'Ablaufplan' })
			);
		}
	});

	it('setzt den Tag als Sektionszeile, die Phase in der Akzentschrift und stempelt die fertige Phase', () => {
		buildSchedulePdf(scheduleOptions());

		const headings = vi
			.mocked(poster.drawSectionHeading)
			.mock.calls.map(([, options]) => options.label);
		expect(headings).toEqual(['Samstag, 8. August 2026']);
		expect(printed()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ text: 'AUFBAU', font: POSTER_FONT.accent }),
				expect.objectContaining({ text: 'FRÜHSCHOPPEN', font: POSTER_FONT.accent })
			])
		);

		// Phase „Aufbau" ist komplett erledigt, „Frühschoppen" nicht.
		expect(poster.drawStamp).toHaveBeenCalledTimes(1);
		expect(poster.drawStamp).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ label: 'Erledigt', tone: 'gruen' })
		);
	});

	it('trägt die Fußzeile mit Seitenzähler', () => {
		buildSchedulePdf(scheduleOptions());

		expect(printed().map((p) => p.text)).toContain('Stadlfest 2026 — Ablaufplan — Seite 1/1');
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
