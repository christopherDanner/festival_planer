import { describe, it, expect } from 'vitest';
import { planSponsorTransfer } from '../sponsorTransfer';
import type {
	SponsoringAssignmentWithCategory,
	SponsoringCategory,
	SponsoringWithDetails,
	Sponsor
} from '../sponsorService';

let idCounter = 0;

function makeSponsor(companyName: string): Sponsor {
	idCounter += 1;
	return {
		id: `sp-${idCounter}`,
		user_id: 'u1',
		company_name: companyName,
		contact_person: null,
		email: null,
		phone: null,
		address: null,
		website: null,
		notes: null,
		created_at: '',
		updated_at: ''
	};
}

function makeCategory(name: string, value: number | null, festivalId = 'target'): SponsoringCategory {
	idCounter += 1;
	return {
		id: `cat-${idCounter}`,
		festival_id: festivalId,
		name,
		value,
		created_at: '',
		updated_at: ''
	};
}

function makeAssignment(
	category: SponsoringCategory,
	value: number | null = null
): SponsoringAssignmentWithCategory {
	idCounter += 1;
	return {
		id: `as-${idCounter}`,
		sponsoring_id: 'spo-src',
		category_id: category.id,
		value,
		created_at: '',
		category
	};
}

function makeSponsoring(opts: {
	companyName: string;
	freeAmount?: number | null;
	assignments?: SponsoringAssignmentWithCategory[];
}): SponsoringWithDetails {
	idCounter += 1;
	const sponsor = makeSponsor(opts.companyName);
	return {
		id: `spo-${idCounter}`,
		festival_id: 'source',
		sponsor_id: sponsor.id,
		free_amount: opts.freeAmount ?? null,
		notes: null,
		created_at: '',
		updated_at: '',
		sponsor,
		assignments: opts.assignments ?? []
	};
}

describe('planSponsorTransfer', () => {
	it('links a source category to the target category with the same name', () => {
		const targetCategory = makeCategory('Werbeplakat', 250);
		const source = [
			makeSponsoring({
				companyName: 'Brauerei Schremser',
				assignments: [makeAssignment(makeCategory('Werbeplakat', 200, 'source'))]
			})
		];

		const plans = planSponsorTransfer(source, [targetCategory]);

		expect(plans).toHaveLength(1);
		expect(plans[0].companyName).toBe('Brauerei Schremser');
		expect(plans[0].categories).toEqual([
			expect.objectContaining({
				name: 'Werbeplakat',
				status: 'match',
				targetCategoryId: targetCategory.id
			})
		]);
	});

	it('matches category names trimmed and case-insensitively', () => {
		const targetCategory = makeCategory('werbeplakat', 250);
		const source = [
			makeSponsoring({
				companyName: 'Raiffeisen',
				assignments: [makeAssignment(makeCategory('  Werbeplakat ', 200, 'source'))]
			})
		];

		const plans = planSponsorTransfer(source, [targetCategory]);

		expect(plans[0].categories[0].status).toBe('match');
		expect(plans[0].categories[0].targetCategoryId).toBe(targetCategory.id);
	});

	it('plans missing target categories as create with the previous-year value as proposal', () => {
		const source = [
			makeSponsoring({
				companyName: 'Raiffeisen',
				assignments: [makeAssignment(makeCategory('Social-Media-Beitrag', 100, 'source'))]
			})
		];

		const plans = planSponsorTransfer(source, []);

		expect(plans[0].categories).toEqual([
			{
				name: 'Social-Media-Beitrag',
				status: 'create',
				targetCategoryId: null,
				proposedValue: 100,
				assignedValue: null
			}
		]);
	});

	it('passes the overridden assignment value through for the new assignment', () => {
		const targetCategory = makeCategory('Werbeplakat', 250);
		const source = [
			makeSponsoring({
				companyName: 'Raiffeisen',
				assignments: [makeAssignment(makeCategory('Werbeplakat', 200, 'source'), 150)]
			})
		];

		const plans = planSponsorTransfer(source, [targetCategory]);

		expect(plans[0].categories[0].assignedValue).toBe(150);
	});

	it('passes the free amount through and supports sponsors without categories', () => {
		const source = [makeSponsoring({ companyName: 'Raiffeisen', freeAmount: 300 })];

		const plans = planSponsorTransfer(source, []);

		expect(plans[0].freeAmount).toBe(300);
		expect(plans[0].categories).toEqual([]);
	});

	it('plans multiple sponsors independently', () => {
		const targetCategory = makeCategory('Werbeplakat', 250);
		const source = [
			makeSponsoring({
				companyName: 'Brauerei Schremser',
				assignments: [makeAssignment(makeCategory('Werbeplakat', 200, 'source'))]
			}),
			makeSponsoring({
				companyName: 'Raiffeisen',
				freeAmount: 50,
				assignments: [makeAssignment(makeCategory('Logo in Speisekarte', 80, 'source'))]
			})
		];

		const plans = planSponsorTransfer(source, [targetCategory]);

		expect(plans).toHaveLength(2);
		expect(plans[0].categories[0].status).toBe('match');
		expect(plans[1].categories[0].status).toBe('create');
		expect(plans[1].freeAmount).toBe(50);
	});
});
