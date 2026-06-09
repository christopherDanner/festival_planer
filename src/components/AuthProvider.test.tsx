import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

const { signInWithPassword, getState } = vi.hoisted(() => {
	const spy = vi.fn(() => Promise.resolve({ error: null }));
	const state = { sessionResult: { data: { session: null as unknown } } };
	return { signInWithPassword: spy, getState: () => state };
});

vi.mock('@/integrations/supabase/client', () => ({
	supabase: {
		auth: {
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
			getSession: () => Promise.resolve(getState().sessionResult),
			signInWithPassword
		}
	}
}));

import { AuthProvider, useAuth } from './AuthProvider';

function Probe() {
	const { user, loading } = useAuth();
	return <span>{`user:${user ? 'yes' : 'no'};loading:${loading ? 'yes' : 'no'}`}</span>;
}

async function mount() {
	const container = document.createElement('div');
	await act(async () => {
		createRoot(container).render(
			<AuthProvider>
				<Probe />
			</AuthProvider>
		);
	});
	return container;
}

describe('AuthProvider', () => {
	beforeEach(() => {
		signInWithPassword.mockClear();
		getState().sessionResult = { data: { session: null } };
	});

	it('meldet ohne Session keinen hartkodierten Account automatisch an', async () => {
		const container = await mount();
		expect(signInWithPassword).not.toHaveBeenCalled();
		expect(container.textContent).toContain('user:no');
		expect(container.textContent).toContain('loading:no');
	});
});
