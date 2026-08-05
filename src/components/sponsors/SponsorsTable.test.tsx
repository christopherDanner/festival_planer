import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Sponsor } from '@/lib/sponsorService';
import SponsorsTable from './SponsorsTable';

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

const render = (sponsors: Sponsor[]) =>
	renderToStaticMarkup(<SponsorsTable sponsors={sponsors} onSelect={() => {}} />);

describe('SponsorsTable', () => {
	it('trägt die sieben Frachtbrief-Spalten', () => {
		// Sechs beschriftete plus die leere ⋮-Spalte.
		for (const kopf of ['Firma', 'Ansprechpartner', 'Telefon', 'Email', 'Adresse', 'Zuletzt']) {
			expect(render([sponsor()])).toContain(kopf);
		}
		expect(render([sponsor()]).match(/<th[ >]/g)).toHaveLength(7);
	});

	it('zeigt je Firma alle Kontaktfelder, die Website als Subzeile', () => {
		const html = render([sponsor()]);
		expect(html).toContain('Bäckerei Grünsteidl');
		expect(html).toContain('gruensteidl.at');
		expect(html).toContain('Maria Grünsteidl');
		expect(html).toContain('07412 52318');
		expect(html).toContain('office@gruensteidl.at');
		expect(html).toContain('Hauptstraße 14, 3252 Petzenkirchen');
	});

	it('setzt für jedes fehlende Feld ein graues „–"', () => {
		const html = render([
			sponsor({ contact_person: null, email: null, phone: null, address: null, website: null })
		]);
		expect(html.match(/–/g)).toHaveLength(4);
		expect(html).toContain('Bäckerei Grünsteidl');
	});

	it('lässt „Zuletzt" leer, bis der Historie-Slice greift', () => {
		const html = render([sponsor()]);
		expect(html).not.toContain('Noch nie');
	});

	it('sortiert nicht um — die Reihenfolge des Bestands bleibt', () => {
		const html = render([
			sponsor({ id: 'a', company_name: 'Autohaus Wieselburg' }),
			sponsor({ id: 'z', company_name: 'Zeltverleih Festkultur' })
		]);
		expect(html.indexOf('Autohaus Wieselburg')).toBeLessThan(html.indexOf('Zeltverleih Festkultur'));
	});

	it('klebt den Tabellenkopf am Desktop unter der Werkzeugleiste', () => {
		const html = render([sponsor()]);
		expect(html).toContain('min-[900px]:sticky');
		expect(html).toContain('min-[900px]:top-[var(--sponsors-toolbar-h)]');
	});

	it('scrollt unter 900px im eigenen Rahmen, am Desktop gar nicht', () => {
		const html = render([sponsor()]);
		expect(html).toContain('overflow-x-auto');
		expect(html).toContain('min-[900px]:overflow-x-visible');
	});

	it('sagt es, wenn die Suche nichts trifft', () => {
		const html = render([]);
		expect(html).toContain('Keine Firma gefunden');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render([sponsor()])).not.toContain('rounded');
	});
});
