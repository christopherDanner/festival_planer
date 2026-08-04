import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Festival } from '@/lib/festivalService';
import FestivalWall from './FestivalWall';
import { arrangeFestivalWall } from './festivalList';

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

const noop = () => {};
const today = new Date('2026-07-20T15:30:00');

const NEXT = fest({
	id: 'next',
	name: 'Musikfest Steinbach 2026',
	start_date: '2026-07-24',
	end_date: '2026-07-26'
});
const SOON = fest({ id: 'soon', name: 'Herbstkonzert', start_date: '2026-10-24' });
const PAST = fest({
	id: 'past',
	name: 'Stadlfest',
	start_date: '2025-09-05',
	end_date: '2025-09-06'
});

const render = (festivals: Festival[]) =>
	renderToStaticMarkup(
		<FestivalWall
			ranks={arrangeFestivalWall(festivals, today)}
			today={today}
			onOpen={noop}
			onUseAsTemplate={noop}
			onEdit={noop}
			onDelete={noop}
			onNewFestival={noop}
		/>
	);

describe('FestivalWall', () => {
	it('ordnet die Wand in drei Ränge mit Zwischenzeilen', () => {
		const html = render([NEXT, SOON, PAST]);
		expect(html).toContain('Nächstes Fest');
		expect(html).toContain('Weitere bevorstehende Feste');
		expect(html).toContain('Vergangene Feste');
	});

	it('zeigt jeden Rang nur, wenn er Plakate trägt', () => {
		const html = render([NEXT]);
		expect(html).toContain('Nächstes Fest');
		expect(html).not.toContain('Weitere bevorstehende Feste');
		expect(html).not.toContain('Vergangene Feste');
	});

	it('trägt das nächste Fest mit Datumszeile, Countdown und Öffnen-Knopf', () => {
		const html = render([NEXT, SOON, PAST]);
		expect(html).toContain('NÄCHSTES FEST');
		expect(html).toContain('Musikfest Steinbach 2026');
		expect(html).toContain('FR 24. – SO 26. JULI');
		expect(html).toContain('NOCH 4 TAGE');
		expect(html).toContain('FEST ÖFFNEN');
		// Das große Plakat trägt kein „ALS VORLAGE" — nur die kleinen (Spec #90).
		expect(html.slice(0, html.indexOf('Weitere bevorstehende'))).not.toContain('ALS VORLAGE');
	});

	it('stempelt weitere bevorstehende Feste mit ihrem groben Countdown', () => {
		const html = render([NEXT, SOON]);
		expect(html).toContain('IN 3 MONATEN');
		expect(html).toContain('Herbstkonzert');
		expect(html).toContain('ALS VORLAGE');
	});

	it('tönt vergangene Feste und stempelt sie mit ERLEDIGT', () => {
		const html = render([PAST]);
		expect(html).toContain('ERLEDIGT');
		expect(html).toContain('bg-papier-getoent');
		expect(html).toContain('ALS VORLAGE');
	});

	// Die zwei folgenden Auflagen sind reine CSS-Verträge (Stempel-Rotation des
	// Toolkits, Vision-Breakpoint 900px) — im statischen Markup sind sie nur an
	// den Klassen ablesbar, deshalb hier ausnahmsweise darauf geprüft.
	it('dreht Countdown-Stempel und ERLEDIGT-Stempel gegenläufig', () => {
		const html = render([NEXT, SOON, PAST]);
		expect(html).toContain('stamp--tilt-left');
		expect(html).toContain('stamp--tilt-right');
	});

	it('fällt unter 900px auf eine Spalte und gibt dem nächsten Fest sonst zwei', () => {
		const html = render([NEXT, SOON, PAST]);
		expect(html).toContain('grid-cols-1');
		expect(html).toContain('min-[900px]:grid-cols-');
		expect(html).toContain('min-[900px]:col-span-2');
	});

	it('gibt jedem Plakat ein dauerhaft sichtbares ⋮-Menü', () => {
		const html = render([NEXT, SOON, PAST]);
		expect(html).toContain('aria-label="Menü für Musikfest Steinbach 2026"');
		expect(html).toContain('aria-label="Menü für Herbstkonzert"');
		expect(html).toContain('aria-label="Menü für Stadlfest"');
	});

	it('zeigt ohne Feste einen gestrichelten Plakat-Umriss statt der Ränge', () => {
		const html = render([]);
		expect(html).toContain('NOCH KEIN FEST');
		expect(html).toContain('+ ERSTES FEST ANLEGEN');
		expect(html).toContain('border-dashed');
		expect(html).not.toContain('Nächstes Fest');
		expect(html).not.toContain('Vergangene Feste');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render([NEXT, SOON, PAST])).not.toMatch(/rounded-/);
		expect(render([])).not.toMatch(/rounded-/);
	});
});
