import { describe, it, expect } from 'vitest';
import { buildSponsoringOverviewRows, festivalSponsoringTotal, sponsoringTotal } from '../sponsoringTotals';
import type {
	SponsoringAssignmentWithCategory,
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

function makeAssignment(opts: {
	categoryName: string;
	categoryValue: number | null;
	value?: number | null;
}): SponsoringAssignmentWithCategory {
	idCounter += 1;
	return {
		id: `as-${idCounter}`,
		sponsoring_id: 'spo-1',
		category_id: `cat-${idCounter}`,
		value: opts.value ?? null,
		created_at: '',
		category: {
			id: `cat-${idCounter}`,
			festival_id: 'f1',
			name: opts.categoryName,
			value: opts.categoryValue,
			created_at: '',
			updated_at: ''
		}
	};
}

function makeSponsoring(opts: {
	companyName?: string;
	freeAmount?: number | null;
	assignments?: SponsoringAssignmentWithCategory[];
}): SponsoringWithDetails {
	idCounter += 1;
	return {
		id: `spo-${idCounter}`,
		festival_id: 'f1',
		sponsor_id: `sp-${idCounter}`,
		free_amount: opts.freeAmount ?? null,
		notes: null,
		created_at: '',
		updated_at: '',
		sponsor: makeSponsor(opts.companyName ?? 'Firma'),
		assignments: opts.assignments ?? []
	};
}

describe('sponsoringTotal', () => {
	it('returns the free amount for a pure money sponsor without categories', () => {
		const sponsoring = makeSponsoring({ freeAmount: 500 });
		expect(sponsoringTotal(sponsoring)).toBe(500);
	});

	it('sums assigned category values when no free amount is set', () => {
		const sponsoring = makeSponsoring({
			assignments: [
				makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200 }),
				makeAssignment({ categoryName: 'Social-Media-Beitrag', categoryValue: 100 })
			]
		});
		expect(sponsoringTotal(sponsoring)).toBe(300);
	});

	it('prefers the overridden assignment value over the category default', () => {
		const sponsoring = makeSponsoring({
			assignments: [
				makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200, value: 150 }),
				makeAssignment({ categoryName: 'Logo in Speisekarte', categoryValue: 50 })
			]
		});
		expect(sponsoringTotal(sponsoring)).toBe(200);
	});

	it('adds the free amount on top of assigned categories', () => {
		const sponsoring = makeSponsoring({
			freeAmount: 100,
			assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200 })]
		});
		expect(sponsoringTotal(sponsoring)).toBe(300);
	});

	it('counts a valueless category without override as 0', () => {
		const sponsoring = makeSponsoring({
			assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: null })]
		});
		expect(sponsoringTotal(sponsoring)).toBe(0);
	});

	it('returns 0 for a sponsoring without categories and without free amount', () => {
		expect(sponsoringTotal(makeSponsoring({}))).toBe(0);
	});
});

describe('festivalSponsoringTotal', () => {
	it('returns 0 for a festival without sponsorings', () => {
		expect(festivalSponsoringTotal([])).toBe(0);
	});

	it('sums the totals of all sponsorings of the festival', () => {
		const sponsorings = [
			makeSponsoring({
				freeAmount: 100,
				assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200 })]
			}),
			makeSponsoring({ freeAmount: 50 })
		];
		expect(festivalSponsoringTotal(sponsorings)).toBe(350);
	});
});

describe('buildSponsoringOverviewRows', () => {
	it('builds one row per sponsor with category positions, free amount and total, sorted by company name', () => {
		const sponsorings = [
			makeSponsoring({
				companyName: 'Raiffeisen',
				freeAmount: 100,
				assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200, value: 150 })]
			}),
			makeSponsoring({ companyName: 'Brauerei Schremser', freeAmount: 50 })
		];

		const rows = buildSponsoringOverviewRows(sponsorings);

		expect(rows.map((r) => r.companyName)).toEqual(['Brauerei Schremser', 'Raiffeisen']);
		expect(rows[1].positions).toEqual([{ label: 'Werbeplakat', value: 150 }]);
		expect(rows[1].freeAmount).toBe(100);
		expect(rows[1].total).toBe(250);
		expect(rows[0].positions).toEqual([]);
		expect(rows[0].total).toBe(50);
	});
});
