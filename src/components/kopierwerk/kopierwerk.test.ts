import { describe, expect, it } from 'vitest';

import {
	draftToFestivalData,
	emptyFestivalDraft,
	isDraftReady,
	kopierwerkSteps,
	stampCardHeading,
	stepSubmitLabel
} from './kopierwerk';

const draft = (over: Partial<ReturnType<typeof emptyFestivalDraft>> = {}) => ({
	...emptyFestivalDraft(),
	...over
});

describe('Kopierwerk-Entwurf', () => {
	// Der Ort ist der Grund, warum Schritt 1 ihn überhaupt trägt: `createFestival`
	// bekam bisher `location: ''`, ein neues Fest startete also immer ortlos (#64).
	it('trägt Name, Zeitraum und Ort ans Fest', () => {
		expect(
			draftToFestivalData(
				draft({
					name: 'Musikfest Steinbach 2027',
					startDate: '2027-07-23',
					endDate: '2027-07-25',
					location: 'Festwiese Steinbach'
				})
			)
		).toEqual({
			name: 'Musikfest Steinbach 2027',
			startDate: '2027-07-23',
			endDate: '2027-07-25',
			location: 'Festwiese Steinbach'
		});
	});

	it('putzt die Ränder der Eingaben weg', () => {
		expect(
			draftToFestivalData(draft({ name: '  Stadlfest  ', startDate: '2027-09-05', location: ' Hof ' }))
		).toMatchObject({ name: 'Stadlfest', location: 'Hof' });
	});

	it('lässt ein Enddatum weg, das fehlt oder auf den Starttag fällt', () => {
		expect(draftToFestivalData(draft({ name: 'Kirtag', startDate: '2027-09-05' })).endDate).toBeUndefined();
		expect(
			draftToFestivalData(draft({ name: 'Kirtag', startDate: '2027-09-05', endDate: '2027-09-05' }))
				.endDate
		).toBeUndefined();
	});

	it('ist erst mit Name und Startdatum vollständig', () => {
		expect(isDraftReady(draft())).toBe(false);
		expect(isDraftReady(draft({ name: 'Kirtag' }))).toBe(false);
		expect(isDraftReady(draft({ startDate: '2027-09-05' }))).toBe(false);
		expect(isDraftReady(draft({ name: '   ', startDate: '2027-09-05' }))).toBe(false);
		expect(isDraftReady(draft({ name: 'Kirtag', startDate: '2027-09-05' }))).toBe(true);
	});

	it('startet leer, aber mit der Vorlage aus dem Deep-Link', () => {
		expect(emptyFestivalDraft()).toMatchObject({ name: '', startDate: '', endDate: '', location: '', templateId: '' });
		expect(emptyFestivalDraft('fest-2026').templateId).toBe('fest-2026');
	});
});

describe('Stempelkarte — Schritt-Liste', () => {
	const scope = { stations: 4, shifts: 11, materials: 86 };

	it('zeigt ohne Vorlage nur Schritt 1', () => {
		const steps = kopierwerkSteps({ current: 'basics', hasTemplate: false });
		expect(steps.map((s) => s.key)).toEqual(['basics']);
		expect(steps[0].state).toBe('active');
	});

	it('zeigt mit Vorlage die drei Schritte in ihrer Reihenfolge', () => {
		const steps = kopierwerkSteps({ current: 'basics', hasTemplate: true, scope });
		expect(steps.map((s) => s.key)).toEqual(['basics', 'stations', 'materials']);
		expect(steps.map((s) => s.number)).toEqual([1, 2, 3]);
		expect(steps.map((s) => s.title)).toEqual(['Name & Datum', 'Stationen & Schichten', 'Material']);
	});

	it('stempelt erledigt / aktiv / offen entlang des aktuellen Schritts', () => {
		const steps = kopierwerkSteps({ current: 'stations', hasTemplate: true, scope });
		expect(steps.map((s) => s.state)).toEqual(['done', 'active', 'open']);
	});

	it('beziffert die Schritte in ihrer Untertitel-Zeile', () => {
		const steps = kopierwerkSteps({
			current: 'stations',
			hasTemplate: true,
			scope,
			festivalName: 'Musikfest Steinbach 2027'
		});
		expect(steps.map((s) => s.subtitle)).toEqual([
			'Musikfest Steinbach 2027',
			'4 Stationen · 11 Schichten',
			'86 Positionen · Mengenquelle'
		]);
	});

	it('beugt die Zahlen der Untertitel-Zeile', () => {
		const steps = kopierwerkSteps({
			current: 'basics',
			hasTemplate: true,
			scope: { stations: 1, shifts: 1, materials: 1 }
		});
		expect(steps[1].subtitle).toBe('1 Station · 1 Schicht');
		expect(steps[2].subtitle).toBe('1 Position · Mengenquelle');
	});

	it('lässt die Untertitel weg, solange die Vorlage noch lädt', () => {
		const steps = kopierwerkSteps({ current: 'basics', hasTemplate: true });
		expect(steps.map((s) => s.subtitle)).toEqual([undefined, undefined, undefined]);
	});

	it('trägt eine Kurzform für die waagrechte Schritt-Leiste', () => {
		const steps = kopierwerkSteps({ current: 'basics', hasTemplate: true, scope });
		expect(steps.map((s) => s.shortTitle)).toEqual(['Name & Datum', 'Stationen', 'Material']);
	});

	// Fällt die Vorlage weg, während Schritt 2 offen ist, bleibt nur Schritt 1 —
	// und der ist dann der aktive, nicht ein Schritt ohne Zustand.
	it('rückt den aktiven Schritt nach, wenn der aktuelle nicht mehr sichtbar ist', () => {
		const steps = kopierwerkSteps({ current: 'materials', hasTemplate: false });
		expect(steps.map((s) => s.state)).toEqual(['active']);
	});
});

describe('Stempelkarte — Kartenkopf', () => {
	it('trägt den geplanten Festnamen, den Zeitraum und die Vorlage', () => {
		expect(
			stampCardHeading(
				draft({ name: 'Musikfest 2027', startDate: '2027-07-23', endDate: '2027-07-25' }),
				'Musikfest Steinbach 2026'
			)
		).toEqual({
			title: 'Musikfest 2027',
			sub: 'Fr 23. – So 25. Juli 2027 · aus Vorlage Musikfest Steinbach 2026'
		});
	});

	it('lässt die Vorlagen-Angabe ohne Vorlage weg', () => {
		expect(stampCardHeading(draft({ name: 'Kirtag', startDate: '2027-09-05' })).sub).toBe(
			'So 5. September 2027'
		);
	});

	it('hält den Platz des Festnamens frei, solange keiner eingetragen ist', () => {
		expect(stampCardHeading(draft())).toEqual({ title: 'Neues Fest', sub: '' });
	});
});

describe('Fußzeile von Schritt 1', () => {
	it('legt ohne Vorlage direkt an, mit Vorlage führt sie weiter zu den Stationen', () => {
		expect(stepSubmitLabel(false)).toBe('FEST ANLEGEN');
		expect(stepSubmitLabel(true)).toBe('WEITER: STATIONEN →');
	});
});
