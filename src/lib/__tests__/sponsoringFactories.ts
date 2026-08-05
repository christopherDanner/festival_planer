/** Fabriken für Sponsoring-Testdaten — nur die Felder, die gelesen werden. */
import type {
	Sponsor,
	SponsoringAssignmentWithCategory,
	SponsoringCategory,
	SponsoringWithDetails
} from '../sponsorService';

let idCounter = 0;

export function makeSponsor(companyName: string): Sponsor {
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

export function makeCategory(name: string, value: number | null): SponsoringCategory {
	idCounter += 1;
	return {
		id: `cat-${idCounter}`,
		festival_id: 'f1',
		name,
		value,
		created_at: '',
		updated_at: ''
	};
}

export function makeAssignment(opts: {
	categoryName?: string;
	categoryValue?: number | null;
	category?: SponsoringCategory;
	value?: number | null;
}): SponsoringAssignmentWithCategory {
	const category =
		opts.category ?? makeCategory(opts.categoryName ?? 'Kategorie', opts.categoryValue ?? null);
	idCounter += 1;
	return {
		id: `as-${idCounter}`,
		sponsoring_id: 'spo-1',
		category_id: category.id,
		value: opts.value ?? null,
		created_at: '',
		category
	};
}

export function makeSponsoring(opts: {
	companyName?: string;
	freeAmount?: number | null;
	assignments?: SponsoringAssignmentWithCategory[];
	inKindDescription?: string | null;
	inKindValue?: number | null;
}): SponsoringWithDetails {
	idCounter += 1;
	return {
		id: `spo-${idCounter}`,
		festival_id: 'f1',
		sponsor_id: `sp-${idCounter}`,
		free_amount: opts.freeAmount ?? null,
		in_kind_description: opts.inKindDescription ?? null,
		in_kind_value: opts.inKindValue ?? null,
		notes: null,
		created_at: '',
		updated_at: '',
		sponsor: makeSponsor(opts.companyName ?? 'Firma'),
		assignments: opts.assignments ?? []
	};
}
