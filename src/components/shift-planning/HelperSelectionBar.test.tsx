import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import HelperSelectionBar from './HelperSelectionBar';
import type { Helper } from '@/lib/helperService';

/**
 * Der **Auswahl-Streifen** am Handy (#105, Variante B des Prototyps
 * `entscheid-schichtplan-mobil.html`): solange ein Helfer gewählt ist, klebt er
 * oben unter dem Kompakt-Mast und sagt, was als Nächstes zu tun ist.
 *
 * Er ist am Handy die **einzige** Anzeige der Auswahl — die gelbe Marke steht in
 * der zugeschobenen Schublade. Darum sind „bleibt beim Scrollen stehen" und
 * „trägt Abbrechen" hier keine Optik, sondern die Spec (#105, Fertig-wenn).
 */

function helper(over: Partial<Helper> = {}): Helper {
	return {
		id: 'h1',
		festival_id: 'f1',
		first_name: 'Franz',
		last_name: 'Hochauer',
		station_preferences: [],
		shift_preferences: [],
		created_at: '',
		updated_at: '',
		...over
	};
}

const render = (selected: Helper | null) =>
	renderToStaticMarkup(<HelperSelectionBar helper={selected} onCancel={() => {}} />);

describe('HelperSelectionBar — was er sagt', () => {
	it('nennt den gewählten Helfer und den nächsten Griff', () => {
		expect(render(helper())).toContain('Hochauer Franz — freien Platz antippen');
	});

	it('steht gar nicht da, solange niemand gewählt ist', () => {
		expect(render(null)).toBe('');
	});
});

describe('HelperSelectionBar — wo er steht', () => {
	it('bleibt beim Scrollen oben stehen (#105, Fertig-wenn)', () => {
		expect(render(helper())).toMatch(/class="[^"]*sticky top-0/);
	});

	it('trägt gelbe Fläche und 2.5px Tinte-Unterkante', () => {
		const html = render(helper());

		expect(html).toContain('bg-gelb');
		expect(html).toContain('border-b-2.5');
		expect(html).toContain('border-tinte');
	});
});

describe('HelperSelectionBar — Abbrechen', () => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('bietet einen Knopf mit einem Tippziel von mindestens 40px (Vision §6)', () => {
		expect(render(helper())).toMatch(/<button[^>]*min-h-10/);
	});

	it('nimmt die Auswahl zurück', async () => {
		const onCancel = vi.fn();
		const host = document.createElement('div');
		document.body.appendChild(host);

		const root = createRoot(host);
		await act(async () => {
			root.render(<HelperSelectionBar helper={helper()} onCancel={onCancel} />);
		});
		await act(async () => {
			host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		await act(async () => root.unmount());

		expect(onCancel).toHaveBeenCalledOnce();
	});
});
