import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { FestivalMaterialWithStation } from '@/lib/materialService';

/* Seam dieses Tests (aus #119 abgeleitet, vor dem ersten Test festgehalten):
   `OrderListExportDialog` ist der Rahmen — er hält Achse und gewählte Gruppe
   und gibt Einzeldateien plus Sammeldokument an `orderListExportService` ab.
   Die Optik prüft OrderListExportZettel.test.tsx, die Gruppierung
   orderList.test.ts. */

vi.mock('@/lib/orderListExportService', () => ({
	exportOrderListSinglePdf: vi.fn(),
	exportOrderListSingleExcel: vi.fn(),
	exportOrderListCollectionPdf: vi.fn(),
	exportOrderListCollectionExcel: vi.fn()
}));

import {
	exportOrderListCollectionExcel,
	exportOrderListCollectionPdf,
	exportOrderListSingleExcel,
	exportOrderListSinglePdf
} from '@/lib/orderListExportService';
import OrderListExportDialog from './OrderListExportDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'm-1',
		festival_id: 'f1',
		station_id: null,
		name: 'Position',
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
	material({ id: 'm-1', name: 'Bier', supplier: 'Huber', ordered_quantity: 5 }),
	material({ id: 'm-2', name: 'Kohle', supplier: 'Maier', ordered_quantity: 2 }),
	// Bestellmenge 0 — auf keiner Bestellliste (CONTEXT.md).
	material({ id: 'm-3', name: 'Wein', supplier: 'Huber', ordered_quantity: 0 })
];

const mount = async (over: Partial<React.ComponentProps<typeof OrderListExportDialog>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<OrderListExportDialog
				open
				onOpenChange={() => {}}
				festivalName="Stadlfest 2026"
				materials={MATERIALS}
				axis="supplier"
				selectedKey={null}
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

/** Alle Dateien abwarten — zwischen zwei Downloads liegt eine Browser-Pause. */
const settle = () =>
	act(async () => {
		await new Promise((r) => setTimeout(r, 1200));
	});

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('OrderListExportDialog', () => {
	it('gibt ohne Auswahl je Lieferant eine Einzeldatei plus das Sammeldokument aus', async () => {
		await mount();
		await click('[data-export="pdf"]');
		await settle();

		expect(exportOrderListSinglePdf).toHaveBeenCalledTimes(2);
		expect(exportOrderListCollectionPdf).toHaveBeenCalledTimes(1);
		expect(vi.mocked(exportOrderListSinglePdf).mock.calls.map(([g]) => g.name)).toEqual([
			'Huber',
			'Maier'
		]);
		// Die Achse steht in der Kennung jedes Papiers.
		expect(vi.mocked(exportOrderListSinglePdf).mock.calls[0][1]).toMatchObject({
			festivalName: 'Stadlfest 2026',
			axis: 'supplier'
		});
	});

	it('schickt den Excel-Knopf in die Excel-Ausgabe, nicht ins PDF', async () => {
		await mount();
		await click('[data-export="excel"]');
		await settle();

		expect(exportOrderListSingleExcel).toHaveBeenCalledTimes(2);
		expect(exportOrderListCollectionExcel).toHaveBeenCalledTimes(1);
		expect(exportOrderListSinglePdf).not.toHaveBeenCalled();
	});

	it('wechselt die Achse auf Station und stellt die Auswahl zurück', async () => {
		await mount();
		expect(document.body.textContent).toContain('Alle Lieferanten');

		await clickLabel('STATION');
		expect(document.body.textContent).toContain('Alle Stationen');

		await click('[data-export="pdf"]');
		await settle();
		// Ohne Station bleibt genau eine Gruppe übrig.
		expect(vi.mocked(exportOrderListSinglePdf).mock.calls.map(([g]) => g.name)).toEqual([
			'Keine Station'
		]);
		expect(vi.mocked(exportOrderListSinglePdf).mock.calls[0][1]).toMatchObject({
			axis: 'station'
		});
	});

	it('lässt nichts ausgeben, wo keine Position bestellt ist', async () => {
		await mount({ materials: [material({ ordered_quantity: 0 })] });
		await click('[data-export="pdf"]');
		await settle();

		expect(exportOrderListSinglePdf).not.toHaveBeenCalled();
		expect(exportOrderListCollectionPdf).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('Nichts zu exportieren');
	});

	it('beginnt auf der Achse und der Gruppe, die die Arbeitsliste mitgibt', async () => {
		await mount({ axis: 'supplier', selectedKey: 'Maier' });
		expect(document.body.textContent).toContain('Maier (1)');

		await click('[data-export="pdf"]');
		await settle();
		expect(vi.mocked(exportOrderListSinglePdf).mock.calls.map(([g]) => g.name)).toEqual(['Maier']);
		// Eine einzelne Bestellung braucht kein Sammeldokument.
		expect(exportOrderListCollectionPdf).not.toHaveBeenCalled();
	});

	it('bringt genau einen Schließen-Knopf mit — den im Plakat-Kopf', async () => {
		await mount();
		const schliessen = [...document.querySelectorAll('button')].filter((b) =>
			(b.textContent ?? '').includes('Schließen')
		);
		expect(schliessen).toHaveLength(1);
	});
});
