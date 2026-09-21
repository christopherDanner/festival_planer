import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSponsorHistory, type SponsorHistoryMap } from '@/lib/sponsorHistory';
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

const render = (sponsors: Sponsor[], history: SponsorHistoryMap = {}) =>
	renderToStaticMarkup(
		<SponsorsTable sponsors={sponsors} history={history} onSelect={() => {}} />
	);

/** Historie aus echten Verknüpfungen, nicht von Hand gestellt. */
const historieVon = (...jahre: [id: string, start_date: string][]) =>
	buildSponsorHistory(
		jahre.map(([id]) => ({ sponsor_id: 's1', festival_id: id })),
		jahre.map(([id, start_date]) => ({ id, start_date })),
		null
	);

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

	it('zeigt in „Zuletzt" das Jahr des letzten Sponsorings und die Anzahl der Feste', () => {
		const html = render(
			[sponsor()],
			historieVon(['f2021', '2021-07-24'], ['f2023', '2023-07-22'], ['f2025', '2025-07-25'])
		);
		expect(html).toContain('2025');
		expect(html).toContain('3 Feste');
		expect(html).not.toContain('NOCH NIE');
	});

	it('zählt ein einzelnes Fest im Singular', () => {
		const html = render([sponsor()], historieVon(['f2025', '2025-07-25']));
		expect(html).toContain('1 Fest<');
	});

	it('setzt der Firma ohne Historie die Marke „NOCH NIE"', () => {
		const html = render([sponsor()]);
		expect(html).toContain('NOCH NIE');
		expect(html).toContain('border-dashed');
		expect(html).toContain('text-rot');
	});

	it('nennt bei einem Fest ohne Datum die Anzahl statt eines erfundenen Jahres', () => {
		const html = render([sponsor()], {
			s1: { sponsorId: 's1', lastYear: null, festivalCount: 2, sponsorsReferenceFestival: false }
		});
		expect(html).toContain('2 Feste');
		expect(html).not.toContain('NOCH NIE');
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
