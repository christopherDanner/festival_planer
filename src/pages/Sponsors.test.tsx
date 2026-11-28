import { afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { buildSponsorHistory } from '@/lib/sponsorHistory';
import type { Sponsor } from '@/lib/sponsorService';
import { buttonByLabel, fieldByLabel, typeInto } from '@/lib/__tests__/domTesting';

const mocks = vi.hoisted(() => ({
	getSponsors: vi.fn(),
	createSponsor: vi.fn(),
	updateSponsor: vi.fn(),
	deleteSponsor: vi.fn(),
	getSponsorHistory: vi.fn(),
	toast: vi.fn()
}));

vi.mock('@/components/AuthProvider', () => ({
	useAuth: () => ({ signOut: vi.fn(), user: null, loading: false })
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

vi.mock('@/lib/sponsorService', async (importActual) => ({
	...(await importActual<typeof import('@/lib/sponsorService')>()),
	getSponsors: mocks.getSponsors,
	createSponsor: mocks.createSponsor,
	updateSponsor: mocks.updateSponsor,
	deleteSponsor: mocks.deleteSponsor
}));

vi.mock('@/lib/sponsorHistoryService', () => ({ getSponsorHistory: mocks.getSponsorHistory }));

import Sponsors from './Sponsors';

// `renderToStaticMarkup` führt keine Effekte aus — geprüft wird also der
// Ladezustand, mit dem die Seite startet.
const renderStatic = () =>
	renderToStaticMarkup(
		<MemoryRouter>
			<Sponsors />
		</MemoryRouter>
	);

describe('Sponsoren-Seite', () => {
	it('lädt unter dem Mast, nicht unter der alten Zurück-Zeile', () => {
		const html = renderStatic();
		expect(html).toContain('FESTMEISTER');
		expect(html).toContain('Sponsoren');
		expect(html).not.toContain('Globale Sponsoren-Stammdaten für alle Feste');
		expect(html).not.toContain('Sponsor hinzufügen');
	});

	it('zeigt den Ladezustand ohne Card und ohne Zählzeile', () => {
		const html = renderStatic();
		expect(html).toContain('Lade Sponsoren');
		expect(html).not.toContain('text-card-foreground');
		expect(html).not.toContain('Firmen');
	});
});

/* Seam der folgenden Tests (aus den Akzeptanzkriterien von #159, vor dem ersten
   Test festgehalten): die Seite als Ganzes, bedient wie vom Nutzer — „+ FIRMA"
   und ⋮ → Bearbeiten öffnen **dasselbe** Firmendaten-Formular wie die Matrix
   (`SponsorFormDialog`), ⋮ → Löschen löscht nur eine Firma ohne Historie, und
   ein abgelehntes Löschen meldet sich mit dem Satz der Regel. Der Datenzugriff
   ist am Service-Rand ersetzt. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	Element.prototype.scrollIntoView ??= () => {};
});

function sponsor(id: string, company_name: string, over: Partial<Sponsor> = {}): Sponsor {
	return {
		id,
		user_id: 'u1',
		company_name,
		contact_person: null,
		email: null,
		phone: null,
		address: null,
		website: null,
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const BRANDL = sponsor('brandl', 'Taxi Brandl', { phone: '0664 111' });
const PICHLER = sponsor('pichler', 'Elektro Pichler');

/** Taxi Brandl hängt an drei Festen, Elektro Pichler hat nie gesponsert. */
const HISTORY = buildSponsorHistory(
	[
		{ sponsor_id: 'brandl', festival_id: 'f1' },
		{ sponsor_id: 'brandl', festival_id: 'f2' },
		{ sponsor_id: 'brandl', festival_id: 'f3' }
	],
	[
		{ id: 'f1', start_date: '2023-07-22' },
		{ id: 'f2', start_date: '2024-07-22' },
		{ id: 'f3', start_date: '2025-07-22' }
	],
	null
);

let bestand: Sponsor[] = [];
const roots: Root[] = [];

beforeEach(() => {
	bestand = [PICHLER, BRANDL];
	mocks.getSponsors.mockImplementation(async () => bestand);
	mocks.getSponsorHistory.mockResolvedValue({
		history: HISTORY,
		referenceFestival: null,
		referenceYear: null
	});
	mocks.createSponsor.mockReset();
	mocks.updateSponsor.mockReset().mockResolvedValue(undefined);
	mocks.deleteSponsor.mockReset().mockResolvedValue(undefined);
	mocks.toast.mockReset();
});

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
	document.body.innerHTML = '';
});

const mount = async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	roots.push(root);
	await act(async () => {
		root.render(
			<MemoryRouter>
				<Sponsors />
			</MemoryRouter>
		);
	});
};

const klick = async (el: Element | undefined | null) => {
	await act(async () => {
		el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

const oeffneMenue = async (firma: string) => {
	await act(async () => {
		document
			.querySelector(`[aria-label="Menü für ${firma}"]`)
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	});
};

const eintrag = (text: string) =>
	[...document.querySelectorAll('[role="menuitem"]')].find((el) =>
		(el.textContent ?? '').includes(text)
	);

const dialog = () => document.querySelector('[role="dialog"]');

const rueckfrageKnopf = (text: string) =>
	[...document.querySelectorAll('[role="alertdialog"] button')].find(
		(b) => b.textContent?.trim() === text
	);

describe('Sponsoren-Seite — ein Formular, drei Einstiege (#159)', () => {
	it('öffnet mit „+ FIRMA" das geteilte Firmendaten-Formular, leer', async () => {
		await mount();
		await klick(buttonByLabel(document.body, '+ FIRMA'));

		expect(dialog()?.textContent).toContain('Neue Firma anlegen');
		// Die Zeile des geteilten Formulars — der alte Seiten-Dialog kannte sie nicht.
		expect(dialog()?.textContent).toContain('sie gelten für alle Feste');
		expect(fieldByLabel(dialog()!, 'Firmenname').value).toBe('');
	});

	it('legt die Firma an und holt sie ins Bild', async () => {
		mocks.createSponsor.mockImplementation(async () => {
			bestand = [sponsor('neu', 'Autohaus Wieselburg'), ...bestand];
			return 'neu';
		});
		await mount();
		await klick(buttonByLabel(document.body, '+ FIRMA'));
		await act(async () => {
			typeInto(fieldByLabel(dialog()!, 'Firmenname'), 'Autohaus Wieselburg');
		});
		await klick(buttonByLabel(dialog()!, 'Speichern'));

		expect(mocks.createSponsor).toHaveBeenCalledWith(
			expect.objectContaining({ company_name: 'Autohaus Wieselburg', phone: null })
		);
		expect(dialog()).toBeNull();
		expect(document.activeElement?.id).toBe('sponsor-neu');
	});

	it('öffnet mit ⋮ → Bearbeiten dasselbe Formular mit den Werten der Firma', async () => {
		await mount();
		await oeffneMenue('Taxi Brandl');
		await klick(eintrag('Bearbeiten'));

		expect(dialog()?.textContent).toContain('Firmendaten');
		expect(fieldByLabel(dialog()!, 'Firmenname').value).toBe('Taxi Brandl');
		expect(fieldByLabel(dialog()!, 'Telefon').value).toBe('0664 111');
	});

	it('schreibt die geänderten Firmendaten in den globalen Stammsatz', async () => {
		await mount();
		await oeffneMenue('Taxi Brandl');
		await klick(eintrag('Bearbeiten'));
		await act(async () => {
			typeInto(fieldByLabel(dialog()!, 'Telefon'), '0664 222');
		});
		await klick(buttonByLabel(dialog()!, 'Speichern'));

		expect(mocks.updateSponsor).toHaveBeenCalledWith(
			'brandl',
			expect.objectContaining({ company_name: 'Taxi Brandl', phone: '0664 222' })
		);
		expect(dialog()).toBeNull();
	});

	/* jsdom kennt keine Animationen — Radix (`Presence`) hängt den Dialog dort
	sofort aus. Dieses Stylesheet gibt dem geschlossenen Zustand eine eigene
	Animation, wie `animate-out` im Browser; da jsdom kein `animationend` feuert,
	bleibt der schließende Dialog stehen, so wie während der 200 ms im Browser. */
	const mitSchliessAnimation = () => {
		const style = document.createElement('style');
		style.textContent =
			'[role="dialog"][data-state="open"]{animation-name:rein}' +
			'[role="dialog"][data-state="closed"]{animation-name:raus}';
		document.head.appendChild(style);
		return () => style.remove();
	};

	it.each([
		['Abbrechen', 'Abbrechen'],
		['Speichern', 'Speichern']
	])(
		'zeigt beim Schließen eines Bearbeitens (%s) nie „Neue Firma anlegen"',
		async (_fall, knopf) => {
			const entferne = mitSchliessAnimation();
			try {
				await mount();
				await oeffneMenue('Taxi Brandl');
				await klick(eintrag('Bearbeiten'));
				await klick(buttonByLabel(dialog()!, knopf));

				expect(document.body.textContent).not.toContain('Neue Firma anlegen');
			} finally {
				entferne();
			}
		}
	);

	it('hat keinen Löschweg mehr im Formular — der lebt im ⋮', async () => {
		await mount();
		await oeffneMenue('Elektro Pichler');
		await klick(eintrag('Bearbeiten'));

		const knoepfe = [...dialog()!.querySelectorAll('button')].map((b) => b.textContent);
		expect(knoepfe).not.toContain('Löschen');
		expect(knoepfe).not.toContain('Aktualisieren');
	});
});

describe('Sponsoren-Seite — Löschen nur ohne Historie (ADR 0010)', () => {
	it('löscht eine „NOCH NIE"-Firma nach der Rückfrage', async () => {
		await mount();
		await oeffneMenue('Elektro Pichler');
		await klick(eintrag('Löschen'));
		await klick(rueckfrageKnopf('Löschen'));

		expect(mocks.deleteSponsor).toHaveBeenCalledWith('pichler');
	});

	it('sperrt das Löschen einer Firma mit Historie und nennt den Grund', async () => {
		await mount();
		await oeffneMenue('Taxi Brandl');

		expect(eintrag('Löschen')?.getAttribute('data-disabled')).not.toBeNull();
		expect(eintrag('Löschen')?.textContent).toContain('hängt an 3 Festen');
	});

	it('meldet ein abgelehntes Löschen mit dem Satz der Regel und lädt neu', async () => {
		const SATZ = 'Löschbar ist nur eine Firma, die noch nie gesponsert hat.';
		mocks.deleteSponsor.mockRejectedValue(new Error(SATZ));
		await mount();
		mocks.getSponsors.mockClear();
		await oeffneMenue('Elektro Pichler');
		await klick(eintrag('Löschen'));
		await klick(rueckfrageKnopf('Löschen'));

		expect(mocks.toast).toHaveBeenCalledWith(
			expect.objectContaining({ description: SATZ, variant: 'destructive' })
		);
		// Neu geladen, damit das ⋮ die frische Historie zeigt und gesperrt steht.
		expect(mocks.getSponsors).toHaveBeenCalled();
	});
});
