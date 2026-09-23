import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SponsoringCategory, SponsoringWithDetails } from '@/lib/sponsorService';
import { makeAssignment, makeCategory, makeSponsoring } from '@/lib/__tests__/sponsoringFactories';
import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';

const plakat = makeCategory('Plakat', 200);
const social = makeCategory('Social', 100);

const { service } = vi.hoisted(() => ({
	service: {
		sponsorings: [] as unknown[],
		getSponsorings: vi.fn(),
		getCategories: vi.fn(),
		updateSponsoring: vi.fn(
			(_sponsoringId: string, _updates: unknown, _assignments: unknown): Promise<void> =>
				Promise.resolve()
		),
		createCategory: vi.fn((): Promise<string> => Promise.resolve('cat-neu')),
		updateCategory: vi.fn((): Promise<void> => Promise.resolve()),
		deleteCategory: vi.fn((): Promise<void> => Promise.resolve())
	}
}));

vi.mock('@/lib/sponsorService', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/sponsorService')>();
	return {
		...actual,
		getSponsors: () => Promise.resolve([]),
		getCategories: service.getCategories,
		getSponsorings: service.getSponsorings,
		updateSponsoring: service.updateSponsoring,
		deleteSponsoring: () => Promise.resolve(),
		createCategory: service.createCategory,
		updateCategory: service.updateCategory,
		deleteCategory: service.deleteCategory
	};
});

import SponsoringsSection from './SponsoringsSection';

/** Was die Datenbank beim nächsten Laden liefert. */
function serves(...states: SponsoringWithDetails[][]) {
	service.getSponsorings.mockReset();
	states.forEach((state) => service.getSponsorings.mockResolvedValueOnce(state));
	service.getSponsorings.mockResolvedValue(states[states.length - 1]);
}

/** Dasselbe für die Preisliste — sie ändert sich am Spaltenkopf (#149). */
function servesCategories(...states: SponsoringCategory[][]) {
	service.getCategories.mockReset();
	states.forEach((state) => service.getCategories.mockResolvedValueOnce(state));
	service.getCategories.mockResolvedValue(states[states.length - 1]);
}

beforeEach(() => {
	servesCategories([plakat, social]);
	service.createCategory.mockClear();
	service.updateCategory.mockClear();
	service.deleteCategory.mockClear();
});

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

describe('SponsoringsSection — die Preisliste wird am Spaltenkopf verwaltet', () => {
	it('legt über „+ KATEGORIE" eine Kategorie ohne Standardwert an', async () => {
		// Erlaubt und nicht wegzuoptimieren: der Kopf zeigt dann keinen Wert (#149).
		serves([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const view = await mount();
		await view.press('Kategorie');
		await act(async () => {
			typeInto(view.field('Name'), 'Logo Speisekarte');
		});
		await view.press('Übernehmen');

		expect(service.createCategory).toHaveBeenCalledWith('f1', 'Logo Speisekarte', null);
	});

	it('ändert Name und Standardwert über den Spaltenkopf', async () => {
		serves([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const view = await mount();
		await view.click('Kategorie Plakat');
		await act(async () => {
			typeInto(view.field('Standardwert'), '250');
		});
		await view.press('Übernehmen');

		expect(service.updateCategory).toHaveBeenCalledWith(plakat.id, {
			name: 'Plakat',
			value: 250
		});
	});

	it('beziffert am Kopf die Firmen, die den Standardwert erben', async () => {
		// Zwei Zusagen zum Standardwert, eine mit eigenem Wert — nur die zwei
		// verschiebt ein neuer Standardwert (ADR 0009).
		serves([
			makeSponsoring({ companyName: 'Taxi Brandl', assignments: [makeAssignment({ category: plakat })] }),
			makeSponsoring({ companyName: 'Bäckerei Leitner', assignments: [makeAssignment({ category: plakat })] }),
			makeSponsoring({
				companyName: 'Brauerei Wieselburger',
				assignments: [makeAssignment({ category: plakat, value: 350 })]
			})
		]);

		const view = await mount();
		await view.click('Kategorie Plakat');

		expect(document.body.textContent).toContain('Gilt für 2 Firmen ohne eigenen Wert.');
	});

	it('löscht nach der bezifferten Rückfrage; Spalte und Summen ziehen nach', async () => {
		const mitPlakat = makeSponsoring({
			companyName: 'Taxi Brandl',
			assignments: [makeAssignment({ category: plakat })]
		});
		serves([mitPlakat], [{ ...mitPlakat, assignments: [] }]);
		servesCategories([plakat, social], [social]);
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

		const view = await mount();
		expect(view.kopfzahl()).toContain('€ 200');

		await view.click('Kategorie Plakat');
		await view.press('Kategorie löschen');

		expect(confirmSpy.mock.calls[0][0]).toContain('1 Firma');
		expect(service.deleteCategory).toHaveBeenCalledWith(plakat.id);
		expect(view.container.querySelector('thead')?.textContent).not.toContain('Plakat');
		expect(view.kopfzahl()).toContain('€ 0');
		confirmSpy.mockRestore();
	});

	it('führt keine zweite Tabelle und keinen Kategorien-Dialog mehr', async () => {
		// Der Bereich hat genau eine Tabelle — die Matrix (ADR 0009, #149).
		serves([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const view = await mount();

		expect(view.container.querySelectorAll('table')).toHaveLength(1);
		expect(view.container.textContent).not.toContain('Sponsoring-Kategorien');
	});
});
