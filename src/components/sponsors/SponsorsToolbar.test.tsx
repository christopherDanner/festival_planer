import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorsToolbar, { type SponsorsToolbarProps } from './SponsorsToolbar';

const noop = () => {};

const render = (props: Partial<SponsorsToolbarProps> = {}) =>
	renderToStaticMarkup(
		<SponsorsToolbar
			searchTerm=""
			onSearchChange={noop}
			shown={40}
			total={40}
			segment="alle"
			onSegmentChange={noop}
			segmentCounts={{ alle: 40, sponsert: 12, 'nicht-gefragt': 28 }}
			referenceYear={2026}
			{...props}
		/>
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

	it('stellt die drei Segmente mit dem Jahr des Bezugsfests auf', () => {
		const html = render();
		expect(html).toContain('ALLE');
		expect(html).toContain('SPONSERT 2026');
		expect(html).toContain('HEUER NOCH NICHT GEFRAGT');
	});

	it('trägt an jedem Segment seinen Zähler', () => {
		const html = render();
		expect(html).toContain('40');
		expect(html).toContain('12');
		expect(html).toContain('28');
	});

	it('lässt ohne Bezugsfest den ganzen Schalter weg statt leerer Segmente', () => {
		const html = render({ referenceYear: null });
		expect(html).not.toContain('SPONSERT');
		expect(html).not.toContain('GEFRAGT');
		expect(html).not.toContain('undefined');
		// Der Trefferzähler bleibt — er ist die Firmenzahl, nicht der Filter.
		expect(html).toContain('40 von 40');
	});

	it('sagt beim Trefferzähler, worauf er sich bezieht (ADR 0006)', () => {
		expect(render({ segment: 'sponsert', shown: 12 })).toContain('sponsern 2026');
		expect(render({ segment: 'nicht-gefragt', shown: 28 })).toContain(
			'heuer noch nicht gefragt'
		);
	});

	it('beschriftet den Trefferzähler bei ALLE nicht — es gibt nichts einzuschränken', () => {
		const html = render();
		expect(html).toContain('40 von 40');
		expect(html).not.toContain('sponsern 2026');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});
