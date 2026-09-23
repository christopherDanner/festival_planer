import {
	parseCategoryValue,
	type SponsoringCategory,
	type SponsoringWithDetails
} from '@/lib/sponsorService';

/**
 * Wie weit ein Eingriff in eine *Sponsoring-Kategorie* reicht — die zwei Zahlen,
 * die das Datenmodell dem Zettel am Spaltenkopf aufzwingt (ADR 0009):
 *
 * - `assigned` — so viele Zuweisungen reißt das Löschen der Kategorie mit
 *   (`sponsoring_category_assignments … ON DELETE CASCADE`).
 * - `inheriting` — so viele Zusagen verschiebt ein neuer Standardwert, ohne dass
 *   eine Firma gefragt wurde: die mit `value IS NULL` erben ihn (CONTEXT.md
 *   „Sponsoring-Kategorie").
 */
export interface CategoryImpact {
	/** Zuweisungen dieser Kategorie insgesamt. */
	assigned: number;
	/** Davon ohne eigenen Wert; sie erben den Standardwert. */
	inheriting: number;
}

/** Zählt die Reichweite einer Kategorie über **alle** Sponsorings des Fests. */
export function categoryImpact(
	sponsorings: SponsoringWithDetails[],
	categoryId: string
): CategoryImpact {
	const assignments = sponsorings.flatMap((s) =>
		s.assignments.filter((a) => a.category_id === categoryId)
	);
	return {
		assigned: assignments.length,
		inheriting: assignments.filter((a) => a.value == null).length
	};
}

/**
 * Was der Zettel am Kategorie-Spaltenkopf zeigt (ADR 0009). Er verwaltet die
 * *Preisliste* — anlegen, umbenennen, Standardwert ändern, löschen — und ersetzt
 * damit die frühere zweite Tabelle „Sponsoring-Kategorien" samt eigenem Dialog.
 */
export interface CategoryZettel {
	/** Überschrift: der Kategoriename, beim Anlegen die Ansage dafür. */
	title: string;
	nameInput: string;
	/** Vorbelegter Standardwert; leer heißt **kein** Standardwert, nicht null Euro. */
	valueInput: string;
	/** Zeile unter den Feldern — sie beziffert die Rückwirkung, bevor sie eintritt. */
	hint: string;
	/** Rückfrage vor dem Löschen; `null` beim Anlegen — da gibt es nichts zu löschen. */
	deleteMessage: string | null;
}

/** „3 Firmen", „1 Firma" — ein Posten mit richtigem Numerus. */
function posten(n: number, einzahl: string, mehrzahl: string): string {
	return `${n} ${n === 1 ? einzahl : mehrzahl}`;
}

/** Betrag als Eingabe-Text in deutscher Schreibweise; `null` wird zum leeren Feld. */
function amountInput(value: number | null): string {
	return value == null ? '' : String(value).replace('.', ',');
}

/**
 * Was ein neuer Standardwert anrichtet. Eine Zuweisung ohne eigenen Wert erbt
 * ihn (`value IS NULL`), also ändert das Tippen hier rückwirkend jede dieser
 * Zusagen — dieselbe Falle, gegen die ADR 0008 beim Kopieren entschieden hat:
 * keine Zahl behaupten, die niemand zugesagt hat.
 */
function defaultValueHint(impact: CategoryImpact): string {
	if (impact.inheriting === 0) return 'Keine Firma erbt diesen Wert.';
	return `Gilt für ${posten(impact.inheriting, 'Firma', 'Firmen')} ohne eigenen Wert.`;
}

/**
 * Was das Löschen einer Kategorie mitreißt: ihre Zuweisungen
 * (`sponsoring_category_assignments … ON DELETE CASCADE`). Ohne die Zahl ist das
 * eine unbezifferte Katastrophe.
 */
function deletionMessage(category: SponsoringCategory, impact: CategoryImpact): string {
	const name = `„${category.name}"`;
	if (impact.assigned === 0) {
		return `${name} ist keiner Firma zugewiesen. Löschen entfernt die Spalte.`;
	}
	const zuweisungen =
		impact.assigned === 1 ? 'diese Zuweisung' : `diese ${impact.assigned} Zuweisungen`;
	return `${name} ist ${posten(impact.assigned, 'Firma', 'Firmen')} zugewiesen. Löschen entfernt ${zuweisungen}.`;
}

/**
 * Formt den Zettel zu einem Spaltenkopf — oder, mit `null`, zum „+ KATEGORIE"
 * der Werkzeugleiste. Beide Wege tragen denselben Zettel; nur das Löschen gibt
 * es beim Anlegen nicht.
 */
export function buildCategoryZettel(
	category: SponsoringCategory | null,
	impact: CategoryImpact
): CategoryZettel {
	if (!category) {
		return {
			title: 'Neue Kategorie',
			nameInput: '',
			valueInput: '',
			/* Eine Kategorie **ohne** Standardwert ist erlaubt (#149): der Kopf zeigt
			dann keinen Wert und der Zellen-Zettel hat nichts vorzubelegen. */
			hint: 'Ohne Standardwert wird der Betrag je Firma getippt.',
			deleteMessage: null
		};
	}

	return {
		title: category.name,
		nameInput: category.name,
		valueInput: amountInput(category.value),
		hint: defaultValueHint(impact),
		deleteMessage: deletionMessage(category, impact)
	};
}

/** Was im Kategorie-Zettel steht, wenn „Übernehmen" gedrückt wird. */
export interface CategoryZettelInput {
	name: string;
	value: string;
}

/**
 * Ob „Übernehmen" etwas zu schreiben hätte. Der Name ist die einzige Pflicht —
 * er ist die Spaltenüberschrift, und eine namenlose Spalte sagt niemandem, was
 * der Verein da anbietet. Der Standardwert darf fehlen (#149).
 */
export function canApplyCategoryZettel(input: CategoryZettelInput): boolean {
	return input.name.trim() !== '';
}

/** Was „Übernehmen" in die Kategorie schreibt. */
export function categoryZettelWrite(
	input: CategoryZettelInput
): Pick<SponsoringCategory, 'name' | 'value'> {
	/* Leeres Feld heißt **kein** Standardwert, nicht null Euro: `parseCategoryValue`
	gibt dafür `null` zurück, und die Spalte trägt dann keinen Wert. */
	return { name: input.name.trim(), value: parseCategoryValue(input.value) };
}
