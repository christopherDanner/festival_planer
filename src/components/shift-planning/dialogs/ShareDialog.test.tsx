import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ShareDialog from './ShareDialog';
import { assignment, helper, shift, station } from '@/lib/__tests__/shiftFixtures';
import { OPEN_SLOT } from '@/lib/shiftPlanText';

/* Seam dieses Tests (#109, vor dem ersten Test festgehalten): `ShareDialog` ist
   die Schale — sie hält Modus und gewählte Person, holt den Wortlaut bei
   `shiftPlanText` und schiebt ihn in Zwischenablage, WhatsApp oder die
   Datei-Ausgaben. Die Handschrift prüft ShareZettel.test.tsx, den Wortlaut
   shiftPlanText.test.ts. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const writeText = vi.fn((_text: string) => Promise.resolve());
const onExportPdf = vi.fn();
const onExportExcel = vi.fn();

const HELPERS = [
	helper({ id: 'h2', first_name: 'Maria', last_name: 'Leitner' }),
	helper({ id: 'h1', first_name: 'Franz', last_name: 'Hochauer' })
];

const mount = async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<ShareDialog
				open
				onOpenChange={() => {}}
				festivalName="Stadlfest 2026"
				festivalDate="25.07.2026 – 26.07.2026"
				stations={[station()]}
				stationShifts={[shift({ id: 'sh-1', name: 'Frühschoppen', required_people: 2 })]}
				assignments={[assignment({ station_shift_id: 'sh-1' })]}
				stationHelpers={[]}
				helpers={HELPERS}
				onExportPdf={onExportPdf}
				onExportExcel={onExportExcel}
			/>
		);
	});
};

const click = (selector: string) =>
	act(async () => {
		document
			.querySelector<HTMLElement>(selector)
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});

const clickLabel = (label: string) =>
	act(async () => {
		[...document.querySelectorAll('button')]
			.find((b) => (b.textContent ?? '').trim() === label)
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});

beforeEach(() => {
	vi.clearAllMocks();
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
	vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('ShareDialog', () => {
	it('legt den ganzen Plan in die Zwischenablage — offene Plätze inbegriffen', async () => {
		await mount();
		await click('[data-share="copy"]');

		const text = writeText.mock.calls[0][0];
		expect(text).toContain('SCHICHTPLAN');
		expect(text).toContain('=== AUSSCHANK ===');
		expect(text).toContain('11–15 · Frühschoppen · 2 Plätze');
		expect(text).toContain(OPEN_SLOT);
	});

	it('schickt denselben Text zu WhatsApp', async () => {
		await mount();
		await click('[data-share="whatsapp"]');

		const [url] = vi.mocked(window.open).mock.calls[0];
		expect(String(url)).toContain('https://wa.me/?text=');
		expect(decodeURIComponent(String(url))).toContain('SCHICHTPLAN');
	});

	it('teilt nach Wahl einer Marke deren Einsatzplan statt des ganzen Fests', async () => {
		await mount();
		await clickLabel('Plan einer Person');
		await clickLabel('Hochauer Franz');
		await click('[data-share="copy"]');

		const text = writeText.mock.calls[0][0];
		expect(text).toContain('EINSATZPLAN');
		expect(text).toContain('Hochauer Franz');
		expect(text).not.toContain('SCHICHTPLAN');
	});

	it('reiht die Marken nach Nachnamen, nicht nach Ladereihenfolge', async () => {
		await mount();
		await clickLabel('Plan einer Person');

		const marks = [...document.querySelectorAll('button[aria-pressed]')].map((b) =>
			(b.textContent ?? '').trim()
		);
		expect(marks).toEqual(['Hochauer Franz', 'Leitner Maria']);
	});

	it('hat vor der Wahl einer Person nichts zu teilen', async () => {
		await mount();
		await clickLabel('Plan einer Person');

		expect(document.querySelector('[data-share="copy"]')).toHaveProperty('disabled', true);
		expect(document.body.textContent).toContain('Person wählen');
	});

	it('reicht die Datei-Ausgaben an den Schichtplan durch', async () => {
		await mount();
		await click('[data-share="pdf"]');
		await click('[data-share="excel"]');

		expect(onExportPdf).toHaveBeenCalledTimes(1);
		expect(onExportExcel).toHaveBeenCalledTimes(1);
	});
});
