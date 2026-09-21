import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import Anmeldezettel, { type AnmeldezettelProps } from './Anmeldezettel';

/* Seam dieses Tests (aus den Abnahmekriterien von #161 abgeleitet):
   Anmeldezettel ist der reine Zettel — Optik, Felder, Ladezustand,
   Feldfehler und das Absenden des Formulars. Kein Supabase, kein Toast,
   kein Routing; das liegt im Auth-Seiten-Seam (Auth.test.tsx). */

// React 18 erwartet die Flagge, sonst warnt jedes act(...) in der Konsole.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};

const props = (over: Partial<AnmeldezettelProps> = {}): AnmeldezettelProps => ({
	email: '',
	password: '',
	loading: false,
	fieldError: null,
	onEmailChange: noop,
	onPasswordChange: noop,
	onSubmit: noop,
	...over
});

const render = (over: Partial<AnmeldezettelProps> = {}) =>
	renderToStaticMarkup(<Anmeldezettel {...props(over)} />);

const mount = async (over: Partial<AnmeldezettelProps> = {}) => {
	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(<Anmeldezettel {...props(over)} />);
	});
	return container;
};

describe('Anmeldezettel', () => {
	it('meldet über ein Formular an — damit Enter im Feld absendet', async () => {
		const onSubmit = vi.fn();
		const container = await mount({ onSubmit });
		const form = container.querySelector('form');
		const button = container.querySelector('button');

		expect(form).not.toBeNull();
		expect(button?.getAttribute('type')).toBe('submit');

		await act(async () => {
			form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		});
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('führt Email und Passwort mit den Autofill-Rollen des Anmeldens', async () => {
		const container = await mount({ email: 'obmann@musikverein.at', password: 'geheim' });
		const email = container.querySelector<HTMLInputElement>('input[type="email"]');
		const passwort = container.querySelector<HTMLInputElement>('input[type="password"]');

		expect(email?.getAttribute('autocomplete')).toBe('username');
		expect(passwort?.getAttribute('autocomplete')).toBe('current-password');
		expect(email?.value).toBe('obmann@musikverein.at');
		expect(passwort?.value).toBe('geheim');
	});

	it('sperrt den Knopf im Ladezustand und sagt „Anmelden …"', () => {
		const html = render({ loading: true });
		expect(html).toContain('Anmelden …');
		expect(html).toContain('disabled');
	});

	it('nennt in der Fußnote nur Wege, die es gibt', () => {
		const html = render();
		expect(html).toContain('Zugänge legt die Festleitung an.');
		expect(html).toContain('Bei der Festleitung melden.');
		expect(html).not.toContain('zurücksetzen');
		expect(html).not.toContain('Registrieren');
	});

	it('trägt den Kopf des Zettels: Wordmark und ANMELDEN, ohne Klickweg', async () => {
		const html = render();
		expect(html).toContain('FESTMEISTER');
		// Es gibt kein Davor — der Wordmark ist kein Knopf und kein Link.
		const container = await mount();
		const wordmark = [...container.querySelectorAll('button, a')].find((el) =>
			el.textContent?.includes('FESTMEISTER')
		);
		expect(wordmark).toBeUndefined();
	});

	it('bleibt Plakat: harter Versatz-Schatten, keine runden Ecken, keine Card', () => {
		const html = render();
		expect(html).toContain('shadow-versatz');
		expect(html).not.toContain('rounded');
		expect(html).not.toContain('shadow-sm');
	});

	it('zeigt die Validierungsmeldung am Feld, nicht irgendwo', async () => {
		const meldung = 'Bitte Email und Passwort eingeben.';
		const container = await mount({ fieldError: meldung });
		const email = container.querySelector('input[type="email"]');
		const described = email?.getAttribute('aria-describedby');

		expect(described).toBeTruthy();
		expect(container.querySelector(`#${described}`)?.textContent).toBe(meldung);
		expect(email?.getAttribute('aria-invalid')).toBe('true');
	});

	it('lässt die Felder ohne Fehler unbeanstandet', async () => {
		const container = await mount();
		const email = container.querySelector('input[type="email"]');
		expect(email?.getAttribute('aria-invalid')).not.toBe('true');
	});

	it('beanstandet nur das leere Feld, nicht das gefüllte', async () => {
		const container = await mount({
			email: 'obmann@musikverein.at',
			fieldError: 'Bitte Email und Passwort eingeben.'
		});
		const email = container.querySelector('input[type="email"]');
		const passwort = container.querySelector('input[type="password"]');

		expect(email?.getAttribute('aria-invalid')).not.toBe('true');
		expect(email?.getAttribute('aria-describedby')).toBeNull();
		expect(passwort?.getAttribute('aria-invalid')).toBe('true');
	});
});
