import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/* Seam dieses Tests (aus den Abnahmekriterien von #161 abgeleitet):
   Die Route /auth — was beim Absenden passiert (Prüfung am Feld, Fehler-Toast,
   Erfolg führt auf /dashboard, kein Erfolgs-Toast) und dass die Seite den
   Anmeldezettel trägt. Die Optik des Zettels prüft Anmeldezettel.test.tsx. */

// React 18 erwartet die Flagge, sonst warnt jedes act(...) in der Konsole.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { signIn, toast } = vi.hoisted(() => ({
	signIn: vi.fn(() => Promise.resolve({ error: null as { message: string } | null })),
	toast: vi.fn()
}));

vi.mock('@/components/AuthProvider', () => ({
	useAuth: () => ({ signIn, user: null, loading: false })
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

import Auth from './Auth';

const render = () =>
	renderToStaticMarkup(
		<MemoryRouter>
			<Auth />
		</MemoryRouter>
	);

const mount = async () => {
	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<MemoryRouter initialEntries={['/auth']}>
				<Routes>
					<Route path="/auth" element={<Auth />} />
					<Route path="/dashboard" element={<span>Dashboard steht</span>} />
				</Routes>
			</MemoryRouter>
		);
	});
	return container;
};

/** Tippen wie ein Mensch: React hört auf `input`, merkt sich aber den Wert —
 * darum über den nativen Setter, sonst verschluckt es die Änderung. */
const nativeValueSetter = Object.getOwnPropertyDescriptor(
	HTMLInputElement.prototype,
	'value'
)?.set;

const tippen = async (input: HTMLInputElement | null, wert: string) => {
	if (!input || !nativeValueSetter) throw new Error('Feld fehlt');
	await act(async () => {
		nativeValueSetter.call(input, wert);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

const absenden = async (container: HTMLElement) => {
	await act(async () => {
		container
			.querySelector('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	});
};

const anmelden = async (container: HTMLElement) => {
	await tippen(container.querySelector('input[type="email"]'), 'obmann@musikverein.at');
	await tippen(container.querySelector('input[type="password"]'), 'geheim');
	await absenden(container);
};

describe('Auth-Seite', () => {
	beforeEach(() => {
		signIn.mockClear();
		signIn.mockResolvedValue({ error: null });
		toast.mockClear();
	});

	it('zeigt das Login-Formular', () => {
		const html = render();
		expect(html).toContain('Anmelden');
	});

	it('bietet keine Selbstregistrierung an', () => {
		const html = render();
		expect(html).not.toContain('Registrieren');
		expect(html).not.toContain('signup');
	});

	it('zeigt den Anmeldezettel und nennt die Marke Festmeister', () => {
		const html = render();
		expect(html).toContain('FESTMEISTER');
		expect(html).not.toContain('Fest-Planer');
	});

	it('beanstandet fehlende Eingaben am Feld statt im Toast', async () => {
		const container = await mount();
		await absenden(container);

		expect(container.textContent).toContain('Bitte Email und Passwort eingeben.');
		expect(toast).not.toHaveBeenCalled();
		expect(signIn).not.toHaveBeenCalled();
	});

	it('meldet mit Email und Passwort an und führt auf das Dashboard', async () => {
		const container = await mount();
		await anmelden(container);

		expect(signIn).toHaveBeenCalledWith('obmann@musikverein.at', 'geheim');
		expect(container.textContent).toContain('Dashboard steht');
	});

	it('bleibt beim Erfolg stumm — kein Erfolgs-Toast', async () => {
		const container = await mount();
		await anmelden(container);

		expect(toast).not.toHaveBeenCalled();
	});

	it('erklärt den Fehlerfall im Toast und bleibt auf der Seite', async () => {
		signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
		const container = await mount();
		await anmelden(container);

		expect(toast).toHaveBeenCalledTimes(1);
		expect(toast.mock.calls[0][0]).toMatchObject({
			title: 'Anmeldung fehlgeschlagen',
			description: 'Invalid login credentials',
			variant: 'destructive'
		});
		expect(container.textContent).not.toContain('Dashboard steht');
	});
});
