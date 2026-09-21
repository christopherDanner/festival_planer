/** Nachblättern über den Zeilendeckel der REST-Schicht. PostgREST gibt je
Antwort höchstens ~1000 Zeilen heraus; wer über mehrere Feste oder über den
ganzen Bestand liest, kann den Deckel erreichen, und eine gedeckelte Antwort
zählt still zu wenig. `count: 'exact'` nennt die wahre Gesamtzahl — solange
Zeilen fehlen, kommt die nächste Seite. Im Normalfall bleibt es bei der einen
Abfrage. */

/** Zeilen je Antwort. */
export const PAGE_SIZE = 1000;

/** Eine Antwort der REST-Schicht: die Seite, ein Fehler, und die wahre
Gesamtzahl der Treffer (unabhängig vom Deckel der Antwort). */
export interface RowPage {
	data: unknown[] | null;
	error: { message: string } | null;
	count: number | null;
}

/**
 * Holt alle Zeilen einer Abfrage, Seite für Seite. `page` baut die Abfrage für
 * einen Bereich — welche Tabelle, welche Spalten und welche Filter, ist Sache
 * des Aufrufers; hier lebt nur das Blättern.
 */
export async function fetchAllRows<T>(
	page: (from: number, to: number) => PromiseLike<RowPage>
): Promise<T[]> {
	const rows: T[] = [];
	let total: number | null = null;

	for (;;) {
		const { data, error, count } = await page(rows.length, rows.length + PAGE_SIZE - 1);

		if (error) throw new Error(error.message);
		const received = (data ?? []) as T[];
		rows.push(...received);
		total ??= count;

		// Fertig, sobald alle Treffer da sind. `received.length === 0` fängt den
		// Fall, dass die Zeilen unter uns weggelöscht wurden — sonst liefe das ewig.
		if (total === null || rows.length >= total || received.length === 0) return rows;
	}
}
