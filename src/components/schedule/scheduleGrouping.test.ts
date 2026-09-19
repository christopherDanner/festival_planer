import { describe, it, expect } from 'vitest';
import {
	scheduleDay as day,
	scheduleEntry as entry,
	schedulePhase as phase
} from '@/lib/__tests__/scheduleFactories';
import { groupEntriesByPhase } from './scheduleGrouping';

describe('groupEntriesByPhase', () => {
	it('stellt Einträge ohne Phase direkt unter den Tag — vor die Phasen', () => {
		const groups = groupEntriesByPhase(
			day({
				phases: [phase({ id: 'p1', name: 'Aufbau' })],
				entries: [
					entry({ id: 'e1', schedule_phase_id: 'p1' }),
					entry({ id: 'e2', schedule_phase_id: null })
				]
			})
		);

		expect(groups.map((g) => g.phase?.id ?? null)).toEqual([null, 'p1']);
		expect(groups[0].entries.map((e) => e.id)).toEqual(['e2']);
		expect(groups[1].entries.map((e) => e.id)).toEqual(['e1']);
	});

	it('lässt die Gruppe ohne Phase weg, wenn jeder Eintrag eine Phase hat', () => {
		const groups = groupEntriesByPhase(
			day({
				phases: [phase({ id: 'p1' })],
				entries: [entry({ id: 'e1', schedule_phase_id: 'p1' })]
			})
		);

		expect(groups.map((g) => g.phase?.id ?? null)).toEqual(['p1']);
	});

	it('behält leere Phasen — sie bleiben benennbar und löschbar', () => {
		const groups = groupEntriesByPhase(
			day({ phases: [phase({ id: 'p1' }), phase({ id: 'p2', name: 'Abbau', sort_order: 1 })] })
		);

		expect(groups.map((g) => g.phase?.id)).toEqual(['p1', 'p2']);
		expect(groups.every((g) => g.entries.length === 0)).toBe(true);
	});

	it('folgt der Reihenfolge der Phasen-Liste, nicht der der Einträge', () => {
		const groups = groupEntriesByPhase(
			day({
				phases: [phase({ id: 'p1' }), phase({ id: 'p2', sort_order: 1 })],
				entries: [
					entry({ id: 'e1', schedule_phase_id: 'p2' }),
					entry({ id: 'e2', schedule_phase_id: 'p1' })
				]
			})
		);

		expect(groups.map((g) => g.phase?.id)).toEqual(['p1', 'p2']);
	});

	it('behält innerhalb einer Gruppe die Reihenfolge des Tages — der Service reiht', () => {
		const groups = groupEntriesByPhase(
			day({
				phases: [phase({ id: 'p1' })],
				entries: [
					entry({ id: 'früh', schedule_phase_id: 'p1', start_time: '08:00:00' }),
					entry({ id: 'spät', schedule_phase_id: 'p1', start_time: '18:00:00' }),
					entry({ id: 'ohne', schedule_phase_id: 'p1', start_time: null })
				]
			})
		);

		expect(groups[0].entries.map((e) => e.id)).toEqual(['früh', 'spät', 'ohne']);
	});

	it('hängt Einträge einer unbekannten Phase unter den Tag, statt sie zu verlieren', () => {
		const groups = groupEntriesByPhase(
			day({ phases: [], entries: [entry({ id: 'e1', schedule_phase_id: 'weg' })] })
		);

		expect(groups.map((g) => g.phase)).toEqual([null]);
		expect(groups[0].entries.map((e) => e.id)).toEqual(['e1']);
	});

	it('ein Tag ohne alles ergibt keine Gruppe', () => {
		expect(groupEntriesByPhase(day())).toEqual([]);
	});
});
