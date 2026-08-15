/** Die Regeln der Material-Übernahme (#118) als reines Logikmodul ohne React:
welches Fest Quellfest sein darf, wie die Zeilen in Stations-Gruppen fallen und
was der Auto-Save-Stempel einer Zeile sagt. Gespeichert wird weiterhin im
`materialSaveOrchestrator` — dieses Modul liest dessen Zustand nur ab. */

import type { Festival } from './festivalService';
import type { MatchRow } from './materialMatcher';
import type { SaveState } from './materialSaveOrchestrator';

/**
 * Die wählbaren Quellfeste zu einem festen Zielfest (#118): alle anderen Feste,
 * das jüngste zuerst. Das Zielfest steht in der Route und ist nicht wählbar —
 * `CONTEXT.md`: „Zielfest — das aktuelle Fest in der Material-Liste".
 *
 * Ein Fest ohne Vorgänger liefert die leere Liste; das ist kein Fehler, sondern
 * heißt schlicht: hier gibt es nichts zu übernehmen.
 */
export function sourceFestivalOptions(festivals: Festival[], targetId: string | null): Festival[] {
	return festivals
		.filter((f) => f.id !== targetId)
		.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
}

/** Beschriftung der Zeilen, die keiner Station zugeordnet sind. Wortlaut wie in
der Arbeitsliste (`materialGrouping`) — dieselbe Restgruppe darf nicht zwei
Namen haben. */
export const NO_STATION = 'Ohne Station';

const NO_STATION_KEY = '__none__';

/** Ein Stations-Kasten der Übernahme samt der Zahlen, die sein Reiter trägt. */
export interface HandoverGroup {
	/** Stabiler Schlüssel über den Stationsnamen — der Reiter-Zustand hängt daran. */
	id: string;
	name: string;
	/** „Ohne Station": vollwertiger Kasten, aber am Ende (Regel aus #113). */
	unassigned: boolean;
	rows: MatchRow[];
	count: number;
	/** Zeilen, die es nur im Quellfest gibt — sie würden neu angelegt. */
	newCount: number;
}

/**
 * Zerlegt die Zeilen der Übernahme in ihre Stations-Kästen. Die Übernahme
 * gruppiert **nur nach Station** (#118) — anders als die Arbeitsliste, die eine
 * Achse kennt: übernommen wird pro Station, nicht pro Lieferant.
 *
 * Gruppiert wird nach dem Stations*namen*, nicht nach einer Id: die Zeilen
 * stammen aus zwei Festen, und zwischen Festen mappt `CONTEXT.md` Stationen
 * über den Namen.
 */
export function groupRowsByStation(rows: MatchRow[]): HandoverGroup[] {
	const buckets = new Map<string, { name: string; unassigned: boolean; rows: MatchRow[] }>();

	for (const r of rows) {
		const name = r.stationName?.trim();
		const id = name ? `station:${name}` : `station:${NO_STATION_KEY}`;
		let bucket = buckets.get(id);
		if (!bucket) {
			bucket = { name: name ?? NO_STATION, unassigned: !name, rows: [] };
			buckets.set(id, bucket);
		}
		bucket.rows.push(r);
	}

	return [...buckets.entries()]
		.map(([id, bucket]) => ({
			id,
			name: bucket.name,
			unassigned: bucket.unassigned,
			rows: [...bucket.rows].sort((a, b) => a.name.localeCompare(b.name, 'de')),
			count: bucket.rows.length,
			newCount: bucket.rows.filter((r) => r.status === 'only-source').length
		}))
		.sort((a, b) => {
			if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1;
			return a.name.localeCompare(b.name, 'de');
		});
}

/**
 * Die Suche der Werkzeugleiste über die Zeilen der Übernahme — dieselben vier
 * Felder wie in der Arbeitsliste (`searchMaterials`): Name, Lieferant,
 * Kategorie, Station. Sie läuft **vor** dem Gruppieren, damit die Reiter die
 * Trefferzahl je Station zeigen.
 */
export function searchHandoverRows(rows: MatchRow[], term: string): MatchRow[] {
	const needle = term.trim().toLowerCase();
	if (!needle) return rows;

	return rows.filter((r) =>
		[r.name, r.supplier, r.category, r.stationName].some((field) =>
			field?.toLowerCase().includes(needle)
		)
	);
}

