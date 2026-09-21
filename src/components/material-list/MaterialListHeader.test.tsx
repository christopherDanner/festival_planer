import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialListHeader, { type MaterialListHeaderProps } from './MaterialListHeader';

const noop = () => {};

const renderHeader = (props: Partial<MaterialListHeaderProps> = {}) =>
	renderToStaticMarkup(
		<MaterialListHeader
			mode="arbeitsliste"
			onModeChange={noop}
			searchTerm=""
			onSearchChange={noop}
			positionCount={76}
			onAddMaterial={noop}
			onExport={noop}
			onExportOrderList={noop}
			allRowsOpen={false}
			onToggleAllRows={noop}
			{...props}
		/>
	);

describe('MaterialListHeader — Modus-Umschalter', () => {
	it('stellt Arbeitsliste und Übernahme als die zwei Modi des Bereichs nebeneinander', () => {
		const html = renderHeader();
		expect(html).toContain('ARBEITSLISTE');
		expect(html).toContain('ÜBERNAHME');
	});

	it('markiert die Arbeitsliste als den laufenden Modus', () => {
		const html = renderHeader({ mode: 'arbeitsliste' });
		expect(html).toMatch(/aria-checked="true"[^>]*>ARBEITSLISTE/);
		expect(html).toMatch(/aria-checked="false"[^>]*>ÜBERNAHME/);
	});
});

describe('MaterialListHeader — Suche', () => {
	it('nennt im Platzhalter, wie viele Positionen durchsucht werden', () => {
		expect(renderHeader({ positionCount: 76 })).toContain('Suche in 76 Positionen');
	});

	it('gibt den eingetippten Suchbegriff ins Feld zurück', () => {
		expect(renderHeader({ searchTerm: 'metro' })).toContain('value="metro"');
	});
});

describe('MaterialListHeader — Werkzeuge', () => {
	it('behält beide Exporte und bietet „+ Position"', () => {
		const html = renderHeader();
		expect(html).toContain('MATERIALLISTE');
		expect(html).toContain('BESTELLLISTE');
		expect(html).toContain('+ POSITION');
	});

	it('trägt keine Filter-Auswahl mehr — die Achse ersetzt sie', () => {
		const html = renderHeader();
		expect(html).not.toContain('Alle Stationen');
		expect(html).not.toContain('Alle Lieferanten');
		expect(html).not.toContain('Alle Kategorien');
	});

	it('bleibt ohne runde Ecken', () => {
		expect(renderHeader()).not.toContain('rounded');
	});
});

describe('MaterialListHeader — Schalter „Alle Zeilen bearbeiten" (#115)', () => {
	it('bietet den Schalter an, der alle Zeilen der Gruppe auf einmal öffnet', () => {
		// Fürs Nachtragen der Verbraucht-Mengen nach dem Fest (CONTEXT.md),
		// real 76 Positionen — 76× ✎ wäre kein Weg.
		expect(renderHeader()).toContain('ALLE ZEILEN');
	});

	it('zeigt am Schalter, ob die Zeilen gerade offen sind', () => {
		expect(renderHeader({ allRowsOpen: false })).toContain('aria-pressed="false"');
		expect(renderHeader({ allRowsOpen: true })).toContain('aria-pressed="true"');
	});
});
