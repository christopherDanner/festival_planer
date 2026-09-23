import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import { makeAssignment, makeCategory, makeSponsoring } from '@/lib/__tests__/sponsoringFactories';
import { buttonByLabel, fieldByLabel, typeInto } from '@/lib/__tests__/domTesting';

/* Der Alarm-Dialog des ⋮ rendert außerhalb der Ereignisschleife nach; ohne
diese Fahne warnt React bei jedem Öffnen. */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const plakat = makeCategory('Plakat', 200);
const social = makeCategory('Social', 100);

const { service } = vi.hoisted(() => ({
	service: {
		sponsorings: [] as unknown[],
		getSponsorings: vi.fn(),
		updateSponsoring: vi.fn(
			(_sponsoringId: string, _updates: unknown, _assignments: unknown): Promise<void> =>
				Promise.resolve()
		),
		updateSponsor: vi.fn((_sponsorId: string, _updates: unknown): Promise<void> => Promise.resolve()),
		deleteSponsoring: vi.fn((_sponsoringId: string): Promise<void> => Promise.resolve()),
		deleteSponsor: vi.fn((_sponsorId: string): Promise<void> => Promise.resolve())
	}
}));

vi.mock('@/lib/sponsorService', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/sponsorService')>();
	return {
		...actual,
		getSponsors: () => Promise.resolve([]),
		getCategories: () => Promise.resolve([plakat, social]),
		getSponsorings: service.getSponsorings,
		updateSponsoring: service.updateSponsoring,
		updateSponsor: service.updateSponsor,
		deleteSponsoring: service.deleteSponsoring,
		deleteSponsor: service.deleteSponsor
	};
});

import SponsoringsSection from './SponsoringsSection';

/** Was die Datenbank beim nächsten Laden liefert. */
function serves(...states: SponsoringWithDetails[][]) {
	service.getSponsorings.mockReset();
	states.forEach((state) => service.getSponsorings.mockResolvedValueOnce(state));
	service.getSponsorings.mockResolvedValue(states[states.length - 1]);
}

/* Der Zettel hängt als Popover im Portal an `document.body`; jede Montage wird
danach abgeräumt, sonst findet der nächste Test einen alten. */
const roots: Root[] = [];

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
});

