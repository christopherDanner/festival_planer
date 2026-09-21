import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import Kopierwerk from './Kopierwerk';

// `renderToStaticMarkup` führt keine Effekte aus — geprüft wird also der
// Zustand, mit dem die Route öffnet. Die Vorlagen-Liste und der Umfang der
// Vorlage hängen an Abfragen und kommen erst danach.
const render = (path = '/festivals/neu') =>
	renderToStaticMarkup(
		<MemoryRouter initialEntries={[path]}>
			<Kopierwerk />
		</MemoryRouter>
	);

describe('Kopierwerk-Route', () => {
	it('öffnet unter dem eigenen Mast mit Schritt 1', () => {
		const html = render();
		expect(html).toContain('Neues Fest anlegen');
		expect(html).toContain('ABBRECHEN ×');
		expect(html).toContain('Name &amp; Datum');
	});

	it('zeigt ohne Vorlage nur Schritt 1 und legt direkt an', () => {
		const html = render();
		expect(html).toContain('FEST ANLEGEN');
		expect(html).not.toContain('Stationen &amp; Schichten');
	});

	it('öffnet mit `?vorlage=` die drei Schritte und führt weiter', () => {
		const html = render('/festivals/neu?vorlage=fest-2026');
		expect(html).toContain('Stationen &amp; Schichten');
		expect(html).toContain('WEITER: STATIONEN →');
	});

	// Material ist seit #95 ein eigener Schritt der Karte, nicht mehr der
	// zweite Kasten unter den Stationen.
	it('führt Material als eigenen Schritt der Stempelkarte', () => {
		const stampCard = (path?: string) => render(path).split('<aside')[1].split('</aside>')[0];

		expect(stampCard('/festivals/neu?vorlage=fest-2026')).toContain('>Material<');
		expect(stampCard()).not.toContain('Material');
	});
});
