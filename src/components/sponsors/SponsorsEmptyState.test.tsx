import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorsEmptyState from './SponsorsEmptyState';

const render = () => renderToStaticMarkup(<SponsorsEmptyState onAddSponsor={() => {}} />);

describe('SponsorsEmptyState', () => {
	it('stempelt „NOCH KEINE FIRMA" in Rot auf gestrichelten Rahmen', () => {
		const html = render();
		expect(html).toContain('NOCH KEINE FIRMA');
		expect(html).toContain('border-dashed');
		expect(html).toContain('text-rot');
	});

	it('erklärt den Bestand in einem Satz und bietet den gelben Anlege-Knopf', () => {
		const html = render();
		expect(html).toContain('jedem Fest zur Verfügung');
		expect(html).toContain('+ ERSTE FIRMA ANLEGEN');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(render()).not.toContain('rounded');
	});
});
