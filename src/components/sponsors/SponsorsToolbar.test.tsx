import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorsToolbar, { type SponsorsToolbarProps } from './SponsorsToolbar';

const noop = () => {};

const render = (props: Partial<SponsorsToolbarProps> = {}) =>
	renderToStaticMarkup(
		<SponsorsToolbar searchTerm="" onSearchChange={noop} shown={40} total={40} {...props} />
	);

describe('SponsorsToolbar', () => {
	it('bietet ein Suchfeld für den Firmennamen', () => {
		const html = render();
		expect(html).toContain('Firma suchen');
	});

	it('zeigt den Trefferzähler „k von n"', () => {
		const html = render({ searchTerm: 'bau', shown: 3, total: 40 });
		expect(html).toContain('3 von 40');
	});

	it('gibt den eingetippten Suchbegriff ins Feld zurück', () => {
		expect(render({ searchTerm: 'bäckerei' })).toContain('value="bäckerei"');
	});

	it('klebt beim Scrollen — am Handy wie am Desktop', () => {
		expect(render()).toContain('sticky');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});
