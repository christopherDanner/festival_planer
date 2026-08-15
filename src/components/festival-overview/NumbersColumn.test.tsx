import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import NumbersColumn from './NumbersColumn';

function sponsoring(over: Partial<SponsoringWithDetails> = {}): SponsoringWithDetails {
	return {
		id: 'sp1',
		festival_id: 'f1',
		sponsor_id: 'sponsor1',
		free_amount: null,
		notes: null,
		in_kind_description: null,
		in_kind_value: null,
		copied_from_festival_id: null,
		created_at: '',
		updated_at: '',
		sponsor: { id: 'sponsor1', company_name: 'Raiffeisen' },
		assignments: []
	} as SponsoringWithDetails;
}

const render = (sponsorings: SponsoringWithDetails[]) =>
	renderToStaticMarkup(
		<NumbersColumn
			stations={[]}
			shifts={[]}
			assignments={[]}
			stationMembers={[]}
			materials={[]}
			sponsorings={sponsorings}
			onTabChange={() => {}}
		/>
	);

describe('NumbersColumn — Sponsoring-Kasten', () => {
	it('zeigt die Geldzahl und darunter den Sachwert als eigene Unterzeile', () => {
		const html = render([
			{
				...sponsoring(),
				id: 'x',
				free_amount: 4850,
				in_kind_description: 'Brotkorb',
				in_kind_value: 190
			},
			{ ...sponsoring(), id: 'y', in_kind_description: '6 Fl. Wein', in_kind_value: 80 }
		]);

		expect(html).toContain('€ 4.850');
		expect(html).toContain('2 Sponsoren');
		expect(html).toContain('+ € 270 Sachwert');
	});

	it('schweigt über den Sachwert, wenn keine Sachleistung erfasst ist', () => {
		const html = render([{ ...sponsoring(), free_amount: 4850 }]);

		expect(html).toContain('€ 4.850');
		expect(html).toContain('1 Sponsor');
		expect(html).not.toContain('Sachwert');
	});

	it('schweigt über den Sachwert im Leerzustand', () => {
		const html = render([]);

		expect(html).toContain('Noch keine Sponsoren');
		expect(html).not.toContain('Sachwert');
	});
});
