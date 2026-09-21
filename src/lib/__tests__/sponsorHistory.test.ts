import { describe, expect, it } from 'vitest';

import { arrangeFestivalWall } from '@/components/festival-list/festivalList';
import type { Festival } from '@/lib/festivalService';

import {
	buildSponsorHistory,
	countSponsorSegments,
	filterSponsorsBySegment,
	referenceFestival,
	sponsorHistoryOf,
	type SponsorSegment
} from '../sponsorHistory';

describe('buildSponsorHistory', () => {
	it('lässt eine Firma ohne ein einziges Sponsoring ohne Historie', () => {
		const history = buildSponsorHistory([], [], null);

		expect(sponsorHistoryOf(history, 'baumeister')).toEqual({
			sponsorId: 'baumeister',
			lastYear: null,
			festivalCount: 0,
			sponsorsReferenceFestival: false
		});
	});

	it('nennt bei einem einzigen Fest dessen Jahr und zählt es', () => {
		const history = buildSponsorHistory(
			[{ sponsor_id: 'baumeister', festival_id: 'f2025' }],
			[{ id: 'f2025', start_date: '2025-07-25' }],
			null
		);

		expect(sponsorHistoryOf(history, 'baumeister')).toMatchObject({
			lastYear: 2025,
			festivalCount: 1
		});
	});

	it('nimmt bei mehreren Festen das jüngste Jahr, egal wie die Zeilen kommen', () => {
		const history = buildSponsorHistory(
			[
				{ sponsor_id: 'baumeister', festival_id: 'f2025' },
				{ sponsor_id: 'baumeister', festival_id: 'f2021' },
				{ sponsor_id: 'baumeister', festival_id: 'f2023' }
			],
			[
				{ id: 'f2021', start_date: '2021-07-24' },
				{ id: 'f2023', start_date: '2023-07-22' },
				{ id: 'f2025', start_date: '2025-07-25' }
			],
			null
		);

		expect(sponsorHistoryOf(history, 'baumeister')).toMatchObject({
			lastYear: 2025,
			festivalCount: 3
		});
	});

	it('trennt die Firmen voneinander', () => {
		const history = buildSponsorHistory(
			[
				{ sponsor_id: 'baumeister', festival_id: 'f2025' },
				{ sponsor_id: 'elektro', festival_id: 'f2021' }
			],
			[
				{ id: 'f2021', start_date: '2021-07-24' },
				{ id: 'f2025', start_date: '2025-07-25' }
			],
			null
		);

		expect(sponsorHistoryOf(history, 'baumeister').lastYear).toBe(2025);
		expect(sponsorHistoryOf(history, 'elektro').lastYear).toBe(2021);
		expect(sponsorHistoryOf(history, 'elektro').festivalCount).toBe(1);
	});

	it('zählt ein Fest ohne Datum mit, nennt aber kein Jahr dafür', () => {
		const history = buildSponsorHistory(
			[
				{ sponsor_id: 'baumeister', festival_id: 'ohne-datum' },
				{ sponsor_id: 'baumeister', festival_id: 'f2023' }
			],
			[
				{ id: 'ohne-datum', start_date: null },
				{ id: 'f2023', start_date: '2023-07-22' }
			],
			null
		);

		// Das Fest gab es, also zählt es — ein Jahr hat es aber nicht beizusteuern.
		expect(sponsorHistoryOf(history, 'baumeister')).toMatchObject({
			lastYear: 2023,
			festivalCount: 2
		});
	});

	it('lässt eine Firma ohne Historie stehen, deren einziges Fest gelöscht ist', () => {
		// Gelöschte Feste stehen nicht in `festivals` (Soft-Delete, #8) — die
		// Verknüpfung zeigt ins Leere und darf nichts zählen.
		const history = buildSponsorHistory(
			[{ sponsor_id: 'baumeister', festival_id: 'geloescht' }],
			[{ id: 'f2023', start_date: '2023-07-22' }],
			null
		);

		expect(sponsorHistoryOf(history, 'baumeister')).toMatchObject({
			lastYear: null,
			festivalCount: 0
		});
	});

	it('merkt sich, wer das Bezugsfest sponsert', () => {
		const history = buildSponsorHistory(
			[
				{ sponsor_id: 'baumeister', festival_id: 'f2026' },
				{ sponsor_id: 'elektro', festival_id: 'f2023' }
			],
			[
				{ id: 'f2023', start_date: '2023-07-22' },
				{ id: 'f2026', start_date: '2026-07-24' }
			],
			'f2026'
		);

		expect(sponsorHistoryOf(history, 'baumeister').sponsorsReferenceFestival).toBe(true);
		expect(sponsorHistoryOf(history, 'elektro').sponsorsReferenceFestival).toBe(false);
	});

	it('kennt ohne Bezugsfest niemanden, der „heuer" sponsert', () => {
		const history = buildSponsorHistory(
			[{ sponsor_id: 'baumeister', festival_id: 'f2023' }],
			[{ id: 'f2023', start_date: '2023-07-22' }],
			null
		);

		expect(sponsorHistoryOf(history, 'baumeister').sponsorsReferenceFestival).toBe(false);
	});
});

