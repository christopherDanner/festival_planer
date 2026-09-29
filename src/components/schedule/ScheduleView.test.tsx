import { afterEach, describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { scheduleDay as day, scheduleTask as task } from '@/lib/__tests__/scheduleFactories';

/* Seams dieses Tests (aus #125 abgeleitet, vor dem ersten Test festgehalten):
   Der **Schreibtisch** ist die öffentliche Fläche dieser Ansicht — unter 900px
   fällt er auf *eine* Spalte `minmax(0, 1fr)` und die Werkliste steht darin vor
   dem Programmzettel. Geprüft wird das gezeichnete Papier, nicht der Zustand
   darunter: Filter, Dialog und Export sind #122 und bleiben hier unberührt.

   Nicht geprüft wird „`position: sticky` am Zettel entfällt" (#125): geklebt hat
   dort nie etwas. Ein Test darauf könnte nie rot werden und stünde #123 im Weg,
   sobald der fertige Zettel ab 900px ein legitimes `min-[900px]:sticky` bringt.

   Die Daten kommen aus Stummeln der beiden Haken — die Abfrage selbst gehört
   `useScheduleData` und ist nicht der Gegenstand dieses Tickets. */

vi.mock('./hooks/useScheduleData', () => ({
	useScheduleData: () => ({
		days: [
			day({
				id: 'do',
				date: '2026-07-23',
				label: 'Aufbau',
				entries: [task({ id: 'zelt', title: 'Zelt-Anlieferung', start_time: '08:00:00' })]
			})
		],
		helpers: [],
		isLoading: false,
		refetchAll: () => {}
	})
}));

vi.mock('./hooks/useScheduleActions', () => ({
	useScheduleActions: () => ({
		createEntry: { mutate: vi.fn() },
		editEntry: { mutate: vi.fn() },
		removeEntry: { mutate: vi.fn() },
		initDays: { mutate: vi.fn() }
	})
}));

import ScheduleView from './ScheduleView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
	document.body.innerHTML = '';
});

/** Die Ansicht am lebenden Objekt — der Schreibtisch entsteht erst, nachdem
der Effekt die Tage bestätigt hat. */
const mount = async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	await act(async () => {
		root.render(
			<ScheduleView
				festivalId="f1"
				festivalName="Zeltfest"
				festivalStartDate="2026-07-24"
				festivalEndDate="2026-07-26"
			/>
		);
	});
	return host;
};

/** Das Gitter des Schreibtischs — der Kasten, in dem die Werkliste liegt.
Angesteuert über die Werkliste und nicht über `.grid`: ein zweites Gitter
irgendwo darüber würde den Anker sonst still verschieben. */
const desk = (host: HTMLElement) =>
	host.querySelector('section')?.parentElement as HTMLElement | null;

describe('ScheduleView — der Schreibtisch am Handy (#125)', () => {
	it('fällt unter 900px auf eine Spalte, ab 900px bleibt es bei zwei', async () => {
		const klassen = desk(await mount())?.className ?? '';

		// `minmax(0, 1fr)` und nicht die stille Vorgabe `auto`: eine breite Zeile
		// sprengte sonst das Gitter (DESIGN-VISION §6).
		expect(klassen).toContain('grid-cols-[minmax(0,1fr)]');
		expect(klassen).toContain('min-[900px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]');
	});

	it('stellt die Werkliste vor den Programmzettel', async () => {
		const html = (await mount()).innerHTML;

		// Am Handy ist die Reihenfolge im Dokument die Lesereihenfolge: erst die
		// Arbeit, dann der Aushang (Vision §6).
		expect(html.indexOf('Aufgaben-Werkliste')).toBeLessThan(html.indexOf('Programmzettel'));
	});
});
