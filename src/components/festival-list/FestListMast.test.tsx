import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import FestListMast from './FestListMast';

const noop = () => {};

const render = (props: { festivalCount: number; upcomingCount: number; compact?: boolean }) =>
	renderToStaticMarkup(
		<FestListMast
			compact={false}
			onNewFestival={noop}
			onSponsors={noop}
			onSignOut={noop}
			{...props}
		/>
	);

describe('FestListMast', () => {
	it('trägt Titel, Zählzeile und den gelben Neu-Knopf', () => {
		const html = render({ festivalCount: 7, upcomingCount: 3 });
		expect(html).toContain('Meine Feste');
		expect(html).toContain('7 Feste · 3 bevorstehend');
		expect(html).toContain('+ NEUES FEST');
	});

	it('lässt die Zählzeile ohne Feste weg', () => {
		const html = render({ festivalCount: 0, upcomingCount: 0 });
		expect(html).not.toContain('bevorstehend');
	});

	it('zeigt die ruhigen Aktionen Sponsoren und Abmelden, aber keine Mitglieder', () => {
		const html = render({ festivalCount: 7, upcomingCount: 3 });
		expect(html).toContain('Sponsoren');
		expect(html).toContain('Abmelden');
		expect(html).not.toContain('Mitglieder');
	});

	it('trägt keine Verein-/Veranstalter-Zeile', () => {
		const html = render({ festivalCount: 7, upcomingCount: 3 });
		expect(html).not.toContain('Musikverein');
		expect(html).not.toContain('Veranstalter');
	});

	it('räumt unter 900px die ruhigen Aktionen ins ⋮-Menü, behält aber den Neu-Knopf', () => {
		const html = render({ festivalCount: 7, upcomingCount: 3, compact: true });
		expect(html).toContain('+ NEUES FEST');
		expect(html).toContain('aria-label="Menü"');
		expect(html).not.toContain('Sponsoren');
		expect(html).not.toContain('Abmelden');
	});

	it('zeigt am Desktop kein ⋮-Menü', () => {
		const html = render({ festivalCount: 7, upcomingCount: 3 });
		expect(html).not.toContain('aria-label="Menü"');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render({ festivalCount: 7, upcomingCount: 3 })).not.toMatch(/rounded-/);
		expect(render({ festivalCount: 7, upcomingCount: 3, compact: true })).not.toMatch(/rounded-/);
	});
});
