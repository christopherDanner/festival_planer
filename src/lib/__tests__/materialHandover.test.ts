import { describe, it, expect } from 'vitest';
import {
	groupRowsByStation,
	handoverStamp,
	handoverSummary,
	searchHandoverRows,
	sourceFestivalOptions
} from '../materialHandover';
import type { Festival } from '../festivalService';
import { matchRow as row } from './matchRowFactory';

function festival(over: Partial<Festival> & { id: string; start_date: string }): Festival {
	return {
		user_id: 'u1',
		name: 'Fest',
		created_at: '',
		updated_at: '',
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
			row({ name: 'Wein', station: 'Ausschank' }),
			row({ name: 'Kohle', station: 'Grill' }),
			row({ name: 'Bier', station: 'Ausschank' })
		]);

		expect(groups.map((g) => g.name)).toEqual(['Ausschank', 'Grill']);
		expect(groups[0].rows.map((r) => r.name)).toEqual(['Bier', 'Wein']);
		expect(groups[0].count).toBe(2);
	});

	it('stellt die Positionen ohne Station als vollwertigen Kasten ans Ende', () => {
		const groups = groupRowsByStation([
			row({ name: 'Zelt', station: null }),
			row({ name: 'Bier', station: 'Ausschank' })
		]);

		expect(groups.map((g) => g.name)).toEqual(['Ausschank', 'Ohne Station']);
		expect(groups[1].unassigned).toBe(true);
	});

	it('zählt je Kasten, wie viele Positionen es nur im Quellfest gibt', () => {
		const groups = groupRowsByStation([
			row({ name: 'Bier', station: 'Ausschank', status: 'match' }),
			row({ name: 'Spritzwein', station: 'Ausschank', status: 'only-source' }),
			row({ name: 'Wein', station: 'Ausschank', status: 'only-target' })
		]);

		expect(groups[0].count).toBe(3);
		expect(groups[0].sourceOnlyCount).toBe(1);
	});

	it('vergibt je Station einen eigenen, stabilen Schlüssel für den Reiter', () => {
		const groups = groupRowsByStation([
			row({ name: 'Bier', station: 'Ausschank' }),
			row({ name: 'Kohle', station: 'Grill' })
		]);

		expect(new Set(groups.map((g) => g.id)).size).toBe(2);
		expect(groups[0].id).toBe(groupRowsByStation([row({ name: 'Bier', station: 'Ausschank' })])[0].id);
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
			row({ name: 'Bier', status: 'match', targetOrdered: 18 }),
			'18',
			undefined
		);

		expect(stamp.kind).toBe('saved');
	});

	it('kündigt das Anlegen an, sobald eine Quellzeile eine Wunschmenge trägt', () => {
		const stamp = handoverStamp(row({ name: 'Spritzwein', status: 'only-source' }), '8', undefined);

		expect(stamp.kind).toBe('new');
		expect(stamp.label).toBe('WIRD NEU ANGELEGT');
	});

	it('verspricht kein Anlegen, solange die Quellzeile unberührt ist', () => {
		// CONTEXT.md: angelegt wird, „wenn der User eine Wunschmenge einträgt".
		const stamp = handoverStamp(row({ name: 'Spritzwein', status: 'only-source' }), '', undefined);

		expect(stamp.kind).toBe('skip');
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

	it('nimmt eine geänderte Menge nicht für die gespeicherte', () => {
		const bier = row({ name: 'Bier', status: 'match', targetOrdered: 18 });

		expect(handoverStamp(bier, '24', undefined).kind).toBe('pending');
		expect(handoverStamp(bier, '18', undefined).kind).toBe('saved');
	});

	it('behält die gespeicherte Menge im Blick, wenn das Feld geleert wird', () => {
		// Ein leeres Feld löscht nichts — die 18 stehen weiter im Zielfest.
		const stamp = handoverStamp(row({ name: 'Bier', targetOrdered: 18 }), '', undefined);

		expect(stamp.kind).toBe('saved');
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
		const spritzwein = row({ name: 'Spritzwein', status: 'only-source' });
		const rows = [
			row({ name: 'Bier', status: 'match', targetOrdered: 18 }),
			row({ name: 'Almdudler', status: 'match', targetOrdered: 12 }),
			spritzwein,
			row({ name: 'Kotelett', status: 'match' })
		];

		const summary = handoverSummary(rows, { [spritzwein.key]: '8' }, {});

		expect(summary.saved).toBe(2);
		expect(summary.created).toBe(1);
		expect(summary.skipped).toBe(1);
		expect(summary.failed).toBe(0);
	});

	it('zählt eine unberührte Quellzeile als ausgelassen, nicht als Anlage', () => {
		const summary = handoverSummary([row({ name: 'Spritzwein', status: 'only-source' })], {}, {});

		expect(summary.created).toBe(0);
		expect(summary.skipped).toBe(1);
	});

	it('führt missglückte Zeilen getrennt, damit sie nicht als übernommen durchgehen', () => {
		const bier = row({ name: 'Bier', status: 'match', targetOrdered: 18 });

		const summary = handoverSummary([bier], { [bier.key]: '20' }, {
			[bier.key]: { status: 'error', error: 'Netzwerk weg' }
		});

		expect(summary.failed).toBe(1);
		expect(summary.saved).toBe(0);
	});
});

describe('searchHandoverRows — die Suche der Werkzeugleiste', () => {
	const rows = [
		row({ name: 'Bier', station: 'Ausschank', supplier: 'Metro', category: 'Getränke' }),
		row({ name: 'Kohle', station: 'Grill', supplier: 'Lagerhaus', category: 'Sonstiges' })
	];

	it('findet über Name, Lieferant, Kategorie und Station', () => {
		expect(searchHandoverRows(rows, 'bier').map((r) => r.name)).toEqual(['Bier']);
		expect(searchHandoverRows(rows, 'lagerhaus').map((r) => r.name)).toEqual(['Kohle']);
		expect(searchHandoverRows(rows, 'getränke').map((r) => r.name)).toEqual(['Bier']);
		expect(searchHandoverRows(rows, 'grill').map((r) => r.name)).toEqual(['Kohle']);
	});

	it('gibt bei leerer Suche alles zurück', () => {
		expect(searchHandoverRows(rows, '   ')).toHaveLength(2);
	});
});
