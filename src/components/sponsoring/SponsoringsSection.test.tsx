import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import { makeAssignment, makeCategory, makeSponsoring } from '@/lib/__tests__/sponsoringFactories';

const plakat = makeCategory('Plakat', 200);

const { service } = vi.hoisted(() => ({
	service: {
		sponsorings: [] as unknown[],
		getSponsorings: vi.fn(),
		updateSponsoring: vi.fn(() => Promise.resolve())
	}
}));

vi.mock('@/lib/sponsorService', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/sponsorService')>();
	return {
		...actual,
		getSponsors: () => Promise.resolve([]),
		getCategories: () => Promise.resolve([plakat]),
		getSponsorings: service.getSponsorings,
		updateSponsoring: service.updateSponsoring,
		deleteSponsoring: () => Promise.resolve()
	};
});

import SponsoringsSection from './SponsoringsSection';

/** Was die Datenbank beim nächsten Laden liefert. */
function serves(...states: SponsoringWithDetails[][]) {
	service.getSponsorings.mockReset();
	states.forEach((state) => service.getSponsorings.mockResolvedValueOnce(state));
	service.getSponsorings.mockResolvedValue(states[states.length - 1]);
}

async function mount() {
	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<SponsoringsSection festivalId="f1" festivalName="Feuerwehrfest" />
		);
	});
	await act(async () => {});

	return {
		container,
		/** Die Kopfzahl des Bereichs (Maßband-Kasten). */
		kopfzahl: () => container.querySelector('.space-y-4')!.children[1].textContent ?? '',
		/** Der Tabellenfuß mit den Spaltensummen. */
		fuss: () => container.querySelector('tfoot')?.textContent ?? '',
		click: async (selector: string) => {
			await act(async () => {
				container.querySelector<HTMLElement>(selector)!.click();
			});
		},
		press: async (label: string) => {
			const button = [...container.querySelectorAll('button')].find(
				(b) => b.textContent === label
			)!;
			await act(async () => {
				button.click();
			});
			await act(async () => {});
		}
	};
}

describe('SponsoringsSection — Zellklick schreibt', () => {
	beforeEach(() => {
		service.updateSponsoring.mockClear();
	});

	it('weist eine Kategorie zum Standardwert zu und zieht die Summen nach', async () => {
		const leer = makeSponsoring({ companyName: 'Taxi Brandl' });
		const zugewiesen: SponsoringWithDetails = {
			...leer,
			assignments: [makeAssignment({ category: plakat })]
		};
		serves([leer], [zugewiesen]);

		const view = await mount();
		expect(view.kopfzahl()).toContain('€ 0');
		expect(view.fuss()).not.toContain('€ 200');

		await view.click('[aria-label="Plakat bei Taxi Brandl"]');
		await view.press('Übernehmen');

		expect(service.updateSponsoring).toHaveBeenCalledWith(
			leer.id,
			{},
			[{ category_id: plakat.id, value: null }]
		);
		// Kopfzahl, Zeilensumme und Fuß rechnen alle über `sponsoringTotals`.
		expect(view.kopfzahl()).toContain('€ 200');
		expect(view.fuss()).toContain('€ 200');
	});

	it('setzt den Freibetrag über denselben Weg', async () => {
		const leer = makeSponsoring({ companyName: 'Taxi Brandl' });
		serves([leer], [{ ...leer, free_amount: 150 }]);

		const view = await mount();
		await view.click('[aria-label="Freibetrag bei Taxi Brandl"]');
		const feld = view.container.querySelector<HTMLInputElement>('[aria-label="Betrag"]')!;
		await act(async () => {
			const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
			setValue.call(feld, '150');
			feld.dispatchEvent(new Event('input', { bubbles: true }));
		});
		await view.press('Übernehmen');

		expect(service.updateSponsoring).toHaveBeenCalledWith(leer.id, { free_amount: 150 }, []);
		expect(view.kopfzahl()).toContain('€ 150');
		expect(view.fuss()).toContain('€ 150');
	});

	it('entfernt eine Sachleistung samt Schätzwert', async () => {
		const mitSachleistung = makeSponsoring({
			companyName: 'Fleischerei Berger',
			inKindDescription: 'Geschenkkorb',
			inKindValue: 80
		});
		serves([mitSachleistung], [{ ...mitSachleistung, in_kind_description: null, in_kind_value: null }]);

		const view = await mount();
		expect(view.container.textContent).toContain('+ € 80 Sachwert');

		await view.click('[aria-label="Sachleistung bei Fleischerei Berger"]');
		await view.press('Entfernen');

		expect(service.updateSponsoring).toHaveBeenCalledWith(
			mitSachleistung.id,
			{ in_kind_description: null, in_kind_value: null },
			[]
		);
		expect(view.container.textContent).not.toContain('Sachwert');
	});

	it('führt keinen Bearbeiten-Weg neben dem Zettel mehr', async () => {
		// Der „Sponsoring bearbeiten"-Dialog doppelte die Matrix als Häkchenliste
		// und entfällt mit dem Zettel (ADR 0009).
		serves([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const view = await mount();
		const kartenKnoepfe = view.container.querySelectorAll('.md\\:hidden button');

		expect(kartenKnoepfe).toHaveLength(1);
		expect(kartenKnoepfe[0].getAttribute('aria-label')).toBe(
			'Sponsoring von Taxi Brandl entfernen'
		);
	});

	it('legt ein Sponsoring als nackte Verknüpfung an, ohne Häkchenliste', async () => {
		serves([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const view = await mount();
		await view.press('Sponsoring');
		const dialog = document.querySelector('[role="dialog"]')!;

		expect(dialog.textContent).toContain('Neues Sponsoring');
		expect(dialog.querySelector('[role="checkbox"]')).toBeNull();
		expect(dialog.textContent).not.toContain('Leer lassen');
		expect(dialog.querySelector('#free_amount')).toBeNull();
	});
});
