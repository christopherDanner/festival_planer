import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { FestivalMaterialWithStation } from '@/lib/materialService';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `MaterialExportDialog` ist der Rahmen — er hält Achse und gewählte Gruppe und
   gibt die geplanten Papiere an `materialExportService` ab. Die Optik prüft
   MaterialExportZettel.test.tsx, die Regel materialExportPlan.test.ts; hier
   zählt nur, dass beides im geöffneten Dialog zusammenkommt. */

vi.mock('@/lib/materialExportService', () => ({
	exportMaterialListPdf: vi.fn(),
	exportMaterialListExcel: vi.fn()
}));

import { exportMaterialListExcel, exportMaterialListPdf } from '@/lib/materialExportService';
import MaterialExportDialog from './MaterialExportDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'm-1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Stück',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 1,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		station: null,
		...over
	};
}

const MATERIALS = [
	material({ id: 'm-1', name: 'Bier', station_id: 's1', station: { id: 's1', name: 'Ausschank' } }),
	material({ id: 'm-2', name: 'Zelt' })
];

const mount = async (over: Partial<React.ComponentProps<typeof MaterialExportDialog>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<MaterialExportDialog
				open
				onOpenChange={() => {}}
				festivalName="Stadlfest 2026"
				materials={MATERIALS}
				{...over}
			/>
		);
	});
	return host;
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
	vi.mocked(exportMaterialListPdf).mockClear();
	vi.mocked(exportMaterialListExcel).mockClear();
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('MaterialExportDialog', () => {
	it('gibt je geplantes Papier eine PDF-Datei aus — mit Untertitel und Station-Regel', async () => {
		await mount();
		await click('[data-export="pdf"]');

		// Achse STATION, alle Gruppen: „Ausschank" und „Ohne Station".
		expect(exportMaterialListPdf).toHaveBeenCalledWith(
			expect.objectContaining({
				festivalName: 'Stadlfest 2026',
				label: 'Ausschank',
				showStation: false
			})
		);
		// Die zweite Datei folgt nach der Browser-Pause zwischen zwei Downloads.
		await act(async () => {
			await new Promise((r) => setTimeout(r, 800));
		});
		expect(vi.mocked(exportMaterialListPdf).mock.calls.map(([p]) => p.label)).toEqual([
			'Ausschank',
			'Ohne Station'
		]);
	});

	it('gibt auf der Achse ALLE ein Papier ohne Untertitel aus', async () => {
		await mount();
		await clickLabel('ALLE');
		await click('[data-export="pdf"]');

		expect(exportMaterialListPdf).toHaveBeenCalledTimes(1);
		expect(exportMaterialListPdf).toHaveBeenCalledWith(
			expect.objectContaining({ label: null, showStation: true })
		);
	});

	it('schickt den Excel-Knopf in die Excel-Ausgabe, nicht ins PDF', async () => {
		await mount();
		await clickLabel('ALLE');
		await click('[data-export="excel"]');

		expect(exportMaterialListExcel).toHaveBeenCalledTimes(1);
		expect(exportMaterialListPdf).not.toHaveBeenCalled();
	});

	it('setzt die Gruppe beim Achsenwechsel zurück — sie gehört zur alten Achse', async () => {
		await mount();
		expect(document.body.textContent).toContain('Alle Gruppen');

		await clickLabel('LIEFERANT');
		// Die Gruppen der neuen Achse; die Auswahl steht wieder auf „alle".
		expect(document.body.textContent).toContain('Alle Gruppen');
		await click('[data-export="pdf"]');
		expect(exportMaterialListPdf).toHaveBeenCalledWith(
			expect.objectContaining({ label: 'Kein Lieferant', showStation: true })
		);
	});

	it('bringt genau einen Schließen-Knopf mit — den im Plakat-Kopf', async () => {
		await mount();
		const schliessen = [...document.querySelectorAll('button')].filter((b) =>
			(b.textContent ?? '').includes('Schließen')
		);
		expect(schliessen).toHaveLength(1);
	});
});