async function mount() {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => {
		root.render(<SponsoringsSection festivalId="f1" festivalName="Feuerwehrfest" />);
	});
	await act(async () => {});

	return {
		container,
		/* Der Maßband-Kasten, an seinem eigenen Rahmen gegriffen statt an seiner
		Stelle im Baum — die Übersicht schiebt sonst jede neue Zeile den Griff
		weiter (der Rahmen der Matrix trägt kein `px-4`). */
		kopfzahl: () => container.querySelector('.border-2\\.5.px-4')?.textContent ?? '',
		/** Der Tabellenfuß mit den Spaltensummen. */
		fuss: () => container.querySelector('tfoot')?.textContent ?? '',
		field: (label: string) =>
			document.body.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!,
		click: async (label: string) => {
			const target = container.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
			await act(async () => {
				target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
				target.click();
			});
		},
		press: async (label: string) => {
			const button = buttonByLabel(document.body, label);
			await act(async () => {
				button.click();
			});
			await act(async () => {});
		},
		/* Das ⋮ hängt an beiden Sichten derselben Zeile — am Handy an der Karte,
		am Desktop in der Matrix. Beide stehen im Baum, sichtbar ist je nach
		Breite eine; der Test sagt darum, welche er bedient. */
		openMenu: async (companyName: string, wo: 'matrix' | 'karte' = 'matrix') => {
			const scope = container.querySelector(
				wo === 'karte' ? '.md\\:hidden' : '.hidden.md\\:block'
			)!;
			const trigger = scope.querySelector<HTMLElement>(`[aria-label="Menü für ${companyName}"]`)!;
			await act(async () => {
				trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			});
		},
		menuItems: () =>
			[...document.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent ?? ''),
		chooseMenuItem: async (text: string) => {
			const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
				(el.textContent ?? '').includes(text)
			);
			if (!item) throw new Error(`Kein Menü-Eintrag „${text}"`);
			await act(async () => {
				item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			});
			await act(async () => {});
		},
		confirm: async (text: string) => {
			const button = [...document.querySelectorAll('[role="alertdialog"] button')].find(
				(b) => b.textContent?.trim() === text
			);
			if (!button) throw new Error(`Kein Knopf „${text}" in der Rückfrage`);
			await act(async () => {
				(button as HTMLButtonElement).click();
			});
			await act(async () => {});
		},
		/** Ein Feld des Firmendaten-Formulars über seine Aufschrift. */
		formField: (label: string) =>
			fieldByLabel(document.querySelector('[role="dialog"]')!, label)
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

		await view.click('Plakat bei Taxi Brandl');
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
		await view.click('Freibetrag bei Taxi Brandl');
		await act(async () => {
			typeInto(view.field('Betrag'), '150');
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

		await view.click('Sachleistung bei Fleischerei Berger');
		await view.press('Entfernen');

		expect(service.updateSponsoring).toHaveBeenCalledWith(
			mitSachleistung.id,
			{ in_kind_description: null, in_kind_value: null },
			[]
		);
		expect(view.container.textContent).not.toContain('Sachwert');
	});

	it('verliert bei zwei schnellen Zuweisungen die erste nicht', async () => {
		// `updateSponsoring` ersetzt die Zuweisungen vollständig. Wer die zweite
		// Zuweisung aus dem Stand *vor* dem ersten Schreibvorgang baut, löscht die
		// erste wieder — und genau schnell geklickt wird hier (2 Klicks je Zelle).
		const leer = makeSponsoring({ companyName: 'Taxi Brandl' });
		const mitPlakat: SponsoringWithDetails = {
			...leer,
			assignments: [makeAssignment({ category: plakat })]
		};
		serves([leer], [mitPlakat]);

		let ersterSchreibvorgangFertig!: () => void;
		service.updateSponsoring.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					ersterSchreibvorgangFertig = resolve;
				})
		);

		const view = await mount();
		await view.click('Plakat bei Taxi Brandl');
		await view.press('Übernehmen');

		// Zweite Zelle, während der erste Schreibvorgang noch läuft.
		await view.click('Social bei Taxi Brandl');
		await view.press('Übernehmen');
		expect(service.updateSponsoring).toHaveBeenCalledTimes(1);

		await act(async () => {
			ersterSchreibvorgangFertig();
		});
		await act(async () => {});

		expect(service.updateSponsoring).toHaveBeenCalledTimes(2);
		expect(service.updateSponsoring.mock.calls[1][2]).toEqual(
			expect.arrayContaining([
				{ category_id: plakat.id, value: null },
				{ category_id: social.id, value: null }
			])
		);
	});

	it('führt keinen Bearbeiten-Weg neben dem Zettel mehr', async () => {
		// Der „Sponsoring bearbeiten"-Dialog doppelte die Matrix als Häkchenliste
		// und entfällt mit dem Zettel (ADR 0009); auch das ⋮ bietet ihn nicht an
		// (#150, ausdrücklich kein „Bearbeiten").
		serves([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const view = await mount();
		await view.openMenu('Taxi Brandl');

		expect(view.menuItems()).not.toContain('Bearbeiten');
		expect(document.body.textContent).not.toContain('Bearbeiten');
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
		// Auch die Notiz nicht: sie hat seit #150 ihren Ort im ⋮, und zwei Felder
		// für `sponsorings.notes` liefen auseinander.
		expect(dialog.querySelector('#sponsoring_notes')).toBeNull();
	});
});

