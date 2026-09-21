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
	/**
	 * Sagt bei leerer Zelle, dass hier noch nichts steht; sonst `null`. Ohne
	 * diese Zeile ist der Zettel über einer leeren Zelle nicht von dem über
	 * einer zum Standardwert belegten zu unterscheiden — beide zeigen „200".
	 */
	stateLabel: string | null;
	/** Die Zelle ist belegt — nur dann gibt es „Entfernen". */
	recorded: boolean;
}

/** Freibetrag und Kategorien ohne Standardwert: der Wert muss getippt werden. */
const NO_DEFAULT_HINT = 'Kein Standardwert — freier Betrag.';

/** Zustand einer leeren Zelle — Freibetrag und Sachleistung werden erfasst, nicht zugewiesen. */
const NOT_RECORDED = 'noch nicht erfasst';

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
		const recorded = row.freeAmount != null;
		return {
			target,
			title: 'Freibetrag',
			valueInput: amountInput(row.freeAmount),
			descriptionInput: null,
			hint: NO_DEFAULT_HINT,
			stateLabel: recorded ? null : NOT_RECORDED,
			recorded
		};
	}

	if (target.kind === 'inKind') {
		const recorded = row.inKind != null;
		return {
			target,
			title: 'Sachleistung',
			valueInput: row.inKind ? amountInput(row.inKind.value) : '',
			descriptionInput: row.inKind?.description ?? '',
			hint: 'Zählt nie in die Geldsumme.',
			stateLabel: recorded ? null : NOT_RECORDED,
			recorded
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
		stateLabel: position ? null : 'noch nicht zugewiesen',
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

/**
 * Ob „Übernehmen" überhaupt etwas zu schreiben hätte. Falsch heißt: das Feld
 * ist leer und es gibt keinen Standardwert, der einspringen könnte — dann wäre
 * die einzige mögliche Wirkung das Löschen, und das gehört dem Entfernen-Knopf
 * (ADR 0009). Die Oberfläche sperrt den Knopf damit, statt still nichts zu tun.
 */
export function canApplyZettel(zettel: Zettel, input: ZettelInput): boolean {
	if (zettel.target.kind === 'inKind') return (input.description ?? '').trim() !== '';
	return true;
}

/** Was „Übernehmen" schreibt. */
export function applyZettel(
	sponsoring: SponsoringWithDetails,
	target: ZettelTarget,
	input: ZettelInput
): SponsoringWrite {
	const value = parseCategoryValue(input.value);
	const assignments = keptAssignments(sponsoring);

	if (target.kind === 'freeAmount') {
		return { updates: { free_amount: value }, assignments };
	}

	if (target.kind === 'inKind') {
		/* Ohne Bezeichnung gibt es keine Sachleistung: ein Schätzwert allein
		bliebe in der Matrix unsichtbar, zählte aber im Sachwert des Fests weiter
		— eine Zahl, die niemand zuordnen kann. Gelöscht wird hier trotzdem
		nichts: eine geleerte Bezeichnung lässt eine erfasste Sachleistung stehen,
		denn Entfernen ist nie ein Nebeneffekt (ADR 0009). */
		const description = (input.description ?? '').trim();
		if (description === '') return { updates: {}, assignments };
		return {
			updates: { in_kind_description: description, in_kind_value: value },
			assignments
		};
	}

	const { category } = target;
	const others = keptAssignments(sponsoring, category.id);
	/* Ohne Standardwert und ohne Eingabe gibt es nichts zu übernehmen — eine
	Zuweisung über € 0 sähe wie eine echte Zusage aus. */
	if (value == null && category.value == null) return { updates: {}, assignments };
	return {
		updates: {},
		assignments: [
			...others,
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
