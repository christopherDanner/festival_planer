import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildSponsorHistory, type SponsorHistoryMap } from '@/lib/sponsorHistory';
import type { Sponsor } from '@/lib/sponsorService';

import SponsorsCardList from './SponsorsCardList';

function sponsor(name: string, id = name): Sponsor {
	return {
		id,
		user_id: 'u1',
		company_name: name,
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

const render = (sponsors: Sponsor[], history: SponsorHistoryMap = {}) =>
	renderToStaticMarkup(
		<SponsorsCardList sponsors={sponsors} history={history} onSelect={() => {}} />
	);

describe('SponsorsCardList — der Bestand am Handy (#160)', () => {
	it('stapelt je Firma eine Karte', () => {
		const html = render([sponsor('Autohaus Wieselburg'), sponsor('Elektro Pichler')]);
		expect(html.match(/<article/g)).toHaveLength(2);
		expect(html).toContain('Autohaus Wieselburg');
		expect(html).toContain('Elektro Pichler');
	});

	it('sortiert nicht um — die Reihenfolge des Bestands bleibt', () => {
		const html = render([sponsor('Autohaus Wieselburg'), sponsor('Zeltverleih Festkultur')]);
		expect(html.indexOf('Autohaus Wieselburg')).toBeLessThan(html.indexOf('Zeltverleih Festkultur'));
	});

	it('gibt jeder Karte ihre eigene Historie', () => {
		const history = buildSponsorHistory(
			[{ sponsor_id: 'Elektro Pichler', festival_id: 'f2025' }],
			[{ id: 'f2025', start_date: '2025-07-25' }],
			null
		);
		const html = render([sponsor('Elektro Pichler'), sponsor('Zeltverleih Festkultur')], history);
		expect(html).toContain('2025');
		expect(html).toContain('1 Fest<');
		// Die zweite Firma war noch nie dabei.
		expect(html).toContain('NOCH NIE');
	});

	it('sagt mit demselben Wortlaut wie die Tabelle, wenn die Suche nichts trifft', () => {
		const html = render([]);
		expect(html).toContain('Keine Firma gefunden');
		expect(html).not.toContain('<article');
	});

	it('scrollt nirgends quer — dafür gibt es die Karten', () => {
		const html = render([sponsor('Immobilien Mostviertel Consulting GmbH')]);
		expect(html).not.toContain('overflow-x-auto');
		expect(html).not.toContain('<table');
	});
});
