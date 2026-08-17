import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialModeBar, { type MaterialModeBarProps } from './MaterialModeBar';

const noop = () => {};

const renderBar = (props: Partial<MaterialModeBarProps> = {}) =>
	renderToStaticMarkup(
		<MaterialModeBar
			mode="arbeitsliste"
			onModeChange={noop}
			searchTerm=""
			onSearchChange={noop}
			searchPlaceholder="Suche in 76 Positionen …"
			searchLabel="Material suchen"
			{...props}
		/>
	);

describe('MaterialModeBar — der Umschalter zwischen den zwei Modi', () => {
	it('stellt Arbeitsliste und Übernahme nebeneinander', () => {
		const html = renderBar();

		expect(html).toContain('ARBEITSLISTE');
		expect(html).toContain('ÜBERNAHME');
	});

	it('markiert den laufenden Modus — aus der Arbeitsliste heraus', () => {
		const html = renderBar({ mode: 'arbeitsliste' });

		expect(html).toMatch(/aria-checked="true"[^>]*>ARBEITSLISTE/);
		expect(html).toMatch(/aria-checked="false"[^>]*>ÜBERNAHME/);
	});

	it('markiert den laufenden Modus — aus der Übernahme heraus', () => {
		const html = renderBar({ mode: 'uebernahme' });

		expect(html).toMatch(/aria-checked="true"[^>]*>ÜBERNAHME/);
		expect(html).toMatch(/aria-checked="false"[^>]*>ARBEITSLISTE/);
	});
});

describe('MaterialModeBar — Suche und Werkzeuge', () => {
	it('trägt Platzhalter und eingetippten Begriff der Suche', () => {
		const html = renderBar({ searchTerm: 'metro', searchPlaceholder: 'Suche in 12 Positionen …' });

		expect(html).toContain('Suche in 12 Positionen …');
		expect(html).toContain('value="metro"');
	});

	it('zeigt die Werkzeuge des jeweiligen Modus rechts', () => {
		expect(renderBar({ children: <button type="button">+ POSITION</button> })).toContain(
			'+ POSITION'
		);
	});

	it('bleibt ohne runde Ecken', () => {
		expect(renderBar()).not.toContain('rounded');
	});
});
