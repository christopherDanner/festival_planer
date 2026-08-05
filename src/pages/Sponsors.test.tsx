import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/AuthProvider', () => ({
	useAuth: () => ({ signOut: vi.fn(), user: null, loading: false })
}));

import Sponsors from './Sponsors';

// `renderToStaticMarkup` führt keine Effekte aus — geprüft wird also der
// Ladezustand, mit dem die Seite startet. Alles danach hängt an den
// Bausteinen in src/components/sponsors/ und ist dort geprüft.
const render = () =>
	renderToStaticMarkup(
		<MemoryRouter>
			<Sponsors />
		</MemoryRouter>
	);

describe('Sponsoren-Seite', () => {
	it('lädt unter dem Mast, nicht unter einem PageHeader', () => {
		const html = render();
		expect(html).toContain('FESTMEISTER');
		expect(html).toContain('Sponsoren');
		expect(html).not.toContain('Globale Sponsoren-Stammdaten für alle Feste');
		expect(html).not.toContain('Sponsor hinzufügen');
	});

	it('zeigt den Ladezustand ohne Card und ohne Zählzeile', () => {
		const html = render();
		expect(html).toContain('Lade Sponsoren');
		expect(html).not.toContain('text-card-foreground');
		expect(html).not.toContain('Firmen');
	});
});
