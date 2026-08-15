import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import { makeSponsoring } from '@/lib/__tests__/sponsoringFactories';
import NumbersColumn from './NumbersColumn';

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
			makeSponsoring({ freeAmount: 4850, inKindDescription: 'Brotkorb', inKindValue: 190 }),
			makeSponsoring({ inKindDescription: '6 Fl. Wein', inKindValue: 80 })
		]);

		expect(html).toContain('€ 4.850');
		expect(html).toContain('2 Sponsoren');
		expect(html).toContain('+ € 270 Sachwert');
	});

	it('schweigt über den Sachwert, wenn keine Sachleistung erfasst ist', () => {
		const html = render([makeSponsoring({ freeAmount: 4850 })]);

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
