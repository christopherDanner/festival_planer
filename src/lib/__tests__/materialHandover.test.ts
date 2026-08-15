import { describe, it, expect } from 'vitest';
import { groupRowsByStation, handoverStamp, handoverSummary, sourceFestivalOptions } from '../materialHandover';
import type { Festival } from '../festivalService';
import type { MatchRow, MatchRowStatus } from '../materialMatcher';

function festival(over: Partial<Festival> & { id: string; start_date: string }): Festival {
	return {
		user_id: 'u1',
		name: 'Fest',
		created_at: '',
		updated_at: '',
		...over
	};
}

function row(
	over: Partial<MatchRow> & { name: string } & { status?: MatchRowStatus }
): MatchRow {
	return {
		key: `k-${over.name}-${over.stationName ?? ''}`,
		status: 'match',
		normalizedName: over.name.toLowerCase(),
		stationName: null,
		targetMaterial: null,
		sourceMaterials: [],
		srcOrderedTotal: null,
		srcActualTotal: null,
		srcAggregateCount: 0,
		supplier: null,
		category: null,
		unit: 'Stück',
		packagingUnit: null,
		amountPerPackaging: null,
		targetOrderedQuantity: null,
		sourceDetails: [],
		...over
	};
}

describe('sourceFestivalOptions — welches Fest als Quellfest infrage kommt', () => {
	it('bietet die anderen Feste an, das jüngste zuerst', () => {
		const options = sourceFestivalOptions(
			[
				festival({ id: 'a', name: 'Fest 2024', start_date: '2024-07-01' }),
				festival({ id: 'b', name: 'Fest 2026', start_date: '2026-07-01' }),
				festival({ id: 'c', name: 'Fest 2025', start_date: '2025-07-01' })
			],
			'b'
		);

		expect(options.map((f) => f.id)).toEqual(['c', 'a']);
	});

	it('lässt das Zielfest aus — aus dessen Material-Tab kommt man ja', () => {
		const options = sourceFestivalOptions(
			[
				festival({ id: 'ziel', start_date: '2026-07-01' }),
				festival({ id: 'quelle', start_date: '2025-07-01' })
			],
			'ziel'
		);

		expect(options.map((f) => f.id)).toEqual(['quelle']);
	});

	it('gibt für ein Fest ohne Vorgänger nichts her — dann ist kein Quellfest wählbar', () => {
		expect(sourceFestivalOptions([festival({ id: 'ziel', start_date: '2026-07-01' })], 'ziel')).toEqual(
			[]
		);
	});
});

describe('groupRowsByStation — die Kästen der Übernahme', () => {
	it('legt je Station einen Kasten an, alphabetisch, Zeilen nach Namen sortiert', () => {
		const groups = groupRowsByStation([
			row({ name: 'Wein', stationName: 'Ausschank' }),
			row({ name: 'Kohle', stationName: 'Grill' }),
			row({ name: 'Bier', stationName: 'Ausschank' })
		]);

		expect(groups.map((g) => g.name)).toEqual(['Ausschank', 'Grill']);
		expect(groups[0].rows.map((r) => r.name)).toEqual(['Bier', 'Wein']);
		expect(groups[0].count).toBe(2);
	});

	it('stellt die Positionen ohne Station als vollwertigen Kasten ans Ende', () => {
		const groups = groupRowsByStation([
			row({ name: 'Zelt', stationName: null }),
			row({ name: 'Bier', stationName: 'Ausschank' })
		]);

		expect(groups.map((g) => g.name)).toEqual(['Ausschank', 'Ohne Station']);
		expect(groups[1].unassigned).toBe(true);
	});

	it('zählt je Kasten, wie viele Positionen im Zielfest neu angelegt würden', () => {
		const groups = groupRowsByStation([
			row({ name: 'Bier', stationName: 'Ausschank', status: 'match' }),
			row({ name: 'Spritzwein', stationName: 'Ausschank', status: 'only-source' }),
			row({ name: 'Wein', stationName: 'Ausschank', status: 'only-target' })
		]);

		expect(groups[0].count).toBe(3);
		expect(groups[0].newCount).toBe(1);
	});

	it('vergibt je Station einen eigenen, stabilen Schlüssel für den Reiter', () => {
		const groups = groupRowsByStation([
			row({ name: 'Bier', stationName: 'Ausschank' }),
			row({ name: 'Kohle', stationName: 'Grill' })
		]);

		expect(new Set(groups.map((g) => g.id)).size).toBe(2);
		expect(groups[0].id).toBe(groupRowsByStation([row({ name: 'Bier', stationName: 'Ausschank' })])[0].id);
	});
});

