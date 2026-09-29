import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import StationFocusBox, { type TargetHandles } from './StationFocusBox';
import type { AssignmentPickerSnapshot } from '@/lib/shiftAssignmentPicker';
import { buildStationBoard } from '@/lib/shiftBoard';
import type {
	Station,
	StationShift,
	ShiftAssignmentWithHelper,
	StationHelperWithDetails
} from '@/lib/shiftService';

/**
 * Der Fokus-Kasten einer Station (#102). Zwei Zweige, beide vollständig:
 * mit Schichten die Tages-Zwischentitel samt Schicht-Zeilen, ohne Schichten
 * ein Platz-Raster über `required_people` (Entscheid 1 aus #68).
 */

const noop = () => {};

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Ausschank',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function shift(over: Partial<StationShift> = {}): StationShift {
	return {
		id: 'sh1',
		festival_id: 'f1',
		station_id: 's1',
		name: '',
		start_date: '2026-07-25',
		start_time: '11:00',
		end_time: '15:00',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function assignment(over: Partial<ShiftAssignmentWithHelper> = {}): ShiftAssignmentWithHelper {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		helper_id: 'h1',
		position: 1,
		created_at: '',
		updated_at: '',
		helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' },
		...over
	};
}

function member(over: Partial<StationHelperWithDetails> = {}): StationHelperWithDetails {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: 's1',
		helper_id: 'h9',
		created_at: '',
		helper: { id: 'h9', first_name: 'Roman', last_name: 'Aigner' },
		...over
	};
}

/** Die Geste im Ruhezustand: nichts gewählt, nichts überfahren, nichts
abgelehnt. Die Tests, die sie brauchen, setzen einzelne Felder um. */
const ruhe: AssignmentPickerSnapshot = {
	picked: null,
	armed: false,
	overKey: null,
	rejected: null
};

/** Griffe, die nichts tun — der lesende Test greift nicht zu. */
const stillGreifen: TargetHandles = {
	dragOver: () => false,
	dragLeave: noop,
	assign: noop
};

const render = (
	s: Station,
	shifts: StationShift[],
	assignments: ShiftAssignmentWithHelper[] = [],
	members: StationHelperWithDetails[] = [],
	gesture: AssignmentPickerSnapshot = ruhe
) =>
	renderToStaticMarkup(
		<StationFocusBox
			board={buildStationBoard(s, shifts, assignments, members)}
			gesture={gesture}
			picker={stillGreifen}
			onAutoFill={noop}
			onEditStation={noop}
			onDeleteStation={noop}
			onAddShift={noop}
			onEditShift={noop}
			onDeleteShift={noop}
			onRemoveFromShift={noop}
			onRemoveFromStation={noop}
		/>
	);

// --- Kopf --------------------------------------------------------------------

describe('StationFocusBox — grüner Kopf', () => {
	it('nennt Station, Ort, Verantwortlichen und die offenen Plätze', () => {
		const html = render(
			station({
				description: 'Zelt Nord',
				responsible_helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }
			}),
			[shift({ required_people: 4 })],
			[assignment()]
		);

		expect(html).toContain('Ausschank');
		expect(html).toContain('Zelt Nord');
		expect(html).toContain('Hochauer Franz');
		expect(html).toContain('3 Plätze offen');
	});

	it('sagt bei voller Station, dass nichts offen ist', () => {
		const html = render(station(), [shift({ required_people: 1 })], [assignment()]);

		expect(html).toContain('voll besetzt');
		expect(html).not.toContain('Plätze offen');
	});

	it('trägt den gelben Knopf für die Auto-Füllung dieser Station', () => {
		// Versalien setzt die Schrift, nicht der Text (`uppercase`).
		expect(render(station(), [shift({ required_people: 1 })])).toMatch(
			/bg-gelb[^>]*uppercase[^>]*>Nur diese Station auto-füllen</
		);
	});

	it('legt Bearbeiten und Löschen in ein ⋮-Menü', () => {
		expect(render(station(), [shift()])).toContain('Menü der Station');
	});
});

// --- Löschen nur über das ⋮ (#106) -------------------------------------------

