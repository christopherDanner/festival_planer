import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildSponsorHistory, sponsorHistoryOf, type SponsorHistory } from '@/lib/sponsorHistory';
import type { Sponsor } from '@/lib/sponsorService';

import SponsorCard from './SponsorCard';

function sponsor(over: Partial<Sponsor> = {}): Sponsor {
	return {
		id: 's1',
		user_id: 'u1',
		company_name: 'Bäckerei Grünsteidl',
		contact_person: 'Maria Grünsteidl',
		email: 'office@gruensteidl.at',
		phone: '07412 52318',
		address: 'Hauptstraße 14, 3252 Petzenkirchen',
		website: 'gruensteidl.at',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const OHNE_HISTORIE: SponsorHistory = {
	sponsorId: 's1',
	lastYear: null,
	festivalCount: 0,
	sponsorsReferenceFestival: false
};

/** Historie aus echten Verknüpfungen, nicht von Hand gestellt. */
const historieVon = (...feste: [id: string, start_date: string][]) =>
	sponsorHistoryOf(
		buildSponsorHistory(
			feste.map(([id]) => ({ sponsor_id: 's1', festival_id: id })),
			feste.map(([id, start_date]) => ({ id, start_date })),
			null
		),
		's1'
	);

const render = (s: Sponsor = sponsor(), history: SponsorHistory = OHNE_HISTORIE) =>
	renderToStaticMarkup(<SponsorCard sponsor={s} history={history} onSelect={() => {}} />);

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('SponsorCard — der volle Stammsatz am Handy (#160)', () => {
	it('trägt alle sieben Felder in der Reihenfolge der Tabellenspalten', () => {
		const gelesen = text(render());
		const reihe = [
			'Bäckerei Grünsteidl',
			'Maria Grünsteidl',
			'07412 52318',
			'office@gruensteidl.at',
			'Hauptstraße 14, 3252 Petzenkirchen',
			'gruensteidl.at'
		];
		let vorher = -1;
		for (const wert of reihe) {
			// Ab der vorigen Fundstelle suchen: „gruensteidl.at" steckt auch in der
			// Emailadresse, die Reihenfolge prüft aber die eigene Angabe.
			const stelle = gelesen.indexOf(wert, vorher + 1);
			expect(stelle, wert).toBeGreaterThan(vorher);
			vorher = stelle;
		}
	});

	it('beschriftet die fünf Angaben unter dem Firmennamen mit Versalien-Kürzeln', () => {
		const gelesen = text(render());
		for (const kuerzel of ['Kontakt', 'Tel', 'Email', 'Adresse', 'Web']) {
			expect(gelesen, kuerzel).toContain(kuerzel);
		}
	});

	it('setzt für jedes fehlende Feld ein graues „–" — die Lücke ist Information', () => {
		const html = render(
			sponsor({ contact_person: null, phone: null, email: null, address: null, website: null })
		);
		expect(html.match(/–/g)).toHaveLength(5);
		expect(html).toContain('Bäckerei Grünsteidl');
	});

	it('setzt die Historie abgesetzt unter die Angaben', () => {
		const html = render(sponsor(), historieVon(['f2023', '2023-07-22'], ['f2025', '2025-07-25']));
		expect(html).toContain('2025');
		expect(html).toContain('2 Feste');
		// Gestrichelte Linie über der Historie — sie gehört nicht zu den Kontaktdaten.
		expect(html).toContain('border-dashed');
		expect(html.indexOf('gruensteidl.at')).toBeLessThan(html.indexOf('2 Feste'));
	});

	it('trägt der Firma ohne Historie dieselbe Marke „NOCH NIE" wie die Tabelle', () => {
		const html = render();
		expect(html).toContain('NOCH NIE');
		expect(html).toContain('text-rot');
	});

	it('setzt den Firmennamen in Akzentschrift-Versalien', () => {
		// Am Knopf selbst, nicht nur an der Überschrift: Tailwinds Preflight setzt
		// `button { text-transform: none }` und nähme die Versalien sonst zurück.
		const knopf = render().match(/<button[^>]*>/)?.[0] ?? '';
		expect(knopf).toContain('font-display');
		expect(knopf).toContain('uppercase');
	});

	it('öffnet über den Firmennamen die Firmendaten', () => {
		const html = render();
		// Der Name ist ein echter Knopf, damit er auch mit der Tastatur erreichbar
		// ist — dasselbe Muster wie in der Tabellenzeile.
		expect(html).toMatch(/<button[^>]*>Bäckerei Grünsteidl<\/button>/);
	});

	it('macht die ganze Karte zum Trefferfeld, nicht nur den 17px hohen Namen', () => {
		// DESIGN-VISION §6 will am Handy 40px; der Firmenname allein ist bei
		// 14.5px/1.15 knapp 17px hoch. Also dieselbe Lösung wie die Tabellenzeile
		// am Desktop: die ganze Karte öffnet, der Name bleibt der Tastaturweg.
		const html = render();
		expect(html).toMatch(/<article[^>]*cursor-pointer/);
	});

	it('hält oben rechts den Rand für das ⋮ frei', () => {
		// Das Menü aus #159 hängt sich wie im Prototyp absolut in die Ecke — es
		// braucht keine eigene Höhe, aber der Name darf nicht darunter laufen.
		expect(render()).toMatch(/<h3[^>]*pr-\[42px\]/);
	});

	it('bricht langen Text um, statt ihn abzuschneiden oder quer zu scrollen', () => {
		const html = render(
			sponsor({ email: 'sehr.lange.adresse.der.firma@immobilien-mostviertel-consulting.at' })
		);
		expect(html).toContain('[overflow-wrap:anywhere]');
		expect(html).not.toContain('overflow-x-auto');
		expect(html).not.toContain('truncate');
	});

	it('bleibt 2px Tinte ohne runde Ecken', () => {
		const html = render();
		expect(html).toContain('border-2 border-tinte');
		expect(html).not.toContain('rounded');
	});
});
