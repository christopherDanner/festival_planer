import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* Seam dieses Tests (aus den Abnahmekriterien von #108 abgeleitet, vor dem
   ersten Test festgehalten): `useShiftPlanningActions` verdrahtet die zwei Wege
   der Auto-Zuteilung mit dem Zwischenspeicher. Geprüft wird hier nur, was #108
   verlangt: dass der eingeschränkte Lauf seine Station **mitgibt** und dass
   nach Zuteilen wie Löschen **alle Zähler neu rechnen** — die Ampel-Reiter, das
   KPI-Maßband und der Fokus-Kasten lesen alle aus diesen Abfragen. */

const toast = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/lib/automaticAssignmentService', () => ({
	performAutomaticAssignment: vi.fn(async () => ({
		success: true,
		assignmentsCreated: 4,
		unfilledPositions: [],
		helperStats: []
	})),
	clearAssignments: vi.fn(async () => true)
}));

vi.mock('@/lib/helperService', () => ({
	createHelper: vi.fn(async () => 'h-neu'),
	updateHelper: vi.fn(async () => {}),
	deleteHelper: vi.fn(async () => {})
}));

// Die übrigen Dienste hängt der Hook nur ein; berührt werden sie hier nicht.
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { clearAssignments, performAutomaticAssignment } from '@/lib/automaticAssignmentService';
import { updateHelper } from '@/lib/helperService';
import { useShiftPlanningActions } from './useShiftPlanningActions';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Die fünf Abfragen, aus denen der Schichtplan seine Zahlen zieht. */
const QUERY_KEYS = ['stations', 'stationShifts', 'assignments', 'stationHelpers', 'helpers'];

let actions: ReturnType<typeof useShiftPlanningActions>;
let invalidated: string[];
let unmount: () => void;

const mount = async () => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	});
	invalidated = [];
	client.invalidateQueries = vi.fn(({ queryKey }: { queryKey: unknown[] }) => {
		invalidated.push(queryKey.join(':'));
		return Promise.resolve();
	}) as unknown as QueryClient['invalidateQueries'];

	const Probe = () => {
		actions = useShiftPlanningActions('fest-7');
		return null;
	};
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	unmount = () => root.unmount();
	await act(async () => {
		root.render(
			<QueryClientProvider client={client}>
				<Probe />
			</QueryClientProvider>
		);
	});
};

beforeEach(async () => {
	toast.mockClear();
	vi.mocked(clearAssignments).mockClear().mockResolvedValue(true);
	vi.mocked(performAutomaticAssignment).mockClear();
	vi.mocked(updateHelper).mockClear();
	await mount();
});

afterEach(() => {
	// Ohne Abbau läuft der Zustand des alten Probes in den nächsten Test hinein.
	act(() => unmount());
	document.body.innerHTML = '';
});

describe('useShiftPlanningActions — Löschen mit Umfang', () => {
	it('löscht ohne Station die Zuweisungen des ganzen Fests', async () => {
		await act(async () => {
			await actions.clearAssignments.mutateAsync({});
		});

		expect(clearAssignments).toHaveBeenCalledWith('fest-7', undefined);
	});

	it('gibt die Station mit, wenn der Lauf auf sie eingeschränkt war', async () => {
		await act(async () => {
			await actions.clearAssignments.mutateAsync({ stationId: 'st-1' });
		});

		expect(clearAssignments).toHaveBeenCalledWith('fest-7', 'st-1');
	});

	it('verspricht beim eingeschränkten Löschen nicht „alle"', async () => {
		await act(async () => {
			await actions.clearAssignments.mutateAsync({ stationId: 'st-1' });
		});

		expect(toast.mock.calls.at(-1)?.[0].description).not.toContain('Alle');
	});

	it('meldet den Fehlschlag, statt still nichts zu tun', async () => {
		vi.mocked(clearAssignments).mockResolvedValue(false);

		await act(async () => {
			await actions.clearAssignments.mutateAsync({});
		});

		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});
});

describe('useShiftPlanningActions — die Zähler rechnen sofort neu', () => {
	it('nach dem Zuteilen', async () => {
		await act(async () => {
			await actions.autoAssign.mutateAsync({
				stationShifts: [],
				stations: [],
				helpers: [],
				config: { minShiftsPerHelper: 1, maxShiftsPerHelper: 3, respectPreferences: true },
				stationPreferences: {}
			});
		});

		expect(invalidated).toEqual(QUERY_KEYS.map((key) => `${key}:fest-7`));
	});

	it('nach dem Löschen', async () => {
		await act(async () => {
			await actions.clearAssignments.mutateAsync({ stationId: 'st-1' });
		});

		expect(invalidated).toEqual(QUERY_KEYS.map((key) => `${key}:fest-7`));
	});

	it('auch dann, wenn das Löschen fehlschlug — der Bestand ist dann unbekannt', async () => {
		vi.mocked(clearAssignments).mockResolvedValue(false);

		await act(async () => {
			await actions.clearAssignments.mutateAsync({});
		});

		expect(invalidated).toEqual(QUERY_KEYS.map((key) => `${key}:fest-7`));
	});
});

/* Seam dieses Blocks (aus dem dritten Abnahmekriterium von #107 abgeleitet):
   „Die Gruppierung ‚Wünschen sich diese Station' reagiert sofort auf geänderte
   Wünsche." Die Gruppierung rechnet in `buildHelperRoster` über
   `helper.station_preferences` — sie ist also genau dann sofort richtig, wenn
   das Speichern des Helfer-Blatts die Helfer-Abfrage verwirft. */
describe('useShiftPlanningActions — das Helfer-Blatt (#107)', () => {
	const BLATT = {
		first_name: 'Franz',
		last_name: 'Hochauer',
		email: '',
		phone: '',
		notes: '',
		station_preferences: ['st-1'],
		shift_preferences: ['sh-1']
	};

	it('schreibt Stammdaten und Wünsche mit einem Zug', async () => {
		await act(async () => {
			await actions.updateHelper.mutateAsync({ id: 'h1', updates: BLATT });
		});

		expect(updateHelper).toHaveBeenCalledTimes(1);
		expect(updateHelper).toHaveBeenCalledWith('fest-7', 'h1', BLATT);
	});

	it('lässt die Helferliste danach neu gruppieren', async () => {
		await act(async () => {
			await actions.updateHelper.mutateAsync({ id: 'h1', updates: BLATT });
		});

		expect(invalidated).toContain('helpers:fest-7');
	});
});
