import { formatEuro } from '@/lib/money';
import {
	parseCategoryValue,
	type Sponsoring,
	type SponsoringAssignmentInput,
	type SponsoringCategory,
	type SponsoringInKind,
	type SponsoringWithDetails
} from '@/lib/sponsorService';
import type { SponsoringOverviewRow } from '@/lib/sponsoringTotals';

/** Die Zelle, die der Zettel bedient — jede wertetragende Spalte der Matrix. */
export type ZettelTarget =
	| { kind: 'category'; category: SponsoringCategory }
	| { kind: 'freeAmount' }
	| { kind: 'inKind' };

/** Was der Zettel beim Öffnen zeigt (ADR 0009). */
export interface Zettel {
	target: ZettelTarget;
	/** Überschrift: Kategoriename, „Freibetrag" oder „Sachleistung". */
	title: string;
	/** Vorbelegter Betrag — Standardwert bei leerer, aktueller Wert bei belegter Zelle. */
	valueInput: string;
	/** Vorbelegte Bezeichnung der Sachleistung; `null` heißt: kein Bezeichnungsfeld. */
	descriptionInput: string | null;
	/** Zeile unter dem Feld — sagt, woher der vorbelegte Wert kommt. */
	hint: string;
	/** Die Zelle ist belegt — nur dann gibt es „Entfernen". */
	recorded: boolean;
}

/** Freibetrag und Kategorien ohne Standardwert: der Wert muss getippt werden. */
const NO_DEFAULT_HINT = 'Kein Standardwert — freier Betrag.';

/** Betrag als Eingabe-Text in deutscher Schreibweise; `null` wird zum leeren Feld. */
function amountInput(value: number | null): string {
	return value == null ? '' : String(value).replace('.', ',');
}

/**
 * Formt den Zettel zu einer Zelle: vorbelegt und selektiert ist das Wertfeld
 * erst in der Oberfläche, den *Inhalt* der Vorbelegung entscheidet diese Regel.
 * Bei leerer Kategorie-Zelle ist das der Standardwert — damit `Übernehmen`
 * ohne Tippen den Normalfall trifft (94 % der Zuweisungen, ADR 0009).
 */
export function buildZettel(row: SponsoringOverviewRow, target: ZettelTarget): Zettel {
	if (target.kind === 'freeAmount') {
		return {
			target,
			title: 'Freibetrag',
			valueInput: amountInput(row.freeAmount),
			descriptionInput: null,
			hint: NO_DEFAULT_HINT,
			recorded: row.freeAmount != null
		};
	}

	if (target.kind === 'inKind') {
		return {
			target,
			title: 'Sachleistung',
			valueInput: row.inKind ? amountInput(row.inKind.value) : '',
			descriptionInput: row.inKind?.description ?? '',
			hint: 'Zählt nie in die Geldsumme.',
			recorded: row.inKind != null
		};
	}

	const { category } = target;
	const position = row.positionsByCategoryId[category.id];

	return {
		target,
		title: category.name,
		/* Belegt: der wirksame Wert. Leer: der Standardwert — genau deshalb
		weist `Übernehmen` ohne Tippen den Normalfall zu (ADR 0009). */
		valueInput: amountInput(position ? position.value : category.value),
		descriptionInput: null,
		hint:
			category.value != null ? `Standardwert ${formatEuro(category.value)}` : NO_DEFAULT_HINT,
		recorded: position != null
	};
}

/** Was im Zettel steht, wenn „Übernehmen" gedrückt wird. */
export interface ZettelInput {
	value: string;
	/** Nur die Sachleistung hat eine Bezeichnung. */
	description?: string;
}

/**
 * Ein Schreibvorgang für `updateSponsoring`. `assignments` ist immer die
 * **vollständige** Liste, weil der Schreibweg die bestehenden ersetzt;
 * `updates` trägt nur die Felder, die der Zettel wirklich anfasst.
 */
export interface SponsoringWrite {
	updates: Partial<Pick<Sponsoring, 'free_amount'> & SponsoringInKind>;
	assignments: SponsoringAssignmentInput[];
}

/** Die bestehenden Zuweisungen als Schreib-Eingabe. */
function keptAssignments(
	sponsoring: SponsoringWithDetails,
	exceptCategoryId?: string
): SponsoringAssignmentInput[] {
	return sponsoring.assignments
		.filter((a) => a.category_id !== exceptCategoryId)
		.map((a) => ({ category_id: a.category_id, value: a.value }));
}

/** Was „Übernehmen" schreibt. */
export function applyZettel(
	sponsoring: SponsoringWithDetails,
	target: ZettelTarget,
	input: ZettelInput
): SponsoringWrite {
	const value = parseCategoryValue(input.value);

	if (target.kind === 'freeAmount') {
		return { updates: { free_amount: value }, assignments: keptAssignments(sponsoring) };
	}

	if (target.kind === 'inKind') {
		/* Bezeichnung und Schätzwert gehören zusammen (ADR 0008): ein Wert ohne
		Bezeichnung bliebe in der Matrix unsichtbar, zählte aber im Sachwert des
		Fests weiter — eine Zahl, die niemand zuordnen kann. */
		const description = (input.description ?? '').trim() || null;
		return {
			updates: {
				in_kind_description: description,
				in_kind_value: description == null ? null : value
			},
			assignments: keptAssignments(sponsoring)
		};
	}

	const { category } = target;
	return {
		updates: {},
		assignments: [
			...keptAssignments(sponsoring, category.id),
			/* Auf dem Standardwert wird nichts überschrieben: die Zuweisung erbt
			ihn (`value IS NULL`), bleibt schwarz-grün und folgt einer späteren
			Änderung des Standardwerts. */
			{ category_id: category.id, value: value === category.value ? null : value }
		]
	};
}

/** Was „Entfernen" schreibt. */
export function clearZettel(
	sponsoring: SponsoringWithDetails,
	target: ZettelTarget
): SponsoringWrite {
	if (target.kind === 'freeAmount') {
		return { updates: { free_amount: null }, assignments: keptAssignments(sponsoring) };
	}

	if (target.kind === 'inKind') {
		return {
			updates: { in_kind_description: null, in_kind_value: null },
			assignments: keptAssignments(sponsoring)
		};
	}

	return { updates: {}, assignments: keptAssignments(sponsoring, target.category.id) };
}
