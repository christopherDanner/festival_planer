import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsoringHeadline from './SponsoringHeadline';

const render = (props: Partial<React.ComponentProps<typeof SponsoringHeadline>> = {}) =>
	renderToStaticMarkup(
		<SponsoringHeadline
			total={4850}
			sponsorCount={14}
			inKindTotal={270}
			previousFestivalTotal={4400}
			{...props}
		/>
	);

describe('SponsoringHeadline', () => {
	it('zeigt die Geldsumme, das Maßband und die Unterzeile mit Vorjahr und Sachwert', () => {
		const html = render();
		expect(html).toContain('€ 4.850');
		expect(html).toContain('role="meter"');
		expect(html).toContain('14 Sponsoren');
		expect(html).toContain('Vorjahr € 4.400');
		expect(html).toContain('+ € 270 Sachwert');
	});

	it('lässt beim Fest ohne Vorjahr das Maßband ganz weg — ohne Ersatz-Satz', () => {
		const html = render({ previousFestivalTotal: null });
		expect(html).toContain('€ 4.850');
		expect(html).toContain('14 Sponsoren');
		expect(html).toContain('+ € 270 Sachwert');
		expect(html).not.toContain('role="meter"');
		expect(html).not.toContain('Vorjahr');
	});

	it('misst das Maßband am größeren der beiden Stände, damit die Marke im Band bleibt', () => {
		// heuer 4.850 über Vorjahr 4.400: Füllung voll, Marke bei 4400/4850 ≈ 91 %
		const gewachsen = render({ total: 4850, previousFestivalTotal: 4400 });
		expect(gewachsen).toContain('aria-valuemax="4850"');

		// heuer 2.200 unter Vorjahr 4.400: Skala ist das Vorjahr, Marke am Ende
		const geschrumpft = render({ total: 2200, previousFestivalTotal: 4400 });
		expect(geschrumpft).toContain('aria-valuemax="4400"');
		expect(geschrumpft).toContain('width:50%');
		expect(geschrumpft).toContain('left:100%');
	});

	it('nennt einen einzelnen Sponsor in der Einzahl', () => {
		expect(render({ sponsorCount: 1 })).toContain('1 Sponsor ');
	});

	it('schweigt über den Sachwert, wenn keine Sachleistung erfasst ist', () => {
		expect(render({ inKindTotal: 0 })).not.toContain('Sachwert');
	});
});
