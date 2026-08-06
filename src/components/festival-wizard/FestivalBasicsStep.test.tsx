import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Festival } from '@/lib/festivalService';
import FestivalBasicsStep from './FestivalBasicsStep';
import { emptyFestivalDraft, type FestivalDraft } from './kopierwerk';

const templates: Festival[] = [
	{
		id: 'fest-2026',
		user_id: 'u1',
		name: 'Musikfest Steinbach 2026',
		start_date: '2026-07-24',
		created_at: '',
		updated_at: ''
	}
];

const render = (draft: FestivalDraft, over: { saving?: boolean; loadingTemplate?: boolean } = {}) =>
	renderToStaticMarkup(
		<FestivalBasicsStep
			draft={draft}
			templates={templates}
			saving={false}
			loadingTemplate={false}
			onChange={() => {}}
			onSubmit={() => {}}
			{...over}
		/>
	);

const filled = (over: Partial<FestivalDraft> = {}): FestivalDraft => ({
	...emptyFestivalDraft(),
	name: 'Musikfest Steinbach 2027',
	startDate: '2027-07-23',
	...over
});

describe('Schritt 1 „Name & Datum"', () => {
	it('trägt Name, Start, Ende, Ort und das Vorlage-Feld', () => {
		const html = render(emptyFestivalDraft());
		expect(html).toContain('Festname');
		expect(html).toContain('Startdatum');
		expect(html).toContain('Enddatum');
		expect(html).toContain('Ort');
		expect(html).toContain('Vorlage');
		expect(html.match(/type="date"/g)).toHaveLength(2);
	});

	it('nennt das leere Vorlage-Feld „Keine Vorlage"', () => {
		expect(render(emptyFestivalDraft())).toContain('Keine Vorlage');
	});

	it('legt ohne Vorlage direkt an', () => {
		expect(render(filled())).toContain('FEST ANLEGEN');
	});

	it('führt mit Vorlage weiter zu den Stationen', () => {
		expect(render(filled({ templateId: 'fest-2026' }))).toContain('WEITER: STATIONEN →');
	});

	// `disabled=""` ist das Attribut; die Tailwind-Klassen `disabled:…` stehen
	// ohnehin im Markup und würden ein blankes „disabled" immer erfüllen.
	it('sperrt den Knopf, solange Name oder Startdatum fehlen', () => {
		expect(render(emptyFestivalDraft())).toContain('disabled=""');
		expect(render(filled())).not.toContain('disabled=""');
	});

	it('sperrt den Knopf, während die Vorlage lädt oder das Fest entsteht', () => {
		expect(render(filled({ templateId: 'fest-2026' }), { loadingTemplate: true })).toContain(
			'disabled=""'
		);
		expect(render(filled(), { saving: true })).toContain('disabled=""');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render(filled())).not.toMatch(/rounded-/);
	});
});
