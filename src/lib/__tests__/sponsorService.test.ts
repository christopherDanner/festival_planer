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
						single: async () => ({ data: { id: 'new-id' }, error: null })
					})
				};
			}
		})
	}
}));

import { filterSponsors, createSponsor, type Sponsor } from '../sponsorService';

let idCounter = 0;
function makeSponsor(overrides: Partial<Sponsor> & { company_name: string }): Sponsor {
	idCounter += 1;
	return {
		id: `sp-${idCounter}`,
		user_id: 'u1',
		company_name: overrides.company_name,
		contact_person: null,
		email: null,
		phone: null,
		address: null,
		website: null,
		notes: null,
		created_at: '',
		updated_at: '',
		...overrides
	};
}

describe('filterSponsors', () => {
	it('returns all sponsors when the search term is empty', () => {
		const sponsors = [makeSponsor({ company_name: 'Brauerei Schremser' }), makeSponsor({ company_name: 'Raiffeisen' })];
		expect(filterSponsors(sponsors, '')).toHaveLength(2);
	});

	it('matches company name case-insensitively as a substring, ignoring surrounding whitespace', () => {
		const sponsors = [makeSponsor({ company_name: 'Brauerei Schremser' }), makeSponsor({ company_name: 'Raiffeisen' })];
		const result = filterSponsors(sponsors, '  brAUer ');
		expect(result).toHaveLength(1);
		expect(result[0].company_name).toBe('Brauerei Schremser');
	});
});

describe('createSponsor', () => {
	beforeEach(() => {
		mocks.insertArg = null;
		mocks.getUser.mockReset();
	});

	it('stamps the authenticated user as the creator (user_id)', async () => {
		mocks.getUser.mockResolvedValue({ data: { user: { id: 'creator-7' } } });

		await createSponsor({ company_name: 'Brauerei Schremser' });

		expect(mocks.insertArg).toMatchObject({
			company_name: 'Brauerei Schremser',
			user_id: 'creator-7'
		});
	});

	it('refuses to create a sponsor when no user is authenticated', async () => {
		mocks.getUser.mockResolvedValue({ data: { user: null } });

		await expect(createSponsor({ company_name: 'Brauerei Schremser' })).rejects.toThrow();
		expect(mocks.insertArg).toBeNull();
	});
});
