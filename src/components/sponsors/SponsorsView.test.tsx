import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Sponsor } from '@/lib/sponsorService';
import SponsorsView, { type SponsorsViewProps } from './SponsorsView';

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

const SPONSORS = [
	sponsor('Baumeister Deim'),
	sponsor('Elektro Pichler'),
	sponsor('Zeltverleih Festkultur')
];

const noop = () => {};

const render = (props: Partial<SponsorsViewProps> = {}) =>
	renderToStaticMarkup(
		<SponsorsView
			sponsors={SPONSORS}
			searchTerm=""
			onSearchChange={noop}
			onOpenFestivalList={noop}
			onAddSponsor={noop}
			onSignOut={noop}
			onSelectSponsor={noop}
			{...props}
		/>
	);

describe('SponsorsView', () => {
	it('zeigt den Bestand als Frachtbrief-Tabelle und zählt ihn im Mast', () => {
		const html = render();
		expect(html).toContain('3 Firmen');
		expect(html).toContain('Baumeister Deim');
		expect(html).toContain('Zeltverleih Festkultur');
		expect(html).not.toContain('NOCH KEINE FIRMA');
	});

	it('filtert die Tabelle mit der Suche und zählt die Treffer mit', () => {
		const html = render({ searchTerm: 'elektro' });
		expect(html).toContain('Elektro Pichler');
		expect(html).not.toContain('Baumeister Deim');
		expect(html).toContain('1 von 3');
		// Die Zählzeile des Masts bleibt der ganze Bestand
		expect(html).toContain('3 Firmen');
	});

	it('sagt bei einer Suche ohne Treffer nicht, der Bestand sei leer', () => {
		const html = render({ searchTerm: 'gibtsnicht' });
		expect(html).toContain('Keine Firma gefunden');
		expect(html).toContain('0 von 3');
		expect(html).not.toContain('NOCH KEINE FIRMA');
	});

	it('zeigt bei leerem Bestand den Leerzustand statt der Tabelle', () => {
		const html = render({ sponsors: [] });
		expect(html).toContain('NOCH KEINE FIRMA');
		expect(html).not.toContain('Keine Firma gefunden');
		expect(html).not.toContain('<table');
	});

	it('gibt der Werkzeugleiste und dem Tabellenkopf dieselbe Höhe vor', () => {
		const html = render();
		expect(html).toContain('--sponsors-toolbar-h:59px');
		expect(html).toContain('min-[900px]:h-[var(--sponsors-toolbar-h)]');
		expect(html).toContain('min-[900px]:top-[var(--sponsors-toolbar-h)]');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});