const HEUTE = new Date('2026-05-20T12:00:00');

/** Fest, so schmal wie `referenceFestival` es liest. */
const fest = (id: string, start_date: string | null) => ({ id, start_date });

describe('referenceFestival', () => {
	it('nimmt das nächste bevorstehende Fest', () => {
		const next = referenceFestival(
			[fest('f2023', '2023-07-22'), fest('f2027', '2027-07-23'), fest('f2026', '2026-07-24')],
			HEUTE
		);

		expect(next?.id).toBe('f2026');
	});

	it('zählt ein heute startendes Fest als bevorstehend (#90)', () => {
		const next = referenceFestival([fest('heute', '2026-05-20')], HEUTE);

		expect(next?.id).toBe('heute');
	});

	it('kennt zwischen zwei Festen kein Bezugsfest', () => {
		expect(referenceFestival([fest('f2023', '2023-07-22')], HEUTE)).toBeNull();
		expect(referenceFestival([], HEUTE)).toBeNull();
	});

	it('übergeht Feste ohne Startdatum, statt sie nach vorne zu reihen', () => {
		const next = referenceFestival([fest('ohne-datum', null), fest('f2026', '2026-07-24')], HEUTE);

		expect(next?.id).toBe('f2026');
	});

	it('wählt dasselbe Fest wie die Festliste (#90) — eine Ableitung, keine zweite', () => {
		const festivals = [
			{ id: 'f2023', start_date: '2023-07-22' },
			{ id: 'f2026', start_date: '2026-07-24' },
			{ id: 'heute', start_date: '2026-05-20' }
		] as Festival[];

		expect(referenceFestival(festivals, HEUTE)?.id).toBe(
			arrangeFestivalWall(festivals, HEUTE).next?.id
		);
	});
});

describe('Segment-Filter', () => {
	const SPONSOREN = [
		{ id: 'baumeister' },
		{ id: 'elektro' },
		{ id: 'zeltverleih' },
		{ id: 'neu' }
	];

	// baumeister sponsert heuer, elektro hat Historie ohne heuer,
	// zeltverleih sponsert heuer ohne frühere Feste, neu war noch nie dabei.
	const HISTORIE = buildSponsorHistory(
		[
			{ sponsor_id: 'baumeister', festival_id: 'f2026' },
			{ sponsor_id: 'baumeister', festival_id: 'f2023' },
			{ sponsor_id: 'elektro', festival_id: 'f2023' },
			{ sponsor_id: 'zeltverleih', festival_id: 'f2026' }
		],
		[
			{ id: 'f2023', start_date: '2023-07-22' },
			{ id: 'f2026', start_date: '2026-07-24' }
		],
		'f2026'
	);

	const ids = (segment: SponsorSegment) =>
		filterSponsorsBySegment(SPONSOREN, HISTORIE, segment).map((s) => s.id);

	it('lässt bei ALLE den ganzen Bestand stehen', () => {
		expect(ids('alle')).toEqual(['baumeister', 'elektro', 'zeltverleih', 'neu']);
	});

	it('zeigt bei SPONSERT nur die Firmen des Bezugsfests', () => {
		expect(ids('sponsert')).toEqual(['baumeister', 'zeltverleih']);
	});

	it('nimmt „noch nie" mit in HEUER NOCH NICHT GEFRAGT — der beste Anruf-Kandidat', () => {
		expect(ids('nicht-gefragt')).toEqual(['elektro', 'neu']);
	});

	it('zählt jedes Segment, damit der Schalter seine Zahlen tragen kann', () => {
		expect(countSponsorSegments(SPONSOREN, HISTORIE)).toEqual({
			alle: 4,
			sponsert: 2,
			'nicht-gefragt': 2
		});
	});

	it('zählt über den übergebenen Ausschnitt — Suche und Segment greifen zusammen', () => {
		const treffer = [{ id: 'baumeister' }, { id: 'neu' }];

		expect(countSponsorSegments(treffer, HISTORIE)).toEqual({
			alle: 2,
			sponsert: 1,
			'nicht-gefragt': 1
		});
	});
});
