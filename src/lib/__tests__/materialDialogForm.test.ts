import { describe, it, expect } from 'vitest';

import type { FestivalMaterialWithStation } from '@/lib/materialService';
import {
	buildMasterDataUpdate,
	buildMaterialPayload,
	canSave,
	dialogMode,
	emptyMaterialForm,
	formFromMaterial,
	isFullPayload,
	showsQuantityAndPrice,
	ZEILEN_HINWEIS,
	type MaterialForm
} from '@/lib/materialDialogForm';

/* Seam dieses Tests (aus #117 abgeleitet, vor dem ersten Test festgehalten):
   `materialDialogForm` ist der *Schnitt* des Positions-Dialogs als reine
   Logik — welcher Modus gilt, welche Felder er trägt, wann gespeichert
   werden darf und was gespeichert wird. Kein React, kein Supabase; die
   Optik liegt im Zettel-Seam (MaterialZettel.test.tsx).

   Die Arbeitsteilung aus #117/#115: Zeile (✎) = Mengen und Preise,
   Dialog (⋮) = Stammdaten. Beim *Anlegen* trägt der Dialog trotzdem
   Mengen und Preis, damit eine Position in einem Zug vollständig wird. */

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'mat1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Liter',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

const KATEGORIEN = ['Getränke', 'Lebensmittel'];
const LIEFERANTEN = ['Brauerei Schwechat'];

const CONTEXT = {
	festivalId: 'f1',
	categorySuggestions: KATEGORIEN,
	supplierSuggestions: LIEFERANTEN
};

const payloadOf = (form: MaterialForm) => buildMaterialPayload(form, CONTEXT);
const stammdatenOf = (form: MaterialForm) => buildMasterDataUpdate(form, CONTEXT);

describe('dialogMode', () => {
	it('bearbeitet, wenn eine Position mitkommt — legt sonst an', () => {
		expect(dialogMode(material())).toBe('edit');
		expect(dialogMode(null)).toBe('create');
		expect(dialogMode(undefined)).toBe('create');
	});
});

describe('showsQuantityAndPrice', () => {
	it('trägt Mengen und Preis nur beim Anlegen — beim Bearbeiten macht das die Zeile', () => {
		expect(showsQuantityAndPrice('create')).toBe(true);
		expect(showsQuantityAndPrice('edit')).toBe(false);
	});

	it('nennt den Grund in einem Satz, den der Zettel anzeigen kann', () => {
		expect(ZEILEN_HINWEIS).toContain('Mengen und Preise');
		expect(ZEILEN_HINWEIS).toContain('Zeile');
	});
});

describe('canSave', () => {
	it('verlangt beim Anlegen Bezeichnung *und* Bestellmenge', () => {
		const form = { ...emptyMaterialForm(), name: 'Bier' };
		expect(canSave(form, 'create')).toBe(false);
		expect(canSave({ ...form, ordered_quantity: '30' }, 'create')).toBe(true);
		expect(canSave({ ...emptyMaterialForm(), ordered_quantity: '30' }, 'create')).toBe(false);
	});

	it('verlangt beim Bearbeiten nur die Bezeichnung — die Menge liegt in der Zeile', () => {
		const form = formFromMaterial(material({ ordered_quantity: 0 }));
		expect(form.ordered_quantity).toBe('0');
		expect(canSave(form, 'edit')).toBe(true);
		expect(canSave({ ...form, name: '  ' }, 'edit')).toBe(false);
	});
});

describe('emptyMaterialForm', () => {
	it('startet mit Stück als Einheit und ohne Werte', () => {
		const form = emptyMaterialForm();
		expect(form.unit).toBe('Stück');
		expect(form.name).toBe('');
		expect(form.ordered_quantity).toBe('');
		expect(form.price_is_net).toBe('true');
	});

	it('trägt die Zuordnung der Gruppe vor (#113)', () => {
		const form = emptyMaterialForm({ station_id: 's1', supplier: 'Brauerei', category: 'Getränke' });
		expect(form.station_id).toBe('s1');
		expect(form.supplier).toBe('Brauerei');
		expect(form.category).toBe('Getränke');
	});
});

describe('formFromMaterial', () => {
	it('zeigt Mengen in Basiseinheiten, nicht in Gebinden', () => {
		const form = formFromMaterial(
			material({ packaging_unit: 'Fass', amount_per_packaging: 50, ordered_quantity: 4, actual_quantity: 2 })
		);
		expect(form.ordered_quantity).toBe('200');
		expect(form.actual_quantity).toBe('100');
	});

	it('lässt leere Felder leer statt „null“ hineinzuschreiben', () => {
		const form = formFromMaterial(material());
		expect(form.actual_quantity).toBe('');
		expect(form.unit_price).toBe('');
		expect(form.tax_rate).toBe('');
		expect(form.notes).toBe('');
	});
});

