import { formatAmountInput, formatEuro } from '@/lib/money';
import type { SponsoringCategory } from '@/lib/sponsorService';
import type { SponsoringOverviewRow } from '@/lib/sponsoringTotals';
import type { ZettelInput, ZettelTarget } from '@/lib/sponsoringZettel';

/** Ein Eintrag im „+"-Blatt der Karte am Handy (#155). */
export interface SponsoringAddable {
	target: ZettelTarget;
	/** „Plakat", „Freibetrag", „Sachleistung". */
	label: string;
	/** Rechts im Eintrag: der Standardwert, sonst was für ein Wert hier hingehört. */
	hint: string;
	/**
	 * Was Antippen sofort schreibt — nur bei einer Kategorie **mit** Standardwert
	 * (der 94-%-Fall aus ADR 0009). `null` heißt: Antippen öffnet den Zettel,
	 * weil dort ein Wert getippt werden muss.
	 */
	direct: ZettelInput | null;
}

/** Das „+"-Blatt in seinen zwei Gruppen. */
export interface SponsoringAddables {
	/** Jede Kategorie der Preisliste, die die Firma noch nicht hat. */
	categories: SponsoringAddable[];
	/** Freibetrag und Sachleistung — je nur, solange leer. */
	other: SponsoringAddable[];
}

/**
 * Was die Karte einer Firma noch **nicht** hat — das ist alles, was ihr „+"
 * anbietet. Die Karte selbst zeigt nur das Vorhandene (#155, Variante K5):
 * keine grauen „+ Kategorie"-Marken, keine leere Freibetrag-Marke. Freibetrag
 * und Sachleistung sind dabei gleichkörnig (ADR 0008) — beide stehen hier, bis
 * sie gesetzt sind, und beide nie leer auf der Karte.
 */
export function sponsoringAddables(
	row: SponsoringOverviewRow,
	categories: SponsoringCategory[]
): SponsoringAddables {
	const open = categories.filter((c) => row.positionsByCategoryId[c.id] == null);
	const other: SponsoringAddable[] = [];
	if (row.freeAmount == null) {
		other.push({ target: { kind: 'freeAmount' }, label: 'Freibetrag', hint: 'freier Betrag', direct: null });
	}
	if (row.inKind == null) {
		other.push({ target: { kind: 'inKind' }, label: 'Sachleistung', hint: 'kein Geld', direct: null });
	}

	return {
		categories: open.map((category) => ({
			target: { kind: 'category', category },
			label: category.name,
			hint: category.value != null ? formatEuro(category.value) : 'freier Betrag',
			/* Der Standardwert als Eingabe — `applyZettel` erkennt ihn wieder und
			schreibt die erbende Zuweisung (`value IS NULL`), wie „Übernehmen" ohne
			Tippen am Desktop. */
			direct: category.value != null ? { value: formatAmountInput(category.value) } : null
		})),
		other
	};
}

/** Ob die Karte ihr „+" trägt — eine Firma mit allem hat keins mehr. */
export function hasAddables(addables: SponsoringAddables): boolean {
	return addables.categories.length > 0 || addables.other.length > 0;
}
