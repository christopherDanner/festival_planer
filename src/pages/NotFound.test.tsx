import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import NotFound from './NotFound';
import { FESTIVAL_LIST_PATH } from '@/lib/festivalRoutes';

/* Seam dieses Tests (aus den Abnahmekriterien von #162 abgeleitet):
   Die Catch-all-Route — dass sie den Leerzustand aus DESIGN-VISION §4 zeigt
   (gestrichelter Rahmen, roter Stempelton, ein Satz, gelber Knopf), keine 404
   nennt, ohne Seiten-Neuladen auf die Festliste führt und den versuchten Pfad
   weiter protokolliert. */

// React 18 erwartet die Flagge, sonst warnt jedes act(...) in der Konsole.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PFAD = '/gibt-es-nicht';

const render = (pfad = PFAD) =>
	renderToStaticMarkup(
		<MemoryRouter initialEntries={[pfad]}>
			<NotFound />
		</MemoryRouter>
	);

/** Mountet die Seite echt (Effekte laufen) unter einem Router mit Festliste als Ziel. */
async function mount(pfad = PFAD) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<MemoryRouter initialEntries={[pfad]}>
				<Routes>
					<Route path={FESTIVAL_LIST_PATH} element={<span>MEINE FESTE</span>} />
					<Route path="*" element={<NotFound />} />
				</Routes>
			</MemoryRouter>
		);
	});
	return container;
}

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('NotFound als Leerzustand', () => {
	it('stempelt „DIESE SEITE GIBT ES NICHT" in Rot auf einen gestrichelten Rahmen', () => {
		const html = render();
		expect(html).toContain('DIESE SEITE GIBT ES NICHT');
		// Der Kasten selbst, nicht der Stempelrahmen: 2.5px gestrichelt, keine Füllung.
		expect(html).toContain('border-2.5 border-dashed border-tinte-soft');
		expect(html).toContain('text-rot');
	});

	it('sagt den Weg zurück in einem Satz und bietet den gelben Knopf zur Festliste', () => {
		const html = render();
		expect(html).toContain('Der Link führt ins Leere. Zurück zur Festliste, dort steht alles.');
		expect(html).toContain('ZU MEINEN FESTEN');
		expect(html).toContain(`href="${FESTIVAL_LIST_PATH}"`);
	});

	it('nennt keine 404 und keinen Unterstrich-Link mehr', () => {
		const html = render();
		expect(html).not.toContain('404');
		expect(html).not.toContain('underline');
		// Der Weg zurück ist der gelbe Knopf (bg-primary), kein getönter Textlink.
		expect(html).toContain('bg-primary');
	});

	it('kommt ohne Mast und ohne runde Ecken', () => {
		const html = render();
		expect(html).not.toContain('FESTMEISTER');
		expect(html).not.toContain('rounded');
	});

	it('führt den Knopf ohne Seiten-Neuladen auf die Festliste', async () => {
		const container = await mount();
		const knopf = container.querySelector(`a[href="${FESTIVAL_LIST_PATH}"]`);
		if (!knopf) throw new Error('Knopf zur Festliste fehlt');

		await act(async () => {
			knopf.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
		});

		expect(container.textContent).toContain('MEINE FESTE');
		expect(container.textContent).not.toContain('DIESE SEITE GIBT ES NICHT');
	});

	it('protokolliert den versuchten Pfad weiterhin per console.error', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		await mount('/kaputter-link');
		expect(spy).toHaveBeenCalledWith(expect.stringContaining('non-existent route'), '/kaputter-link');
	});
});
