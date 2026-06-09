import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// Controllable auth state for the route guard.
let authState: { user: unknown; loading: boolean };

vi.mock('@/components/AuthProvider', () => ({
	useAuth: () => authState
}));

// Stub Navigate so the redirect target is observable in static markup
// (the real Navigate performs its effect only on the client).
vi.mock('react-router-dom', () => ({
	Navigate: ({ to }: { to: string }) => <span>REDIRECT:{to}</span>
}));

import { ProtectedRoute } from './ProtectedRoute';

const render = () =>
	renderToStaticMarkup(
		<ProtectedRoute>
			<div>PROTECTED-CONTENT</div>
		</ProtectedRoute>
	);

describe('ProtectedRoute', () => {
	beforeEach(() => {
		authState = { user: null, loading: false };
	});

	it('rendert die geschützten Inhalte für einen angemeldeten Benutzer', () => {
		authState = { user: { id: 'u1' }, loading: false };
		const html = render();
		expect(html).toContain('PROTECTED-CONTENT');
		expect(html).not.toContain('REDIRECT:');
	});

	it('leitet einen nicht angemeldeten Benutzer auf /auth weiter', () => {
		authState = { user: null, loading: false };
		const html = render();
		expect(html).not.toContain('PROTECTED-CONTENT');
		expect(html).toContain('REDIRECT:/auth');
	});

	it('leitet nicht weiter, solange die Sitzung noch geladen wird', () => {
		authState = { user: null, loading: true };
		const html = render();
		expect(html).not.toContain('REDIRECT:');
		expect(html).not.toContain('PROTECTED-CONTENT');
	});
});
