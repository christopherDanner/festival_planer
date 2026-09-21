import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsoringSearch, { type SponsoringSearchProps } from './SponsoringSearch';

const noop = () => {};

const render = (props: Partial<SponsoringSearchProps> = {}) =>
	renderToStaticMarkup(
		<SponsoringSearch
			searchTerm=""
			onSearchChange={noop}
			onReset={noop}
			shown={14}
			total={14}
			{...props}
		/>
	);

describe('SponsoringSearch', () => {
	it('bietet ein Suchfeld für den Firmennamen — die Beschriftung der Variante C', () => {
		expect(render()).toContain('Firma suchen');
	});

	it('gibt den eingetippten Suchbegriff ins Feld zurück', () => {
		expect(render({ searchTerm: 'bäckerei' })).toContain('value="bäckerei"');
	});

	it('macht mit dem Zähler sichtbar, dass ein Filter aktiv ist', () => {
		expect(render({ searchTerm: 'bau', shown: 3, total: 14 })).toContain('3 von 14');
	});

	it('lässt die Suche zurücksetzen, solange ein Begriff steht', () => {
		expect(render({ searchTerm: 'bau', shown: 3, total: 14 })).toContain(
			'Suche zurücksetzen'
		);
	});

	it('hält sich ohne Suchbegriff zurück: kein Zähler, kein Rücksetzen', () => {
		const html = render();
		expect(html).not.toContain('Suche zurücksetzen');
		// „14 von 14" als ständiges Beiwerk zeigt keinen aktiven Filter an
		expect(html).not.toContain('14 von 14');
	});
});
