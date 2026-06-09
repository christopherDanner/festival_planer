import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/AuthProvider', () => ({
	useAuth: () => ({ signIn: vi.fn(), user: null, loading: false })
}));

import Auth from './Auth';

const render = () =>
	renderToStaticMarkup(
		<MemoryRouter>
			<Auth />
		</MemoryRouter>
	);

describe('Auth-Seite', () => {
	it('zeigt das Login-Formular', () => {
		const html = render();
		expect(html).toContain('Anmelden');
	});

	it('bietet keine Selbstregistrierung an', () => {
		const html = render();
		expect(html).not.toContain('Registrieren');
		expect(html).not.toContain('signup');
	});
});
