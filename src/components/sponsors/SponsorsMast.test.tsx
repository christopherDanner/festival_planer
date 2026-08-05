import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorsMast, { type SponsorsMastProps } from './SponsorsMast';

const noop = () => {};

const render = (props: Partial<SponsorsMastProps> = {}) =>
	renderToStaticMarkup(
		<SponsorsMast
			sponsorCount={40}
			onOpenFestivalList={noop}
			onAddSponsor={noop}
			onSignOut={noop}
			{...props}
		/>
	);

describe('SponsorsMast', () => {
	it('trägt den Titel „Sponsoren" und die Zählzeile des Sponsorenbestands', () => {
		const html = render();
		expect(html).toContain('Sponsoren');
		expect(html).toContain('40 Firmen');
	});

	it('zählt eine einzelne Firma im Singular', () => {
		const html = render({ sponsorCount: 1 });
		expect(html).toContain('1 Firma');
		expect(html).not.toContain('1 Firmen');
	});

	it('lässt die Zählzeile weg, solange der Bestand lädt', () => {
		const html = render({ sponsorCount: null });
		expect(html).toContain('Sponsoren');
		expect(html).not.toContain('Firmen');
		expect(html).not.toContain('Firma');
	});

	it('bietet den Wordmark als Zurück-Weg zur Festliste statt eines ←-Knopfs', () => {
		const html = render();
		expect(html).toContain('FESTMEISTER');
		expect(html).toContain('Zur Festliste');
	});

	it('zeigt am Desktop „+ FIRMA" und „Abmelden" offen', () => {
		const html = render();
		expect(html).toContain('+ FIRMA');
		expect(html).toContain('Abmelden');
		expect(html).not.toContain('Menü');
	});

	it('schiebt unter 900px „Abmelden" ins ⋮, „+ FIRMA" bleibt sichtbar', () => {
		const html = render({ compact: true });
		expect(html).toContain('+ FIRMA');
		expect(html).toContain('Menü');
		expect(html).not.toContain('Abmelden');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});