/** Was der Stempel einer Zeile aussagt. Die drei aus #118 („✓ GESPEICHERT",
„WIRD NEU ANGELEGT", „NICHT ÜBERNEHMEN") plus die drei Zustände, die der
`materialSaveOrchestrator` ohnehin schon unterscheidet. */
export type HandoverStampKind = 'saved' | 'saving' | 'error' | 'new' | 'skip' | 'pending';

export interface HandoverStamp {
	kind: HandoverStampKind;
	label: string;
	/** Nur bei `error`: die Meldung des fehlgeschlagenen Speicherns. */
	error?: string;
}

const STAMP_LABELS: Record<HandoverStampKind, string> = {
	saved: '✓ GESPEICHERT',
	saving: 'SPEICHERT …',
	error: 'NICHT GESPEICHERT',
	new: 'WIRD NEU ANGELEGT',
	skip: 'NICHT ÜBERNEHMEN',
	pending: 'NOCH NICHT GESPEICHERT'
};

/** Eine Wunschmenge zählt erst ab echtem Wert — leer und 0 heißen beide
„nicht übernehmen" (dieselbe Grenze wie im `materialSaveOrchestrator`). */
function desiredQuantity(value: string): number | null {
	const num = parseFloat(value.trim());
	return Number.isNaN(num) || num <= 0 ? null : num;
}

/**
 * Der Auto-Save-Stempel einer Zeile (#118). Er liest den Zustand ab, den der
 * `materialSaveOrchestrator` führt, und ergänzt ihn um das, was die Zeile selbst
 * schon weiß: eine Zeile nur im Quellfest wird angelegt, eine Bestellmenge im
 * Zielfest steht bereits.
 *
 * `pending` gibt es, weil das Feld erst beim Verlassen speichert: eine gerade
 * getippte Menge ist weder übernommen noch ausgelassen, und „NICHT ÜBERNEHMEN"
 * neben einer eben getippten 18 wäre schlicht falsch.
 */
export function handoverStamp(
	row: MatchRow,
	desiredValue: string,
	saveState: SaveState | undefined
): HandoverStamp {
	if (saveState?.status === 'error') {
		return { kind: 'error', label: STAMP_LABELS.error, error: saveState.error };
	}
	if (saveState?.status === 'saving') return stamp('saving');
	if (saveState?.status === 'saved') return stamp('saved');
	// Angelegt wird erst beim Speichern — bis dahin *kündigt* der Stempel an,
	// mit und ohne getippte Menge.
	if (row.status === 'only-source') return stamp('new');
	if (row.targetOrderedQuantity != null && row.targetOrderedQuantity > 0) return stamp('saved');
	return stamp(desiredQuantity(desiredValue) == null ? 'skip' : 'pending');
}

function stamp(kind: HandoverStampKind): HandoverStamp {
	return { kind, label: STAMP_LABELS[kind] };
}

/** Die Zahlen der Fußleiste: wie viele Zeilen übernommen, neu angelegt,
ausgelassen sind — je Stempel eine. */
export type HandoverSummary = Record<'saved' | 'saving' | 'failed' | 'created' | 'skipped' | 'pending', number>;

const SUMMARY_SLOTS: Record<HandoverStampKind, keyof HandoverSummary> = {
	saved: 'saved',
	saving: 'saving',
	error: 'failed',
	new: 'created',
	skip: 'skipped',
	pending: 'pending'
};

/**
 * Zählt die Stempel eines ganzen Übernahme-Laufs zusammen. Gezählt wird über
 * `handoverStamp`, damit Fußleiste und Zeile nie auseinanderlaufen können.
 */
export function handoverSummary(
	rows: MatchRow[],
	desiredByKey: Record<string, string>,
	statesByKey: Record<string, SaveState>
): HandoverSummary {
	const summary: HandoverSummary = {
		saved: 0,
		saving: 0,
		failed: 0,
		created: 0,
		skipped: 0,
		pending: 0
	};
	for (const row of rows) {
		const { kind } = handoverStamp(row, desiredByKey[row.key] ?? '', statesByKey[row.key]);
		summary[SUMMARY_SLOTS[kind]] += 1;
	}
	return summary;
}