describe('StationFocusBox — Löschen liegt hinter den beiden ⋮-Menüs', () => {
	it('trägt kein Löschen im Kasten selbst — weder am Kopf noch an der Zeile', () => {
		const markup = render(station(), [shift({ required_people: 1 })], [assignment()]);

		expect(markup).toContain('Menü der Station');
		expect(markup).toContain('Menü der Schicht 11–15');
		expect(markup.toLowerCase()).not.toContain('löschen');
	});

	it('gibt der Pseudo-Zeile „GANZES FEST" kein Schicht-Menü — es gibt keine Schicht', () => {
		const markup = render(station({ required_people: 2 }), []);

		expect(markup).toContain('GANZES FEST');
		expect(markup).not.toContain('Menü der Schicht');
	});
});

describe('StationFocusBox — die Rückfragen kennen den Kasten', () => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

	beforeAll(() => {
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
		Element.prototype.scrollIntoView ??= () => {};
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	const mount = async (props: Partial<React.ComponentProps<typeof StationFocusBox>>) => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		await act(async () => {
			createRoot(host).render(
				<StationFocusBox
					board={buildStationBoard(
						station(),
						[shift({ required_people: 2, name: 'Frühschoppen' })],
						[assignment()],
						[member()]
					)}
					gesture={ruhe}
					picker={stillGreifen}
					onAutoFill={noop}
					onEditStation={noop}
					onDeleteStation={noop}
					onAddShift={noop}
					onEditShift={noop}
					onDeleteShift={noop}
					onRemoveFromShift={noop}
					onRemoveFromStation={noop}
					{...props}
				/>
			);
		});
	};

	const oeffneMenue = async (label: string) => {
		await act(async () => {
			document
				.querySelector(`[aria-label="${label}"]`)
				?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});
		await act(async () => {
			[...document.querySelectorAll('[role="menuitem"]')]
				.find((el) => (el.textContent ?? '').includes('löschen'))
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		return document.querySelector('[role="alertdialog"]')?.textContent ?? '';
	};

	it('nennt beim Löschen der Station ihre Schichten und Zuteilungen', async () => {
		await mount({});

		const frage = await oeffneMenue('Menü der Station');
		expect(frage).toContain('Ausschank');
		// Eine Schicht mit einer Zuteilung plus ein Stationsmitglied.
		expect(frage).toContain('1 Schicht');
		expect(frage).toContain('2 Zuteilungen');
	});

	it('nennt beim Löschen der Schicht deren Tag, Zeit und Besetzung', async () => {
		await mount({});

		const frage = await oeffneMenue('Menü der Schicht 11–15');
		expect(frage).toContain('Frühschoppen');
		expect(frage).toContain('Samstag 25. Juli');
		expect(frage).toContain('1 Zuteilung');
	});

	it('meldet die Schicht-Id, sobald die Rückfrage bejaht ist', async () => {
		const onDeleteShift = vi.fn();
		await mount({ onDeleteShift });
		await oeffneMenue('Menü der Schicht 11–15');

		await act(async () => {
			[...document.querySelectorAll('[role="alertdialog"] button')]
				.find((b) => b.textContent?.trim() === 'Löschen')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onDeleteShift).toHaveBeenCalledWith('sh1');
	});
});

// --- Station mit Schichten ---------------------------------------------------

describe('StationFocusBox — Station mit Schichten', () => {
	const shifts = [
		shift({
			id: 'sh-sa',
			start_date: '2026-07-25',
			start_time: '11:00',
			end_time: '15:00',
			required_people: 2,
			name: 'Frühschoppen'
		}),
		shift({
			id: 'sh-nacht',
			start_date: '2026-07-25',
			end_date: '2026-07-26',
			start_time: '23:00',
			end_time: '02:00',
			required_people: 1
		}),
		shift({ id: 'sh-so', start_date: '2026-07-26', start_time: '09:00', end_time: '13:00', required_people: 1 })
	];
	// Frühschoppen voll besetzt, Nacht- und Sonntagsschicht leer.
	const html = () =>
		render(station(), shifts, [
			assignment({ station_shift_id: 'sh-sa' }),
			assignment({
				id: 'a2',
				station_shift_id: 'sh-sa',
				helper_id: 'h2',
				position: 2,
				helper: { id: 'h2', first_name: 'Maria', last_name: 'Leitner' }
			})
		]);

	it('setzt je Tag einen grünen Zwischentitel mit Schicht- und Offen-Zähler', () => {
		expect(html()).toContain('Samstag 25. Juli');
		expect(html()).toContain('2 Schichten');
		expect(html()).toContain('1 offen');
		expect(html()).toContain('Sonntag 26. Juli');
	});

	it('nennt einen vollen Tag voll besetzt, statt eine Null zu zeigen', () => {
		const voll = render(
			station(),
			[shift({ id: 'sh-sa', required_people: 1 })],
			[assignment({ station_shift_id: 'sh-sa' })]
		);

		expect(voll).toContain('voll besetzt');
		expect(voll).not.toContain('0 offen');
	});

	it('schreibt Zeit, Name und Plätze in die Schicht-Zeile', () => {
		expect(html()).toContain('11–15');
		expect(html()).toContain('Frühschoppen · 2 Plätze');
	});

	it('macht die Schicht über Mitternacht am Zeit-Chip explizit', () => {
		expect(html()).toContain('23–02 +1');
	});

	it('stempelt den Status der Zeile — offen rot, voll grün', () => {
		expect(html()).toMatch(/text-rot[^>]*>1 OFFEN</);
		expect(html()).toMatch(/text-gruen[^>]*>VOLL</);
	});

	it('zeigt belegte Plätze mit Nummer und Namen, freie als roten Platzhalter', () => {
		const markup = html();

		expect(markup).toContain('Hochauer Franz');
		expect(markup).toContain('+ HELFER HIER EINTRAGEN');
		expect(markup).toContain('minmax(150px,1fr)');
	});

	it('führt die Stationsmitglieder ohne Schicht in der Fußzeile', () => {
		const markup = render(station(), shifts, [], [member()]);

		expect(markup).toContain('Stationsmitglieder ohne Schicht');
		expect(markup).toContain('Aigner Roman');
	});

	it('meldet nicht „voll besetzt", solange ein freier Platz im Kasten steht', () => {
		// Frühschicht überbesetzt (3 auf 2), Nachtschicht halb leer: roh gezählt
		// wären das 4/4 — Kopf und Tages-Zwischentitel widersprächen einander.
		const markup = render(
			station(),
			[
				shift({ id: 'sh-sa', required_people: 2, start_time: '11:00' }),
				shift({ id: 'sh-spaet', required_people: 2, start_time: '19:00' })
			],
			[
				assignment({ id: 'a1', station_shift_id: 'sh-sa', helper_id: 'h1', position: 1 }),
				assignment({ id: 'a2', station_shift_id: 'sh-sa', helper_id: 'h2', position: 2 }),
				assignment({ id: 'a3', station_shift_id: 'sh-sa', helper_id: 'h3', position: 3 }),
				assignment({ id: 'a4', station_shift_id: 'sh-spaet', helper_id: 'h4', position: 1 })
			]
		);

		expect(markup).toContain('1 Plätze offen');
		expect(markup).not.toContain('voll besetzt');
		expect(markup).toContain('+ HELFER HIER EINTRAGEN');
	});

	it('bietet am Fuß das Anlegen einer Schicht an', () => {
		expect(html()).toContain('+ Schicht anlegen');
		expect(html()).not.toContain('Zeitfenster');
	});
});

// --- Station ohne Schichten --------------------------------------------------

describe('StationFocusBox — Station ohne Schichten', () => {
	const s = station({ required_people: 3 });
	const html = () => render(s, [], [], [member()]);

	it('zeigt statt Schicht-Zeilen ein Platz-Raster über das ganze Fest', () => {
		expect(html()).toContain('GANZES FEST');
		expect(html()).toContain('Keine Schichten · 3 Plätze');
	});

	it('füllt das Raster aus den Stationsmitgliedern und lässt den Rest offen', () => {
		const markup = html();

		expect(markup).toContain('Aigner Roman');
		expect(markup.split('+ HELFER HIER EINTRAGEN').length - 1).toBe(2);
	});

	it('trägt denselben Status wie eine Schicht-Zeile', () => {
		expect(html()).toMatch(/text-rot[^>]*>2 OFFEN</);
	});

	it('lässt die Fußzeile weg — dieselben Leute stehen schon im Raster', () => {
		expect(html()).not.toContain('Stationsmitglieder ohne Schicht');
	});

	it('erklärt am Knopf, was eine Schicht hier bewirkt', () => {
		expect(html()).toContain('Station in Zeitfenster aufteilen');
	});
});

// --- Zuteilen (#104) ---------------------------------------------------------

/* Seam dieses Blocks (aus den Abnahmekriterien von #104 abgeleitet): der
   Fokus-Kasten zeichnet den Zuteil-Zustand und meldet **ein** Ziel je Zeile
   zurück. Ob ein Versuch angenommen wird, entscheidet er nicht — das tut
   `shiftAssignment`; hier steht nur, was man sieht und was man greifen kann. */

describe('StationFocusBox — der scharfe Zustand', () => {
	const s = station();
	const shifts = [shift({ id: 'sh1', required_people: 2 })];

	it('lässt freie Plätze im Ruhezustand gestrichelt-rot', () => {
		const markup = render(s, shifts);

		expect(markup).toMatch(/border-dashed[^>]*border-rot/);
		expect(markup).not.toContain('border-solid');
		expect(markup).not.toContain('shadow-[inset_0_0_0_2px_oklch(var(--gelb))]');
	});

	it('macht alle freien Plätze scharf, sobald eine Marke gewählt ist', () => {
		const markup = render(s, shifts, [], [], { ...ruhe, armed: true });

		// Gelber Innenschein, Rahmen von gestrichelt-rot auf durchgezogen-Tinte.
		expect(markup.match(/border-solid border-tinte/g)).toHaveLength(2);
		expect(markup).toContain('shadow-[inset_0_0_0_2px_oklch(var(--gelb))]');
	});

	it('hebt beim Ziehen nur die überfahrene Zeile hervor', () => {
		const zwei = [
			shift({ id: 'sh1', required_people: 1, start_time: '11:00' }),
			shift({ id: 'sh2', required_people: 1, start_time: '15:00' })
		];
		const markup = render(s, zwei, [], [], { ...ruhe, overKey: 'sh2' });

		expect(markup.match(/border-solid border-tinte/g)).toHaveLength(1);
	});

	it('nennt den freien Platz nicht mehr nach einer einzigen Geste', () => {
		// „ZIEHEN" wäre nur der halbe Weg — angetippt wird er genauso (#104).
		const markup = render(s, shifts);

		expect(markup).toContain('+ HELFER HIER EINTRAGEN');
		expect(markup).not.toContain('ZIEHEN');
	});

	it('macht auch die Mitglieder-Fußzeile scharf — sie ist ein Ziel wie jede Zeile', () => {
		const ruhig = render(s, shifts, [], [member()]);
		const scharf = render(s, shifts, [], [member()], { ...ruhe, armed: true });

		expect(ruhig).not.toContain('bg-[oklch(0.97_0.03_92)]');
		// Zwei freie Plätze plus die Fußzeile — sie nimmt nur den Innenschein,
		// ihren Rahmen bringt der Kasten mit.
		expect(scharf.match(/shadow-\[inset_0_0_0_2px_oklch\(var\(--gelb\)\)\]/g)).toHaveLength(3);
	});

	it('hebt beim Überfahren der Fußzeile nur sie hervor', () => {
		const markup = render(s, shifts, [], [member()], { ...ruhe, overKey: 'station:s1' });

		expect(markup.match(/shadow-\[inset_0_0_0_2px_oklch\(var\(--gelb\)\)\]/g)).toHaveLength(1);
	});
});

describe('StationFocusBox — Ablehnung als Rot-Puls', () => {
	const s = station();
	const shifts = [shift({ id: 'sh1', required_people: 2 })];

	it('lässt die abgelehnte Zeile rot pulsen statt zu toasten', () => {
		const markup = render(s, shifts, [], [], {
			...ruhe,
			rejected: { key: 'sh1', reason: 'full', kind: 'shift', nonce: 1 }
		});

		expect(markup).toContain('animate-puls-rot');
	});

	it('sagt den Grund an, damit der Puls nicht nur fürs Auge ist', () => {
		const markup = render(s, shifts, [], [], {
			...ruhe,
			rejected: { key: 'sh1', reason: 'duplicate', kind: 'shift', nonce: 1 }
		});

		expect(markup).toMatch(/role="status"[^>]*class="sr-only"/);
		expect(markup).toContain('Dieser Helfer steht schon in dieser Schicht.');
	});

	it('hält den Ansage-Bereich auch ohne Ablehnung bereit', () => {
		// Eine Live-Region, die mitsamt ihrem Inhalt entsteht, sagen Screenreader
		// in der Regel nicht an — sie muss stehen und nur ihren Text wechseln.
		expect(render(s, shifts)).toMatch(/role="status"[^>]*class="sr-only"/);
	});

	it('pulst nur an der Zeile, die abgelehnt hat', () => {
		const markup = render(s, shifts, [], [], {
			...ruhe,
			rejected: { key: 'sh-woanders', reason: 'duplicate', kind: 'shift', nonce: 1 }
		});

		expect(markup).not.toContain('animate-puls-rot');
	});

	it('pulst auch an der Fußzeile der Stationsmitglieder', () => {
		const markup = render(s, shifts, [], [member()], {
			...ruhe,
			rejected: { key: 'station:s1', reason: 'duplicate', kind: 'station', nonce: 1 }
		});

		expect(markup).toContain('animate-puls-rot');
		expect(markup).toContain('Dieser Helfer steht schon in dieser Station.');
	});
});

describe('StationFocusBox — beide Wege führen zum selben Griff', () => {
	const mountBox = async (picker: Partial<TargetHandles>, gesture = ruhe) => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const root = createRoot(host);
		await act(async () => {
			root.render(
				<StationFocusBox
					board={buildStationBoard(station(), [shift({ id: 'sh1', required_people: 1 })], [], [])}
					gesture={gesture}
					picker={{ ...stillGreifen, ...picker }}
					onAutoFill={noop}
					onEditStation={noop}
					onDeleteStation={noop}
					onAddShift={noop}
					onEditShift={noop}
					onDeleteShift={noop}
					onRemoveFromShift={noop}
					onRemoveFromStation={noop}
				/>
			);
		});
		// Abbauen **und** abhängen: sonst stehen die Wurzeln der Vortests noch im
		// Dokument und `querySelector` griffe in die falsche.
		return () => {
			act(() => root.unmount());
			host.remove();
		};
	};

	const zeile = () => document.querySelector('.relative.border-b')!;

	it('meldet beim Antippen eines freien Platzes das Ziel der Zeile', async () => {
		const assign = vi.fn();
		const unmount = await mountBox({ assign }, { ...ruhe, armed: true });

		await act(async () => {
			document
				.querySelector('button.border-1\\.5')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(assign).toHaveBeenCalledWith({ kind: 'shift', shiftId: 'sh1' });
		unmount();
	});

	it('meldet beim Fallenlassen dasselbe Ziel — ein Griff für beide Wege', async () => {
		const assign = vi.fn();
		const unmount = await mountBox({ assign });

		await act(async () => {
			zeile().dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
		});

		expect(assign).toHaveBeenCalledWith({ kind: 'shift', shiftId: 'sh1' });
		unmount();
	});

	it('hält den Cursor beim Überfahren nur auf, wenn das Ziel annimmt', async () => {
		const unmount = await mountBox({ dragOver: () => true });

		const angenommen = new Event('dragover', { bubbles: true, cancelable: true });
		await act(async () => {
			zeile().dispatchEvent(angenommen);
		});

		expect(angenommen.defaultPrevented).toBe(true);
		unmount();
	});

	it('lässt den Cursor „geht nicht" sagen, wo nichts angenommen wird', async () => {
		const unmount = await mountBox({ dragOver: () => false });

		const abgelehnt = new Event('dragover', { bubbles: true, cancelable: true });
		await act(async () => {
			zeile().dispatchEvent(abgelehnt);
		});

		expect(abgelehnt.defaultPrevented).toBe(false);
		unmount();
	});
});
