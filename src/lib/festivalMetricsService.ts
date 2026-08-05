import { supabase } from '@/integrations/supabase/client';
import {
	buildFestivalMetrics,
	type FestivalMetricsMap,
	type FestivalScopedRow,
	type FestivalSponsoringRow
} from '@/lib/festivalMetrics';
import { SPONSORING_VALUES_SELECT } from '@/lib/sponsorService';

/**
 * Lädt die Plakat-Kennzahlen für alle Feste der Wand — eine Abfrage je Kennzahl
 * über einen `in`-Filter, nicht eine Abfrage je Fest (nur der Zeilendeckel der
 * REST-Schicht lässt nachblättern, siehe `queryByFestival`). Die drei laufen
 * nebeneinander; scheitert eine, scheitert der ganze Aufruf und die Wand bleibt
 * ohne Kennzahl-Zeile stehen (Issue #92).
 */
export async function getFestivalMetrics(festivalIds: string[]): Promise<FestivalMetricsMap> {
	if (festivalIds.length === 0) return {};

	const [shifts, materials, sponsorings] = await Promise.all([
		queryByFestival<FestivalScopedRow>('station_shifts', 'festival_id', festivalIds),
		queryByFestival<FestivalScopedRow>('festival_materials', 'festival_id', festivalIds),
		queryByFestival<FestivalSponsoringRow>('sponsorings', SPONSORING_VALUES_SELECT, festivalIds)
	]);

	return buildFestivalMetrics({ shifts, materials, sponsorings });
}

/** Zeilen je Antwort. Die REST-Schicht deckelt selbst — siehe `queryByFestival`. */
const PAGE_SIZE = 1000;

interface RowPage {
	data: unknown[] | null;
	error: { message: string } | null;
	/** Wahre Gesamtzahl der Treffer, unabhängig vom Deckel der Antwort. */
	count: number | null;
}

/**
 * Der Client, so schmal wie diese drei Abfragen ihn brauchen. Nötig, weil
 * `festival_materials` in den generierten Supabase-Typen fehlt (wie im
 * materialService) und der Tabellenname hier eine Variable ist.
 */
interface RowQueryClient {
	from: (table: string) => {
		select: (
			columns: string,
			options?: { count: 'exact' }
		) => {
			in: (
				column: string,
				values: string[]
			) => { range: (from: number, to: number) => PromiseLike<RowPage> };
		};
	};
}

/**
 * Holt `select` aus `table` für alle übergebenen Feste auf einmal. Gefiltert
 * wird immer über `festival_id` — das ist der Sinn der Sache und nicht Teil der
 * Spaltenliste.
 *
 * Geblättert wird, weil die REST-Schicht eine Antwort deckelt (PostgREST:
 * standardmäßig 1000 Zeilen). Über alle Feste der Wand summiert ist dieser
 * Deckel erreichbar — ein Fest bringt laut Vision ~86 Material-Positionen mit —,
 * und eine gedeckelte Antwort würde still zu wenig zählen. `count` nennt die
 * wahre Gesamtzahl; solange Zeilen fehlen, wird nachgeblättert. Im Normalfall
 * bleibt es bei der einen Abfrage je Kennzahl.
 */
async function queryByFestival<T>(
	table: string,
	select: string,
	festivalIds: string[]
): Promise<T[]> {
	const client = supabase as unknown as RowQueryClient;
	const rows: T[] = [];
	let total: number | null = null;

	for (;;) {
		const { data, error, count } = await client
			.from(table)
			.select(select, { count: 'exact' })
			.in('festival_id', festivalIds)
			.range(rows.length, rows.length + PAGE_SIZE - 1);

		if (error) throw new Error(error.message);
		const page = (data ?? []) as T[];
		rows.push(...page);
		total ??= count;

		// Fertig, sobald alle Treffer da sind. `page.length === 0` fängt den Fall,
		// dass die Zeilen unter uns weggelöscht wurden — sonst liefe das ewig.
		if (total === null || rows.length >= total || page.length === 0) return rows;
	}
}
