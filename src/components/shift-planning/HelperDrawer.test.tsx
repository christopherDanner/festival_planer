import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import HelperDrawer from './HelperDrawer';
import { buildHelperRoster } from '@/lib/helperRoster';
import type { Helper } from '@/lib/helperService';

/**
 * FAB und **Schublade** am Handy (#105, Variante B des Prototyps
 * `entscheid-schichtplan-mobil.html`).
 *
 * Der Seam ist das Fertig-wenn des Tickets: „Eine Zuteilung am Handy braucht:
 * FAB → Helfer antippen → Platz antippen. Kein Scrollen dazwischen." Dass die
 * Schublade sich bei der Wahl **selbst zuschiebt**, ist genau diese Zusage —
 * bliebe sie offen, läge der freie Platz darunter und man müsste erst schließen
 * und suchen. Was in der Liste steht, klagt `HelperRoster.test` ein — hier zählt
 * nur, dass es **dieselbe** Liste ist.
 */

const noop = () => {};

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

const props = (over: Partial<React.ComponentProps<typeof HelperDrawer>> = {}) => ({
	roster: buildHelperRoster({
		helpers: [helper(), helper({ id: 'h2', first_name: 'Maria', last_name: 'Leitner' })],
		assignments: [],
		stationHelpers: [],
		focusStationId: 's1',
		search: '',
		filter: 'all' as const
	}),
	focusStationName: 'Ausschank',
	search: '',
	onSearchChange: noop,
	filter: 'all' as const,
	onFilterChange: noop,
	selectedHelperId: null,
	onSelectHelper: noop,
	onDragStart: noop,
	onDragEnd: noop,
	onAddHelper: noop,
	onEditHelper: noop,
	onRemoveHelper: noop,
	...over
});

const render = () => renderToStaticMarkup(<HelperDrawer {...props()} />);

// --- Der FAB -----------------------------------------------------------------

describe('HelperDrawer — der FAB', () => {
	it('trägt die Oswald-Aufschrift HELFER', () => {
		expect(render()).toMatch(/font-display[^>]*uppercase[^>]*>Helfer</);
	});

	it('ist ein eckiger gelber Knopf mit Tinte-Rahmen und Versatz-Schatten', () => {
		const html = render();

		expect(html).toContain('border-2.5');
		expect(html).toContain('border-tinte');
		expect(html).toContain('bg-gelb');
		expect(html).toContain('shadow-versatz');
		expect(html).not.toContain('rounded');
	});

	it('sitzt über der Bottom-Tab-Bar, nicht darunter', () => {
		// Die Leiste ist `h-14` hoch und trägt den Safe-Area-Saum (`FestivalTabBar`).
		expect(render()).toMatch(/fixed[^"]*bottom-\[calc\(3\.5rem\+env\(safe-area-inset-bottom\)/);
	});

	it('sagt der Vorlesehilfe, dass er die Helferliste holt', () => {
		expect(render()).toContain('Helferliste öffnen');
	});
});

// --- Die Schublade -----------------------------------------------------------

describe('HelperDrawer — die Schublade', () => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

	let root: Root | null = null;
	let host: HTMLDivElement | null = null;

	beforeAll(() => {
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
		Element.prototype.scrollIntoView ??= () => {};
		window.matchMedia ??= ((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false
		})) as typeof window.matchMedia;
	});

	afterEach(async () => {
		if (root) await act(async () => root.unmount());
		root = null;
		host?.remove();
		host = null;
		document.body.innerHTML = '';
	});

	const mount = async (over: Partial<React.ComponentProps<typeof HelperDrawer>> = {}) => {
		host = document.createElement('div');
		document.body.appendChild(host);
		root = createRoot(host);
		await act(async () => {
			root.render(<HelperDrawer {...props(over)} />);
		});
	};

	const tippe = async (el: Element | null | undefined) => {
		await act(async () => {
			el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
	};

	const fab = () => document.querySelector('[aria-label="Helferliste öffnen"]');
	const marke = (name: string) =>
		[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);
	const liste = () => document.querySelector('[aria-label="Helfer suchen"]');
	/** Die Schublade **zeigt** sich; ihr Markup bleibt fürs Zuschieben stehen. */
	const offen = () =>
		document.querySelector('[data-vaul-drawer]')?.getAttribute('data-state') === 'open';

	it('liegt zugeschoben — die Liste steht erst nach dem FAB da', async () => {
		await mount();

		expect(liste()).toBeNull();
		expect(offen()).toBe(false);
	});

	it('geht am FAB auf und zeigt dieselbe Liste wie der Desktop', async () => {
		await mount();
		await tippe(fab());

		expect(offen()).toBe(true);
		expect(liste()).not.toBeNull();
		const text = document.body.textContent ?? '';
		expect(text).toContain('Helfer für Ausschank');
		expect(text).toContain('Alle (2)');
		expect(text).toContain('Frei (2)');
		expect(text).toContain('Hochauer Franz');
		expect(text).toContain('Leitner Maria');
		expect(text).toContain('+ Neuen Helfer anlegen …');
	});

	it('meldet den angetippten Helfer und schiebt sich dabei zu (#105, Fertig-wenn)', async () => {
		const onSelectHelper = vi.fn();
		await mount({ onSelectHelper });
		await tippe(fab());
		await tippe(marke('Hochauer Franz'));

		expect(onSelectHelper).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }));
		expect(offen()).toBe(false);
	});

	it('schließt über den Knopf in der Kopfzeile', async () => {
		await mount();
		await tippe(fab());
		await tippe(marke('Schließen'));

		expect(offen()).toBe(false);
	});

	it('schiebt sich auch zu, wo ein Griff in einen Dialog führt', async () => {
		// „+ Neuen Helfer anlegen …" und ⋮ → Bearbeiten öffnen den Helfer-Zettel;
		// über der offenen Schublade wäre er ein Blatt auf einem Blatt.
		const onAddHelper = vi.fn();
		await mount({ onAddHelper });
		await tippe(fab());
		await tippe(marke('+ Neuen Helfer anlegen …'));

		expect(onAddHelper).toHaveBeenCalledOnce();
		expect(offen()).toBe(false);
	});
});
