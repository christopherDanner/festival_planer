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

// Die übrigen Dienste hängt der Hook nur ein; berührt werden sie hier nicht.
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { clearAssignments, performAutomaticAssignment } from '@/lib/automaticAssignmentService';
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
