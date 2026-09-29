import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import ScheduleStep, { type ScheduleStepProps } from './ScheduleStep';
import type { SchedulePreviewRow } from './scheduleChoice';

const aufbau: SchedulePreviewRow = {
	id: 'd-aufbau',
	when: 'Do 23.07.2026',
	newWhen: 'Do 22.07.2027',
	label: 'Aufbau',
	meta: '2 Phasen · 2 Aufgaben · 1 Programmpunkt'
};

const samstag: SchedulePreviewRow = {
	id: 'd-samstag',
	when: 'Sa 25.07.2026',
	newWhen: 'Sa 24.07.2027',
	label: '',
	meta: 'ohne Einträge'
};

const render = (over: Partial<ScheduleStepProps> = {}) =>
	renderToStaticMarkup(
		<ScheduleStep
			rows={[aufbau, samstag]}
			copySchedule
			copyHelpers={false}
			onCopyScheduleChange={() => {}}
			onBack={() => {}}
			onNext={() => {}}
			{...over}
		/>
	);

/** Das Element mit dieser id aus dem Markup — Radix reicht die id an den Knopf durch. */
const tagWithId = (html: string, id: string) =>
	html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] ?? '';

describe('Kopfzeile der Werkbank', () => {
	it('nennt den Schritt und den Merksatz', () => {
		const html = render();
		expect(html).toContain('Ablaufplan');
		// Kein Versprechen auf den Wochentag: der Versatz hält den Abstand zum
		// Fest-Start. Bei abweichendem Start-Wochentag rückt er mit, und die
		// Tages-Zeilen nennen den neuen Wochentag.
		expect(html).toContain('jeder Tag behält seinen Abstand zum Fest-Start');
		expect(html).not.toContain('bleibt ein Donnerstag');
	});
});

describe('Tages-Zeilen', () => {
	it('stellt jedem alten Termin den neuen gegenüber, mit Pfeil', () => {
		const html = render();
		expect(html).toContain('Do 23.07.2026');
		expect(html).toContain('→');
		expect(html).toContain('Do 22.07.2027');
		expect(html).toContain('Sa 24.07.2027');
	});

	it('zeigt Label und Kurzangaben des Tages', () => {
		const html = render();
		expect(html).toContain('Aufbau');
		expect(html).toContain('2 Phasen · 2 Aufgaben · 1 Programmpunkt');
		expect(html).toContain('ohne Einträge');
	});

	// Ein Schalter für den ganzen Plan (#127): der Wert liegt in der
	// Vollständigkeit der Liste, ausgemistet wird danach im Bereich.
	it('gibt den Tagen keine eigene Auswahl', () => {
		const html = render();
		expect(html.match(/role="checkbox"/g)).toHaveLength(1);
	});

	// In Schritt 2 klappt man auf, weil die Station wählbar ist und die Schichten
	// ihre Termine erst drinnen zeigen. Hier steht der Termin schon in der Zeile.
	it('klappt nichts auf — die Zeile sagt schon alles', () => {
		expect(render()).not.toContain('AUFKLAPPEN');
	});
});

describe('„Ablaufplan übernehmen"', () => {
	it('nennt den Schalter und was er holt', () => {
		const html = render();
		expect(html).toContain('Ablaufplan übernehmen');
		expect(html).toContain('Tage, Phasen und Einträge');
	});

	it('steht auf gewählt, wenn der Plan mitkommt', () => {
		expect(tagWithId(render(), 'ablaufplan-uebernehmen')).toContain('data-state="checked"');
		expect(tagWithId(render({ copySchedule: false }), 'ablaufplan-uebernehmen')).toContain(
			'data-state="unchecked"'
		);
	});

	// Der Haken des Vorjahrs ist wertlos — die Oberfläche sagt das, bevor jemand
	// eine fertig abgehakte Liste erwartet.
	it('verspricht die Aufgaben als offen', () => {
		expect(render()).toContain('Aufgaben kommen offen herein');
	});

	// Ein Helfer gehört dem Fest (ADR 0005): ohne kopierte Helferliste gibt es im
	// Zielfest keine Zeile, auf die ein Verantwortlicher zeigen könnte.
	it('erklärt am Schalter, dass die Verantwortlichen ohne Schritt 2 leer bleiben', () => {
		expect(render({ copyHelpers: false })).toContain(
			'Die Verantwortlichen bleiben leer — dafür müssten in Schritt 2 die Helfer mitkommen.'
		);
	});

	it('verspricht sie mit übernommenen Helfern', () => {
		const html = render({ copyHelpers: true });
		expect(html).toContain('Die Verantwortlichen wandern auf die übernommenen Helfer mit.');
		expect(html).not.toContain('dafür müssten in Schritt 2');
	});
});

describe('Vorlage ohne Ablaufplan', () => {
	it('sagt es und lässt den Schritt trotzdem weiterführen', () => {
		const html = render({ rows: [] });
		expect(html).toContain('KEIN ABLAUFPLAN');
		expect(html).toContain('WEITER: SPONSORING →');
	});

	// Ohne Tage gibt es nichts zu übernehmen — ein Schalter wäre ohne Wirkung.
	it('zeigt keinen Schalter', () => {
		expect(render({ rows: [] })).not.toContain('Ablaufplan übernehmen');
	});
});

describe('Fußzeile', () => {
	// Angelegt wird seit #146 im Sponsoring-Schritt dahinter; der Ablaufplan
	// führt weiter.
	it('führt zurück zum Material und weiter zum Sponsoring', () => {
		const html = render();
		expect(html).toContain('← Material');
		expect(html).toContain('WEITER: SPONSORING →');
		expect(html).not.toContain('FEST ANLEGEN');
	});
});

describe('Handschrift', () => {
	it('lässt die Zeile unter 900px umbrechen statt abschneiden', () => {
		const html = render();
		expect(html).toContain('flex-wrap');
		expect(html).not.toContain('truncate');
	});

	it('setzt die Termine in die Akzentschrift', () => {
		expect(render()).toContain('font-display');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render()).not.toMatch(/rounded-/);
	});
});
