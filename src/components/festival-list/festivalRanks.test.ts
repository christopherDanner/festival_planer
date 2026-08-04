import { describe, expect, it } from 'vitest';

import type { Festival } from '@/lib/festivalService';
import {
	arrangeFestivalWall,
	festivalCountLine,
	festivalTitle,
	festivalYear
} from './festivalRanks';

function fest(over: Partial<Festival> & { id: string; start_date: string }): Festival {
	return {
		user_id: 'u1',
		type: 'kirtag',
		visitor_count: 'medium',
		created_at: '',
		updated_at: '',
		...over
	};
}

const today = new Date('2026-07-20T15:30:00');

describe('arrangeFestivalWall', () => {
	it('stellt das nächste bevorstehende Fest auf den ersten Rang', () => {
		const wall = arrangeFestivalWall(
			[
				fest({ id: 'spaeter', start_date: '2026-10-24' }),
				fest({ id: 'naechstes', start_date: '2026-07-24' })
			],
			today
		);
		expect(wall.next?.id).toBe('naechstes');
		expect(wall.soon.map((f) => f.id)).toEqual(['spaeter']);
	});

	it('reiht weitere bevorstehende Feste aufsteigend, vergangene absteigend', () => {
		const wall = arrangeFestivalWall(
			[
				fest({ id: 'dez', start_date: '2026-12-04' }),
				fest({ id: 'jul', start_date: '2026-07-24' }),
				fest({ id: 'okt', start_date: '2026-10-24' }),
				fest({ id: 'v2024', start_date: '2024-07-26' }),
				fest({ id: 'v2025', start_date: '2025-07-25' })
			],
			today
		);
		expect(wall.next?.id).toBe('jul');
		expect(wall.soon.map((f) => f.id)).toEqual(['okt', 'dez']);
		expect(wall.past.map((f) => f.id)).toEqual(['v2025', 'v2024']);
	});

	it('zählt ein heute startendes Fest als bevorstehend', () => {
		const wall = arrangeFestivalWall([fest({ id: 'heute', start_date: '2026-07-20' })], today);
		expect(wall.next?.id).toBe('heute');
		expect(wall.past).toEqual([]);
		expect(wall.upcomingCount).toBe(1);
	});

	it('lässt den ersten Rang leer, wenn nur vergangene Feste da sind', () => {
		const wall = arrangeFestivalWall([fest({ id: 'v2025', start_date: '2025-07-25' })], today);
		expect(wall.next).toBeNull();
		expect(wall.soon).toEqual([]);
		expect(wall.upcomingCount).toBe(0);
		expect(wall.past.map((f) => f.id)).toEqual(['v2025']);
	});

	it('zählt alle bevorstehenden Feste inklusive des nächsten', () => {
		const wall = arrangeFestivalWall(
			[
				fest({ id: 'jul', start_date: '2026-07-24' }),
				fest({ id: 'okt', start_date: '2026-10-24' }),
				fest({ id: 'v2025', start_date: '2025-07-25' })
			],
			today
		);
		expect(wall.upcomingCount).toBe(2);
	});
});

describe('festivalCountLine', () => {
	it('nennt Gesamtzahl und bevorstehende Feste', () => {
		expect(festivalCountLine(7, 3)).toBe('7 Feste · 3 bevorstehend');
	});

	it('setzt den Singular bei genau einem Fest', () => {
		expect(festivalCountLine(1, 1)).toBe('1 Fest · 1 bevorstehend');
	});

	it('entfällt ohne Feste', () => {
		expect(festivalCountLine(0, 0)).toBeNull();
	});
});

describe('festivalTitle', () => {
	it('fällt auf „Fest" zurück, wenn das Fest keinen Namen trägt', () => {
		expect(festivalTitle(fest({ id: 'f1', start_date: '2026-07-24' }))).toBe('Fest');
		expect(festivalTitle(fest({ id: 'f1', start_date: '2026-07-24', name: 'Stadlfest' }))).toBe(
			'Stadlfest'
		);
	});
});

describe('festivalYear', () => {
	it('liest das Jahr aus dem Startdatum, tagesgenau und lokal', () => {
		expect(festivalYear(fest({ id: 'f1', start_date: '2026-01-01' }))).toBe(2026);
		expect(festivalYear(fest({ id: 'f1', start_date: '2025-12-31' }))).toBe(2025);
	});
});
