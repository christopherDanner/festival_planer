import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import FocusBoxMenu from './FocusBoxMenu';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   `FocusBoxMenu` ist die *Beschriftungsregel* der beiden ⋮ des Fokus-Kastens —
   aus „Station"/„Schicht" werden beide Einträge und die Überschrift der
   Rückfrage. Das Verhalten des Menüs (Rückfrage, Optik, Tippziel) prüft
   `toolkit/ActionMenu.test.tsx`. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
	document.body.innerHTML = '';
});

const mount = async (over: Partial<React.ComponentProps<typeof FocusBoxMenu>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<FocusBoxMenu
				subject="Station"
				label="Menü der Station"
				deleteMessage="Tragweite"
				onEdit={() => {}}
				onDelete={() => {}}
				{...over}
			/>
		);
	});
	await act(async () => {
		document
			.querySelector('[aria-haspopup="menu"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	});
};

describe('FocusBoxMenu', () => {
	it('beschriftet das Menü des Stationskopfs', async () => {
		await mount();

		expect(document.body.textContent).toContain('Station bearbeiten …');
		expect(document.body.textContent).toContain('Station löschen');
	});

	it('beschriftet das Menü der Schicht-Zeile', async () => {
		await mount({ subject: 'Schicht', label: 'Menü der Schicht 11–15' });

		expect(document.querySelector('[aria-label="Menü der Schicht 11–15"]')).not.toBeNull();
		expect(document.body.textContent).toContain('Schicht bearbeiten …');
		expect(document.body.textContent).toContain('Schicht löschen');
	});

	it('steht im grünen Stationskopf in Weiß, in der Zeile in Tinte', async () => {
		await mount({ onPoster: true });
		expect(document.querySelector('[aria-haspopup="menu"]')?.className).toContain('text-white');

		document.body.innerHTML = '';
		await mount({ subject: 'Schicht', label: 'Menü der Schicht 11–15' });
		expect(document.querySelector('[aria-haspopup="menu"]')?.className).toContain('text-tinte-soft');
	});
});
