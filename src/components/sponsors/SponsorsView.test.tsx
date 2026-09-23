import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSponsorHistory } from '@/lib/sponsorHistory';
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

/**
 * Baumeister sponsert das Bezugsfest 2026 und hat Historie, Elektro hat nur
 * Historie von 2023, Zeltverleih war noch nie dabei.
 */
const HISTORY = buildSponsorHistory(
	[
		{ sponsor_id: 'Baumeister Deim', festival_id: 'f2023' },
		{ sponsor_id: 'Baumeister Deim', festival_id: 'f2026' },
		{ sponsor_id: 'Elektro Pichler', festival_id: 'f2023' }
	],
	[
		{ id: 'f2023', start_date: '2023-07-22' },
		{ id: 'f2026', start_date: '2026-07-24' }
	],
	'f2026'
);

const noop = () => {};

const render = (props: Partial<SponsorsViewProps> = {}) =>
	renderToStaticMarkup(
		<SponsorsView
			sponsors={SPONSORS}
			history={HISTORY}
			referenceYear={2026}
			searchTerm=""
			onSearchChange={noop}
			segment="alle"
			onSegmentChange={noop}
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

	it('trägt je Zeile die Sponsoren-Historie', () => {
		const html = render();
		expect(html).toContain('2026');
		expect(html).toContain('2 Feste');
		// Zeltverleih war noch nie dabei.
		expect(html).toContain('NOCH NIE');
	});

	it('nennt im Mast, wie viele Firmen das Bezugsfest sponsern', () => {
		expect(render()).toContain('3 Firmen · 1 sponsert 2026');
	});

	it('schneidet mit dem Segment SPONSERT auf die Firmen des Bezugsfests zu', () => {
		const html = render({ segment: 'sponsert' });
		expect(html).toContain('Baumeister Deim');
		expect(html).not.toContain('Elektro Pichler');
		expect(html).toContain('1 von 3');
		expect(html).toContain('sponsern 2026');
	});

	it('nimmt in HEUER NOCH NICHT GEFRAGT auch die Firma ohne jede Historie', () => {
		const html = render({ segment: 'nicht-gefragt' });
		expect(html).toContain('Elektro Pichler');
		expect(html).toContain('Zeltverleih Festkultur');
		expect(html).not.toContain('Baumeister Deim');
		expect(html).toContain('2 von 3');
	});

	it('lässt Suche und Segment zusammen filtern, nicht einander ersetzen', () => {
		const html = render({ searchTerm: 'e', segment: 'nicht-gefragt' });
		// „e" trifft alle drei; das Segment nimmt Baumeister heraus.
		expect(html).toContain('Elektro Pichler');
		expect(html).toContain('Zeltverleih Festkultur');
		expect(html).not.toContain('Baumeister Deim');
		expect(html).toContain('2 von 3');
	});

	it('zählt die Segmente über die Treffer der Suche — der Zähler sagt voraus', () => {
		const html = render({ searchTerm: 'baumeister' });
		// Ein Treffer, und der sponsert heuer — „heuer noch nicht gefragt" ist
		// unter dieser Suche leer. Über den ganzen Bestand stünde dort 2.
		expect(html).toContain('>0</span>');
	});

	it('lässt ohne Bezugsfest den Segment-Schalter und das Jahr weg', () => {
		const html = render({ referenceYear: null, segment: 'alle' });
		expect(html).toContain('3 Firmen');
		expect(html).not.toContain('sponsern');
		expect(html).not.toContain('SPONSERT');
		expect(html).not.toContain('radiogroup');
		expect(html).not.toContain('undefined');
	});

	it('nimmt ohne Bezugsfest ein stehengebliebenes Segment zurück', () => {
		// Fällt das Bezugsfest zwischen zwei Ladevorgängen weg, gäbe es sonst
		// einen zugeschnittenen Frachtbrief ohne Schalter, der ihn erklärt.
		const html = render({ referenceYear: null, segment: 'sponsert' });
		expect(html).toContain('Baumeister Deim');
		expect(html).toContain('Elektro Pichler');
		expect(html).toContain('Zeltverleih Festkultur');
		expect(html).toContain('3 von 3');
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

describe('SponsorsView unter 900px (#160)', () => {
	it('zeigt Karten statt der Tabelle', () => {
		const html = render({ compact: true });
		expect(html).not.toContain('<table');
		expect(html.match(/<article/g)).toHaveLength(3);
		expect(html).toContain('Baumeister Deim');
	});

	it('lässt die Tabelle am Desktop stehen', () => {
		const html = render();
		expect(html).toContain('<table');
		expect(html).not.toContain('<article');
	});

	it('filtert die Karten mit Suche und Segment wie die Tabelle', () => {
		const html = render({ compact: true, searchTerm: 'e', segment: 'nicht-gefragt' });
		expect(html.match(/<article/g)).toHaveLength(2);
		expect(html).toContain('Elektro Pichler');
		expect(html).toContain('Zeltverleih Festkultur');
		expect(html).not.toContain('Baumeister Deim');
		expect(html).toContain('2 von 3');
	});

	it('hält die Werkzeugleiste auch im langen Scrollweg oben', () => {
		const html = render({ compact: true });
		// Suche und Segment-Schalter bleiben erreichbar, während 40 Karten
		// darunter durchlaufen — das ist der Gegenwert für den langen Weg.
		expect(html).toContain('sticky top-0');
		expect(html).toContain('Firma suchen');
		expect(html).toContain('SPONSERT 2026');
	});

	it('zeigt bei leerem Bestand auch am Handy den Leerzustand', () => {
		const html = render({ compact: true, sponsors: [] });
		expect(html).toContain('NOCH KEINE FIRMA');
		expect(html).not.toContain('<article');
	});
});
