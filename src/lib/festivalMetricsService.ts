import { supabase } from '@/integrations/supabase/client';
import {
	buildFestivalMetrics,
	type FestivalMetricsMap,
	type FestivalScopedRow,
	type FestivalSponsoringRow
} from '@/lib/festivalMetrics';

/** Für die Geldregel reicht der Freibetrag samt Zuweisungs- und Kategorie-Wert. */
const SPONSORING_VALUES_SELECT =
	'festival_id, free_amount, assignments:sponsoring_category_assignments(value, category:sponsoring_categories(value))';

/**
 * Lädt die Plakat-Kennzahlen für alle Feste der Wand — **eine** Abfrage je
 * Kennzahl über einen `in`-Filter, nicht eine Abfrage je Fest. Die drei laufen
 * nebeneinander; scheitert eine, scheitert der ganze Aufruf und die Wand bleibt
 * ohne Kennzahl-Zeile stehen (Issue #92).
 */
export async function getFestivalMetrics(festivalIds: string[]): Promise<FestivalMetricsMap> {
	if (festivalIds.length === 0) return {};

	const [shifts, materials, sponsorings] = await Promise.all([
		queryRows<FestivalScopedRow>('station_shifts', 'festival_id', festivalIds),
		queryRows<FestivalScopedRow>('festival_materials', 'festival_id', festivalIds),
		queryRows<FestivalSponsoringRow>('sponsorings', SPONSORING_VALUES_SELECT, festivalIds)
	]);

	return buildFestivalMetrics({ shifts, materials, sponsorings });
}

/**
 * Der Client, so schmal wie diese drei Abfragen ihn brauchen. Nötig, weil
 * `festival_materials` in den generierten Supabase-Typen fehlt (wie im
 * materialService) und der Tabellenname hier eine Variable ist.
 */
interface RowQueryClient {
	from: (table: string) => {
		select: (columns: string) => {
			in: (
				column: string,
				values: string[]
			) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
		};
	};
}

async function queryRows<T>(table: string, columns: string, festivalIds: string[]): Promise<T[]> {
	const client = supabase as unknown as RowQueryClient;
	const { data, error } = await client.from(table).select(columns).in('festival_id', festivalIds);

	if (error) throw new Error(error.message);
	return (data ?? []) as T[];
}