describe('SponsoringsSection — das ⋮ je Zeile (#150)', () => {
	beforeEach(() => {
		service.updateSponsoring.mockClear();
		service.updateSponsor.mockClear();
		service.deleteSponsoring.mockClear();
		service.deleteSponsor.mockClear();
	});

	it('führt genau Notiz, Firmendaten und Entfernen — in Matrix und Karte dasselbe Menü', async () => {
		serves([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const view = await mount();
		await view.openMenu('Taxi Brandl');
		expect(view.menuItems()).toEqual(['Notiz …', 'Firmendaten …', 'Entfernen']);

		await view.chooseMenuItem('Entfernen');
		await view.confirm('Abbrechen');
		await view.openMenu('Taxi Brandl', 'karte');
		expect(view.menuItems()).toEqual(['Notiz …', 'Firmendaten …', 'Entfernen']);
	});

	it('schreibt die Notiz, ohne die Zuweisungen der Zeile zu verlieren', async () => {
		// `updateSponsoring` ersetzt die Zuweisungen vollständig — die Notiz darf
		// die Kategorien der Zeile nicht mitnehmen.
		const mitPlakat = makeSponsoring({
			companyName: 'Taxi Brandl',
			assignments: [makeAssignment({ category: plakat })]
		});
		serves([mitPlakat], [{ ...mitPlakat, notes: 'Zusage per Mail 12.03.' }]);

		const view = await mount();
		await view.openMenu('Taxi Brandl');
		await view.chooseMenuItem('Notiz');
		await act(async () => {
			typeInto(view.field('Notiz'), 'Zusage per Mail 12.03.');
		});
		await view.press('Speichern');

		expect(service.updateSponsoring).toHaveBeenCalledWith(
			mitPlakat.id,
			{ notes: 'Zusage per Mail 12.03.' },
			[{ category_id: plakat.id, value: null }]
		);
	});

	it('zeigt die gespeicherte Notiz beim erneuten Öffnen', async () => {
		const leer = makeSponsoring({ companyName: 'Taxi Brandl' });
		serves([leer], [{ ...leer, notes: 'Zusage per Mail 12.03.' }]);

		const view = await mount();
		await view.openMenu('Taxi Brandl');
		await view.chooseMenuItem('Notiz');
		await act(async () => {
			typeInto(view.field('Notiz'), 'Zusage per Mail 12.03.');
		});
		await view.press('Speichern');

		await view.openMenu('Taxi Brandl');
		await view.chooseMenuItem('Notiz');
		expect(view.field('Notiz').value).toBe('Zusage per Mail 12.03.');
	});

	it('liest die Firmendaten und schreibt die geänderte Telefonnummer an den Sponsor', async () => {
		// Die Nummer liegt am **globalen** Stammsatz — darum steht sie danach auch
		// auf der Sponsoren-Seite (#150, ADR 0011).
		const brandl = makeSponsoring({
			companyName: 'Taxi Brandl',
			sponsor: { phone: '0664 111' }
		});
		serves([brandl]);

		const view = await mount();
		await view.openMenu('Taxi Brandl');
		await view.chooseMenuItem('Firmendaten');
		expect(view.formField('Firmenname').value).toBe('Taxi Brandl');
		expect(view.formField('Telefon').value).toBe('0664 111');

		await act(async () => {
			typeInto(view.formField('Telefon'), '0664 999');
		});
		await view.press('Speichern');

		expect(service.updateSponsor).toHaveBeenCalledWith(
			brandl.sponsor_id,
			expect.objectContaining({ company_name: 'Taxi Brandl', phone: '0664 999' })
		);
	});

	it('entfernt nach Rückfrage nur das Sponsoring — die Firma bleibt', async () => {
		const brandl = makeSponsoring({ companyName: 'Taxi Brandl' });
		serves([brandl], []);

		const view = await mount();
		await view.openMenu('Taxi Brandl');
		await view.chooseMenuItem('Entfernen');
		expect(service.deleteSponsoring).not.toHaveBeenCalled();

		await view.confirm('Löschen');

		expect(service.deleteSponsoring).toHaveBeenCalledWith(brandl.id);
		// Der Sponsor ist globaler Stammsatz: ihn zu löschen änderte die Summe
		// vergangener Feste rückwirkend (ADR 0010).
		expect(service.deleteSponsor).not.toHaveBeenCalled();
		expect(view.container.textContent).not.toContain('Taxi Brandl');
	});
});
