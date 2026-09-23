import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';
import SponsoringNoteDialog from './SponsoringNoteDialog';

/* Seam dieses Tests (aus den Akzeptanzkriterien von #150, vor dem ersten Test
   festgehalten): `SponsoringNoteDialog` zeigt `sponsorings.notes` als Freitext
   und gibt beim Speichern heraus, was drinsteht — `null`, wenn nichts mehr
   drinsteht. Kein Zettel: eine Notiz ist ein Satz, kein Ein-Wert-Vorgang.
   Geschrieben wird woanders (SponsoringsSection). */

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

const mount = async (over: Partial<React.ComponentProps<typeof SponsoringNoteDialog>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	roots.push(root);
	const render = async (props: Partial<React.ComponentProps<typeof SponsoringNoteDialog>>) => {
		await act(async () => {
			root.render(
				<SponsoringNoteDialog
					open
					onOpenChange={() => {}}
					companyName="Taxi Brandl"
					notes={null}
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

const feld = () => document.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')!;

const druecke = async (label: string) => {
	await act(async () => {
		buttonByLabel(document.body, label).click();
	});
};

describe('SponsoringNoteDialog', () => {
	it('zeigt die erfasste Notiz der Firma', async () => {
		await mount({ notes: 'Zusage per Mail 12.03., Kontakt Hr. Bauer' });

		expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Taxi Brandl');
		expect(feld().value).toBe('Zusage per Mail 12.03., Kontakt Hr. Bauer');
	});

	it('gibt beim Speichern heraus, was getippt wurde', async () => {
		const onSave = vi.fn();
		await mount({ onSave });

		await act(async () => {
			typeInto(feld(), 'Ruft nächste Woche zurück');
		});
		await druecke('Speichern');

		expect(onSave).toHaveBeenCalledWith('Ruft nächste Woche zurück');
	});

	it('macht aus einer geleerten Notiz `null`, nicht einen leeren Satz', async () => {
		const onSave = vi.fn();
		await mount({ notes: 'Alt', onSave });

		await act(async () => {
			typeInto(feld(), '   ');
		});
		await druecke('Speichern');

		expect(onSave).toHaveBeenCalledWith(null);
	});

	it('schreibt beim Abbrechen nichts', async () => {
		const onSave = vi.fn();
		const onOpenChange = vi.fn();
		await mount({ notes: 'Alt', onSave, onOpenChange });

		await act(async () => {
			typeInto(feld(), 'Verworfen');
		});
		await druecke('Abbrechen');

		expect(onSave).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('zeigt beim erneuten Öffnen den gespeicherten Stand, nicht den alten Tippstand', async () => {
		// Akzeptanzkriterium aus #150: „Eine Notiz bleibt nach dem Speichern
		// erhalten und ist beim erneuten Öffnen da."
		const render = await mount({ notes: null });

		await act(async () => {
			typeInto(feld(), 'Tippstand');
		});
		await render({ open: false });
		await render({ open: true, notes: 'Gespeicherter Stand' });

		expect(feld().value).toBe('Gespeicherter Stand');
	});
});
