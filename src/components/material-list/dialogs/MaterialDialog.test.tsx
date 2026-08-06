import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { Station } from '@/lib/shiftService';
import { ZEILEN_HINWEIS } from '@/lib/materialDialogForm';
import MaterialDialog from './MaterialDialog';

/* Seam dieses Tests (aus #117 abgeleitet): MaterialDialog ist der Rahmen —
   er hält den Formularzustand und gibt beim Speichern ab. Der Zettel wird
   in MaterialZettel.test.tsx geprüft, die Rechenregeln in
   materialDialogForm.test.ts. Hier zählt nur, dass beides zusammen im
   geöffneten Dialog ankommt. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STATIONS: Station[] = [
	{ id: 's1', festival_id: 'f1', name: 'Ausschank', required_people: 2 } as Station
];

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'mat1',
		festival_id: 'f1',
		station_id: 's1',
		name: 'Bier',
		category: 'Getränke',
		supplier: 'Brauerei Schwechat',
		unit: 'Liter',
		packaging_unit: 'Fass',
		amount_per_packaging: 50,
		ordered_quantity: 4,
		actual_quantity: 3,
		unit_price: 92.5,
		tax_rate: 20,
		price_is_net: true,
		price_per: 'packaging',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const mount = async (over: Partial<React.ComponentProps<typeof MaterialDialog>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<MaterialDialog
				open
				onOpenChange={() => {}}
				stations={STATIONS}
				festivalId="f1"
				onSave={() => {}}
				{...over}
			/>
		);
	});
	return host;
};

afterEach(() => {
	document.body.innerHTML = '';
});

const speichern = () =>
	document.querySelector<HTMLButtonElement>('[data-zettel="speichern"]');

describe('MaterialDialog', () => {
	it('öffnet den Zettel im Stammdaten-Schnitt, wenn eine Position mitkommt', async () => {
		await mount({ material: material() });
		const text = document.body.textContent ?? '';
		expect(text).toContain('Position bearbeiten');
		expect(text).toContain(ZEILEN_HINWEIS);
		expect(text).not.toContain('Verbraucht');
	});

	it('lässt Mengen und Preise der Position stehen, wenn nur Stammdaten geändert werden', async () => {
		const onSave = vi.fn();
		await mount({ material: material(), onSave });
		const name = document.querySelector<HTMLInputElement>('#mat-name');
		expect(name?.value).toBe('Bier');
		await act(async () => {
			speichern()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave.mock.calls[0][0]).toMatchObject({
			name: 'Bier',
			ordered_quantity: 4,
			actual_quantity: 3,
			unit_price: 92.5,
			tax_rate: 20,
			price_is_net: true,
			price_per: 'packaging'
		});
	});

	it('trägt beim Anlegen die Zuordnung der Gruppe vor und verlangt eine Bestellmenge', async () => {
		await mount({ prefill: { station_id: 's1' } });
		expect(document.body.textContent).toContain('Neue Position');
		// Ohne Bezeichnung und Menge bleibt der Primärknopf gesperrt.
		expect(speichern()?.disabled).toBe(true);
		expect(document.querySelector('#mat-ordered')).not.toBeNull();
	});

	it('bringt genau einen Schließen-Knopf mit — den im Plakat-Kopf', async () => {
		await mount({ material: material() });
		const schliessen = [...document.querySelectorAll('button')].filter((b) =>
			(b.textContent ?? '').includes('Schließen')
		);
		expect(schliessen).toHaveLength(1);
		expect(document.querySelector('.sr-only')?.textContent).not.toBe('Close');
	});
});
