import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SponsoringCategory, SponsoringWithDetails } from '@/lib/sponsorService';
import { makeAssignment, makeCategory, makeSponsoring } from '@/lib/__tests__/sponsoringFactories';

// Der Dialog wird echt gemountet (Häkchen setzen, Knopf drücken) — dafür muss
// React wissen, dass wir in einer act()-Umgebung sind.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { getUserFestivals, getSponsorings, createSponsoring, createCategory } = vi.hoisted(() => ({
	getUserFestivals: vi.fn(),
	getSponsorings: vi.fn(),
	createSponsoring: vi.fn(),
	createCategory: vi.fn()
}));

vi.mock('@/lib/festivalService', () => ({ getUserFestivals }));
vi.mock('@/lib/sponsorService', () => ({ getSponsorings, createSponsoring, createCategory }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// Das Radix-Select ist in jsdom nicht bedienbar (es hängt an Pointer-Capture).
// Der Ersatz macht aus jedem Eintrag einen Knopf, der die Auswahl meldet — die
// Quellfest-Wahl ist hier nur das Tor zur Liste, nicht der Prüfgegenstand.
vi.mock('@/components/ui/select', async () => {
	const React = await import('react');
	const Pick = React.createContext<(value: string) => void>(() => {});
	type Kinder = { children?: React.ReactNode };

	return {
		Select: ({ onValueChange, children }: Kinder & { onValueChange: (v: string) => void }) =>
			React.createElement(Pick.Provider, { value: onValueChange }, children),
		SelectTrigger: ({ children }: Kinder) => React.createElement('div', null, children),
		SelectValue: ({ placeholder }: { placeholder?: string }) =>
			React.createElement('span', null, placeholder),
		SelectContent: ({ children }: Kinder) => React.createElement('div', null, children),
		SelectItem: ({ value, children }: Kinder & { value: string }) => {
			const pick = React.useContext(Pick);
			return React.createElement(
				'button',
				{ type: 'button', 'data-quellfest': value, onClick: () => pick(value) },
				children
			);
		}
	};
});

import SponsorUebernahmeDialog from './SponsorUebernahmeDialog';

const QUELLFEST = 'fest-2025';
const ZIELFEST = 'fest-2026';

/** Zielfest-Preisliste: „Werbeplakat" gibt es, „Social-Media-Beitrag" nicht. */
const werbeplakatZiel = makeCategory('Werbeplakat', 250);

const quellSponsorings = (): SponsoringWithDetails[] => [
	makeSponsoring({
		companyName: 'Brauerei Schremser',
		freeAmount: 100,
		assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200 })]
	}),
	makeSponsoring({
		companyName: 'Raiffeisen',
		assignments: [makeAssignment({ categoryName: 'Social-Media-Beitrag', categoryValue: 80 })]
	})
];

let root: Root | null = null;

async function oeffneDialog(
	options: {
		quellSponsorings?: SponsoringWithDetails[];
		zielKategorien?: SponsoringCategory[];
		zielSponsorings?: SponsoringWithDetails[];
	} = {}
) {
	const quelle = options.quellSponsorings ?? quellSponsorings();
	getUserFestivals.mockResolvedValue([
		{ id: QUELLFEST, name: 'Dorffest', start_date: '2025-07-04' },
		{ id: ZIELFEST, name: 'Dorffest', start_date: '2026-07-03' }
	]);
	getSponsorings.mockResolvedValue(quelle);

	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		root = createRoot(container);
		root.render(
			<SponsorUebernahmeDialog
				open
				onOpenChange={() => {}}
				festivalId={ZIELFEST}
				targetCategories={options.zielKategorien ?? [werbeplakatZiel]}
				targetSponsorings={options.zielSponsorings ?? []}
				onTransferred={() => {}}
			/>
		);
	});

	// Quellfest wählen — erst danach steht die Sponsorenliste.
	await klick(document.querySelector<HTMLElement>(`[data-quellfest="${QUELLFEST}"]`));
	return quelle;
}

async function klick(element: HTMLElement | null) {
	expect(element).not.toBeNull();
	await act(async () => {
		element!.click();
	});
}

/** Das Häkchen in der Zeile der Firma. */
function haekchen(firma: string): HTMLElement | null {
	return (
		Array.from(document.querySelectorAll<HTMLElement>('[role="checkbox"]')).find((box) =>
			(box.closest('div')?.textContent ?? '').includes(firma)
		) ?? null
	);
}

function knopf(beschriftung: string): HTMLElement | null {
	return (
		Array.from(document.querySelectorAll<HTMLElement>('button')).find((b) =>
			(b.textContent ?? '').includes(beschriftung)
		) ?? null
	);
}

describe('SponsorUebernahmeDialog', () => {
	beforeEach(() => {
		getUserFestivals.mockReset();
		getSponsorings.mockReset();
		createSponsoring.mockReset().mockResolvedValue('neues-sponsoring');
		createCategory.mockReset().mockResolvedValue('neue-kategorie');
	});

	afterEach(async () => {
		await act(async () => {
			root?.unmount();
		});
		root = null;
		document.body.innerHTML = '';
	});

	it('bietet keinen Massenweg an — kein Knopf „Alle auswählen"', async () => {
		await oeffneDialog();

		expect(document.body.textContent).toContain('Brauerei Schremser');
		expect(document.body.textContent).not.toContain('Alle auswählen');
		expect(knopf('Alle auswählen')).toBeNull();
	});

	it('übernimmt nur die angekreuzte Firma, mit ihrem Vorjahresbetrag', async () => {
		const quelle = await oeffneDialog();

		await klick(haekchen('Brauerei Schremser'));
		await klick(knopf('übernehmen'));

		expect(createSponsoring).toHaveBeenCalledTimes(1);
		expect(createSponsoring).toHaveBeenCalledWith(
			ZIELFEST,
			quelle[0].sponsor_id,
			100,
			[{ category_id: werbeplakatZiel.id, value: null }],
			null,
			{ copied_from_festival_id: QUELLFEST }
		);
	});

	it('verknüpft die gleichnamige Zielfest-Kategorie, ohne sie neu anzulegen', async () => {
		await oeffneDialog();

		await klick(haekchen('Brauerei Schremser'));
		await klick(knopf('übernehmen'));

		expect(createCategory).not.toHaveBeenCalled();
	});

	it('legt eine im Zielfest fehlende Kategorie mit dem Vorjahreswert als Vorschlag an', async () => {
		const quelle = await oeffneDialog();

		await klick(haekchen('Raiffeisen'));
		await klick(knopf('übernehmen'));

		expect(createCategory).toHaveBeenCalledTimes(1);
		expect(createCategory).toHaveBeenCalledWith(ZIELFEST, 'Social-Media-Beitrag', 80);
		expect(createSponsoring).toHaveBeenCalledWith(
			ZIELFEST,
			quelle[1].sponsor_id,
			null,
			[{ category_id: 'neue-kategorie', value: null }],
			null,
			{ copied_from_festival_id: QUELLFEST }
		);
	});

	it('lässt bereits erfasste Firmen nicht ankreuzen', async () => {
		const quelle = quellSponsorings();
		await oeffneDialog({
			quellSponsorings: quelle,
			zielSponsorings: [{ ...quelle[0], festival_id: ZIELFEST }]
		});

		expect(haekchen('Brauerei Schremser')).toHaveProperty('disabled', true);
		expect(document.body.textContent).toContain('bereits erfasst');
	});
});