describe('buildMaterialPayload', () => {
	it('macht eine neue Position in einem Zug vollständig', () => {
		const payload = payloadOf({
			...emptyMaterialForm(),
			name: 'Bier',
			category: 'getränke',
			supplier: 'brauerei schwechat',
			unit: 'Liter',
			ordered_quantity: '300',
			actual_quantity: '250',
			unit_price: '1.8',
			tax_rate: '20',
			price_is_net: 'true'
		});
		expect(payload).toMatchObject({
			festival_id: 'f1',
			name: 'Bier',
			// Freitext wird auf die bekannte Schreibweise gezogen
			category: 'Getränke',
			supplier: 'Brauerei Schwechat',
			unit: 'Liter',
			ordered_quantity: 300,
			actual_quantity: 250,
			unit_price: 1.8,
			tax_rate: 20,
			price_is_net: true
		});
	});

	it('rechnet die getippte Basismenge in Gebinde zurück', () => {
		const form = {
			...emptyMaterialForm(),
			name: 'Bier',
			unit: 'Liter',
			packaging_unit: 'Fass',
			amount_per_packaging: '50',
			ordered_quantity: '200'
		};
		expect(payloadOf(form).ordered_quantity).toBe(4);
	});

	it('bezieht den Preis ohne Gebinde immer auf die Einheit', () => {
		const form: MaterialForm = {
			...emptyMaterialForm(),
			name: 'Servietten',
			ordered_quantity: '500',
			price_per: 'packaging'
		};
		expect(payloadOf(form).price_per).toBe('unit');
		expect(payloadOf(form).packaging_unit).toBeNull();
	});

	it('schreibt leere Stammdaten als null, nicht als leeren Text', () => {
		const payload = payloadOf({ ...emptyMaterialForm(), name: 'Kohle', ordered_quantity: '20' });
		expect(payload.category).toBeNull();
		expect(payload.supplier).toBeNull();
		expect(payload.notes).toBeNull();
		expect(payload.unit_price).toBeNull();
		expect(payload.tax_rate).toBeNull();
		expect(payload.actual_quantity).toBeNull();
	});

	it('nimmt die Bezeichnung ohne Randleerzeichen', () => {
		expect(payloadOf({ ...emptyMaterialForm(), name: '  Bier  ', ordered_quantity: '1' }).name).toBe('Bier');
	});
});

describe('buildMasterDataUpdate', () => {
	const bestand = material({
		name: 'Bier',
		packaging_unit: 'Fass',
		amount_per_packaging: 50,
		ordered_quantity: 4,
		actual_quantity: 3,
		unit_price: 92.5,
		tax_rate: 20,
		price_is_net: true,
		price_per: 'packaging'
	});

	it('fasst beim Bearbeiten keine Menge und keinen Preis an', () => {
		// Der Dialog zeigt diese Spalten nicht — also schreibt er sie auch
		// nicht. Sonst trüge er bei jedem Umbenennen seinen Stand über das,
		// was inzwischen in der Zeile steht (#115).
		const update = stammdatenOf({ ...formFromMaterial(bestand), name: 'Bier hell' });
		expect(update).toEqual({
			festival_id: 'f1',
			station_id: null,
			name: 'Bier hell',
			category: null,
			supplier: null,
			unit: 'Liter',
			packaging_unit: 'Fass',
			amount_per_packaging: 50,
			notes: null
		});
		for (const spalte of ['ordered_quantity', 'actual_quantity', 'unit_price', 'tax_rate']) {
			expect(update).not.toHaveProperty(spalte);
		}
	});

	it('lässt eine korrigierte Gebindegröße die gespeicherte Menge in Ruhe', () => {
		// 4 Fass bleiben 4 Fass — nur ihr Inhalt ändert sich, und das sieht
		// man in der Zeile. Eine Zahl still umzurechnen, die im Dialog gar
		// nicht steht, wäre die schlechtere Überraschung.
		const update = stammdatenOf({ ...formFromMaterial(bestand), amount_per_packaging: '25' });
		expect(update.amount_per_packaging).toBe(25);
		expect(update).not.toHaveProperty('ordered_quantity');
	});
});

describe('isFullPayload', () => {
	it('unterscheidet die volle Nutzlast von der Stammdaten-Änderung', () => {
		const form = { ...emptyMaterialForm(), name: 'Bier', ordered_quantity: '30' };
		expect(isFullPayload(payloadOf(form))).toBe(true);
		expect(isFullPayload(stammdatenOf(form))).toBe(false);
	});
});
