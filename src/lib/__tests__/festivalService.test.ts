import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	insertArg: null as Record<string, unknown> | null,
	getUser: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
	supabase: {
		auth: { getUser: mocks.getUser },
		from: () => ({
			insert: (arg: Record<string, unknown>) => {
				mocks.insertArg = arg;
				return {
					select: () => ({
						single: async () => ({ data: { id: 'fest-neu' }, error: null })
					})
				};
			}
		})
	}
}));

import { createFestival } from '../festivalService';

describe('createFestival', () => {
	beforeEach(() => {
		mocks.insertArg = null;
		mocks.getUser.mockReset();
	});

	it('behauptet weder einen Fest-Typ noch eine Besucherzahl', async () => {
		await createFestival({ name: 'Stadlfest 2026', location: 'Steinbach', startDate: '2026-08-01' }, 'user-1');

		expect(mocks.insertArg).not.toHaveProperty('type');
		expect(mocks.insertArg).not.toHaveProperty('visitor_count');
	});

	it('legt das Fest mit Name, Ort und Zeitraum an und gibt seine id zurück', async () => {
		const id = await createFestival(
			{ name: 'Stadlfest 2026', location: 'Steinbach', startDate: '2026-08-01', endDate: '2026-08-03' },
			'user-1'
		);

		expect(id).toBe('fest-neu');
		expect(mocks.insertArg).toEqual({
			user_id: 'user-1',
			name: 'Stadlfest 2026',
			location: 'Steinbach',
			start_date: '2026-08-01',
			end_date: '2026-08-03'
		});
	});

	it('stempelt den angemeldeten Benutzer als Ersteller, wenn keine userId übergeben wird', async () => {
		mocks.getUser.mockResolvedValue({ data: { user: { id: 'creator-7' } } });

		await createFestival({ name: 'Stadlfest 2026', location: '', startDate: '2026-08-01' });

		expect(mocks.insertArg).toMatchObject({ user_id: 'creator-7' });
	});

	it('legt kein Fest an, wenn kein Benutzer angemeldet ist', async () => {
		mocks.getUser.mockResolvedValue({ data: { user: null } });

		await expect(createFestival({ name: 'Stadlfest 2026', location: '', startDate: '2026-08-01' })).rejects.toThrow();
		expect(mocks.insertArg).toBeNull();
	});
});
