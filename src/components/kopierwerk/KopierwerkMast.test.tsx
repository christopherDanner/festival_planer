import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import KopierwerkMast from './KopierwerkMast';

const noop = () => {};

const render = (props: { templateName?: string; compact?: boolean } = {}) =>
	renderToStaticMarkup(
		<KopierwerkMast onCancel={noop} onOpenFestivalList={noop} compact={false} {...props} />
	);

describe('KopierwerkMast', () => {
	it('trägt den Titel des Kopierwerks und den Abbrechen-Weg zur Wand', () => {
		const html = render();
		expect(html).toContain('Neues Fest anlegen');
		expect(html).toContain('ABBRECHEN ×');
	});

	it('nennt die Vorlage in der Zeitzeile', () => {
		expect(render({ templateName: 'Musikfest Steinbach 2026' })).toContain(
			'Musikfest Steinbach 2026'
		);
	});

	it('lässt die Vorlagen-Zeile weg, wenn ohne Vorlage angelegt wird', () => {
		expect(render()).not.toContain('Vorlage:');
	});

	it('macht die Wortmarke zum Zurück-Weg auf die Festliste', () => {
		expect(render()).toContain('title="Zur Festliste"');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render()).not.toMatch(/rounded-/);
		expect(render({ compact: true })).not.toMatch(/rounded-/);
	});
});
