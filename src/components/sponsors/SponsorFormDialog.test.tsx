import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { makeSponsor } from '@/lib/__tests__/sponsoringFactories';
import { buttonByLabel, fieldByLabel, typeInto } from '@/lib/__tests__/domTesting';
import SponsorFormDialog from './SponsorFormDialog';

/* Seam dieses Tests (aus den Akzeptanzkriterien von #150, vor dem ersten Test
   festgehalten): `SponsorFormDialog` ist das **eine** Firmendaten-Formular für
   alle Einstiege — das ⋮ des Sponsorings (#150), „+ SPONSOR → Neue Firma" und
   die Sponsoren-Seite (#101/#159). Es kennt **keinen Fest-Kontext** und keinen
   Datenzugriff: es zeigt die sieben Felder des globalen Sponsors und gibt beim
   Speichern heraus, was drinsteht. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	Element.prototype.scrollIntoView ??= () => {};
});

const roots: Root[] = [];

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
	document.body.innerHTML = '';
});

const brandl = {
	...makeSponsor('Taxi Brandl'),
	contact_person: 'Hr. Bauer',
	email: 'office@brandl.at',
	phone: '0664 111',
	address: 'Hauptstraße 1',
	website: 'https://brandl.at',
	notes: 'Zahlt immer pünktlich'
};

const mount = async (over: Partial<React.ComponentProps<typeof SponsorFormDialog>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	roots.push(root);
	const render = async (props: Partial<React.ComponentProps<typeof SponsorFormDialog>>) => {
		await act(async () => {
			root.render(
				<SponsorFormDialog
					open
					onOpenChange={() => {}}
					sponsor={brandl}
					onSave={() => {}}
					{...over}
					{...props}
				/>
			);
		});
	};
	await render({});
	return render;
};

const feld = (label: string) =>
	fieldByLabel(document.querySelector('[role="dialog"]')!, label);

const druecke = async (label: string) => {
	await act(async () => {
		buttonByLabel(document.body, label).click();
	});
};

describe('SponsorFormDialog — lesen', () => {
	it('zeigt die sieben Stammdaten-Felder der Firma vorbelegt', async () => {
		await mount();

		expect(feld('Firmenname').value).toBe('Taxi Brandl');
		expect(feld('Ansprechpartner').value).toBe('Hr. Bauer');
		expect(feld('E-Mail').value).toBe('office@brandl.at');
		expect(feld('Telefon').value).toBe('0664 111');
		expect(feld('Adresse').value).toBe('Hauptstraße 1');
		expect(feld('Website').value).toBe('https://brandl.at');
		expect(feld('Notizen').value).toBe('Zahlt immer pünktlich');
	});

	it('steht ohne Firma leer da — derselbe Weg legt eine neue an', async () => {
		await mount({ sponsor: null });

		expect(feld('Firmenname').value).toBe('');
		expect(feld('Telefon').value).toBe('');
	});
});

describe('SponsorFormDialog — ändern', () => {
	it('gibt beim Speichern die geänderte Telefonnummer heraus', async () => {
		const onSave = vi.fn();
		await mount({ onSave });

		await act(async () => {
			typeInto(feld('Telefon'), '0664 999');
		});
		await druecke('Speichern');

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ phone: '0664 999' }));
	});

	it('macht aus einem geleerten Feld `null`, nicht einen leeren Text', async () => {
		const onSave = vi.fn();
		await mount({ onSave });

		await act(async () => {
			typeInto(feld('Telefon'), '  ');
		});
		await druecke('Speichern');

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ phone: null }));
	});

	it('besteht auf dem Firmennamen — ohne ihn gibt es keine Firma', async () => {
		const onSave = vi.fn();
		await mount({ onSave });

		await act(async () => {
			typeInto(feld('Firmenname'), '   ');
		});
		await druecke('Speichern');

		expect(onSave).not.toHaveBeenCalled();
	});

	it('schreibt beim Abbrechen nichts', async () => {
		const onSave = vi.fn();
		const onOpenChange = vi.fn();
		await mount({ onSave, onOpenChange });

		await act(async () => {
			typeInto(feld('Telefon'), 'verworfen');
		});
		await druecke('Abbrechen');

		expect(onSave).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('zeigt beim erneuten Öffnen den gespeicherten Stand, nicht den alten Tippstand', async () => {
		const render = await mount();

		await act(async () => {
			typeInto(feld('Telefon'), 'Tippstand');
		});
		await render({ open: false });
		await render({ open: true, sponsor: { ...brandl, phone: '0664 999' } });

		expect(feld('Telefon').value).toBe('0664 999');
	});
});
