import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POSTER_FONT } from '@/lib/pdfFonts';

/** Jeder gedruckte Text mit der Schrift, in der er gesetzt wurde. */
interface Printed {
	text: string;
	font: string;
}

/**
 * jsPDF hängt `text` pro Instanz an, nicht an den Prototyp — mitschreiben lässt
 * sich das Papier darum nur an dem Dokument, das `createPosterDoc` ausgibt.
 */
const recorder = vi.hoisted(() => ({ printed: [] as { text: string; font: string }[] }));

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
				for (const line of Array.isArray(args[0]) ? args[0] : [args[0]]) {
					recorder.printed.push({ text: String(line), font });
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
			{ id: 'st-1', festival_id: 'f1', name: 'Ausschank', required_people: 2, ...stamps },
			{ id: 'st-2', festival_id: 'f1', name: 'Kassa', required_people: 3, ...stamps }
		],
		stationShifts: [
			{
				id: 'sh-1',
				festival_id: 'f1',
				station_id: 'st-1',
				name: 'Frühschoppen',
				start_date: '2026-08-08',
				start_time: '08:00:00',
				end_time: '12:00:00',
				required_people: 2,
				...stamps
			},
			{
				id: 'sh-2',
				festival_id: 'f1',
				station_id: 'st-2',
				name: 'Abend',
				start_date: '2026-08-08',
				start_time: '18:00:00',
				end_time: '23:00:00',
				required_people: 3,
				...stamps
			}
		],
		assignments: [
			{
				id: 'a-1',
				festival_id: 'f1',
				station_shift_id: 'sh-1',
				station_id: 'st-1',
				position: 0,
				member: { id: 'm-1', first_name: 'Anna', last_name: 'Gruber' },
				...stamps
			},
			{
				id: 'a-2',
				festival_id: 'f1',
				station_shift_id: 'sh-1',
				station_id: 'st-1',
				position: 1,
				member: { id: 'm-2', first_name: 'Bernd', last_name: 'Huber' },
				...stamps
			}
		],
		stationMembers: []
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
							responsible_member_id: 'm-1',
							responsible_member: { id: 'm-1', first_name: 'Anna', last_name: 'Gruber' },
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
							responsible_member_id: null,
							responsible_member: null,
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

describe('buildShiftPlanPdf — Einsatzplan in Plakat-Optik', () => {
	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		buildShiftPlanPdf(shiftPlanData());

		expect(printed().length).toBeGreaterThan(0);
		expect([...new Set(printed().map((p) => p.font))].sort()).toEqual([...POSTER_FONTS].sort());
	});

	it('trägt Plakat-Kopf, Fußzeile mit Seitenzähler und die Frachtbrief-Tabelle', () => {
		buildShiftPlanPdf(shiftPlanData());

		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ title: 'Stadlfest 2026', subtitle: 'Einsatzplan' })
		);
		expect(poster.drawPosterFooter).toHaveBeenCalled();
		expect(printed().map((p) => p.text)).toContain('Stadlfest 2026 — Einsatzplan — Seite 1/1');
		expect(printed().map((p) => p.text)).toContain('Ausschank');
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
});

describe('buildSchedulePdf — Programmzettel in Plakat-Optik', () => {
	it('bedruckt das Papier ausschließlich mit den eingebetteten Schriften', () => {
		buildSchedulePdf(scheduleOptions());

		expect(printed().length).toBeGreaterThan(0);
		expect([...new Set(printed().map((p) => p.font))].sort()).toEqual([...POSTER_FONTS].sort());
	});

	it('benennt das Papier nach dem gewählten Ausschnitt', () => {
		buildSchedulePdf(scheduleOptions({ entryTypeFilter: 'program' }));
		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ subtitle: 'Programmzettel' })
		);

		vi.clearAllMocks();
		buildSchedulePdf(scheduleOptions({ entryTypeFilter: 'task' }));
		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ subtitle: 'Aufgaben-Werkliste' })
		);

		vi.clearAllMocks();
		buildSchedulePdf(scheduleOptions({ entryTypeFilter: 'all' }));
		expect(poster.drawPosterHead).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ subtitle: 'Ablaufplan' })
		);
	});

	it('setzt den Tag als Sektionszeile, die Phase in der Akzentschrift und stempelt die fertige Phase', () => {
		buildSchedulePdf(scheduleOptions());

		const headings = vi
			.mocked(poster.drawSectionHeading)
			.mock.calls.map(([, options]) => options.label);
		expect(headings).toEqual(['Samstag, 8. August 2026']);
		expect(printed()).toEqual(
			expect.arrayContaining([
				{ text: 'AUFBAU', font: POSTER_FONT.accent },
				{ text: 'FRÜHSCHOPPEN', font: POSTER_FONT.accent }
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