describe('handoverStamp — was der Stempel einer Zeile sagt', () => {
	it('meldet eine Zeile mit gespeicherter Wunschmenge als übernommen', () => {
		const stamp = handoverStamp(row({ name: 'Bier' }), '18', { status: 'saved' });

		expect(stamp.kind).toBe('saved');
		expect(stamp.label).toBe('✓ GESPEICHERT');
	});

	it('zählt eine vorgefundene Bestellmenge des Zielfests schon als übernommen', () => {
		const stamp = handoverStamp(
			row({ name: 'Bier', status: 'match', targetOrderedQuantity: 18 }),
			'18',
			undefined
		);

		expect(stamp.kind).toBe('saved');
	});

	it('kündigt bei einer Zeile, die es nur im Quellfest gibt, das Anlegen an', () => {
		const stamp = handoverStamp(row({ name: 'Spritzwein', status: 'only-source' }), '', undefined);

		expect(stamp.kind).toBe('new');
		expect(stamp.label).toBe('WIRD NEU ANGELEGT');
	});

	it('lässt eine Zeile ohne Wunschmenge ausdrücklich aus', () => {
		const stamp = handoverStamp(row({ name: 'Kotelett', status: 'match' }), '', undefined);

		expect(stamp.kind).toBe('skip');
		expect(stamp.label).toBe('NICHT ÜBERNEHMEN');
	});

	it('nimmt eine 0 nicht für eine Wunschmenge', () => {
		expect(handoverStamp(row({ name: 'Kotelett' }), '0', undefined).kind).toBe('skip');
	});

	it('behauptet nichts, solange eine getippte Menge noch nicht abgeschickt ist', () => {
		const stamp = handoverStamp(row({ name: 'Bier', status: 'match' }), '18', undefined);

		expect(stamp.kind).toBe('pending');
		expect(stamp.label).toBe('NOCH NICHT GESPEICHERT');
	});

	it('sagt während des Speicherns, dass gerade gespeichert wird', () => {
		expect(handoverStamp(row({ name: 'Bier' }), '18', { status: 'saving' }).kind).toBe('saving');
	});

	it('reicht die Fehlermeldung eines missglückten Speicherns durch', () => {
		const stamp = handoverStamp(row({ name: 'Bier' }), '18', {
			status: 'error',
			error: 'Netzwerk weg'
		});

		expect(stamp.kind).toBe('error');
		expect(stamp.error).toBe('Netzwerk weg');
	});

	it('lässt den Fehler stehen, auch wenn die Zeile nur im Quellfest steht', () => {
		const stamp = handoverStamp(row({ name: 'Spritzwein', status: 'only-source' }), '8', {
			status: 'error'
		});

		expect(stamp.kind).toBe('error');
	});
});

describe('handoverSummary — die Fußleiste der Übernahme', () => {
	it('zählt übernommene, neu anzulegende und ausgelassene Zeilen auseinander', () => {
		const rows = [
			row({ name: 'Bier', status: 'match', targetOrderedQuantity: 18 }),
			row({ name: 'Almdudler', status: 'match', targetOrderedQuantity: 12 }),
			row({ name: 'Spritzwein', status: 'only-source' }),
			row({ name: 'Kotelett', status: 'match' })
		];

		const summary = handoverSummary(rows, { 'k-Bier-': '18', 'k-Almdudler-': '12' }, {});

		expect(summary.saved).toBe(2);
		expect(summary.created).toBe(1);
		expect(summary.skipped).toBe(1);
		expect(summary.failed).toBe(0);
	});

	it('führt missglückte Zeilen getrennt, damit sie nicht als übernommen durchgehen', () => {
		const rows = [row({ name: 'Bier', status: 'match', targetOrderedQuantity: 18 })];

		const summary = handoverSummary(rows, { 'k-Bier-': '20' }, {
			'k-Bier-': { status: 'error', error: 'Netzwerk weg' }
		});

		expect(summary.failed).toBe(1);
		expect(summary.saved).toBe(0);
	});
});
