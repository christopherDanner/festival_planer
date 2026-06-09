import type { SponsoringCategory, SponsoringWithDetails } from '@/lib/sponsorService';

/** Eine Quell-Kategorie im Übernahme-Plan: im Zielfest verknüpfbar oder neu anzulegen. */
export interface TransferCategoryPlan {
	/** Kategorie-Name aus dem Quellfest. */
	name: string;
	/** 'match' = gleichnamige Zielfest-Kategorie wird verknüpft; 'create' = im Zielfest neu anlegen. */
	status: 'match' | 'create';
	/** Die verknüpfte Zielfest-Kategorie (nur bei 'match'). */
	targetCategoryId: string | null;
	/** Vorjahreswert der Quell-Kategorie als Vorschlag für die neu anzulegende Kategorie. */
	proposedValue: number | null;
	/** Überschriebener Zuweisungs-Wert aus dem Quellfest; null = Kategorie-Wert gilt. */
	assignedValue: number | null;
}

/** Übernahme-Plan für einen Sponsor des Quellfests. */
export interface SponsorTransferPlan {
	sponsorId: string;
	companyName: string;
	/** Freibetrag aus dem Quellfest, wird mitübernommen. */
	freeAmount: number | null;
	categories: TransferCategoryPlan[];
}

function normalizeName(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * Erzeugt den Übernahme-Plan: pro Sponsor des Quellfests werden seine
 * Kategorien per normalisiertem Namen auf die Zielfest-Kategorien gemappt;
 * im Zielfest fehlende Kategorien werden als 'create' mit dem Vorjahreswert
 * als Vorschlag markiert. Der Freibetrag wird durchgereicht.
 */
export function planSponsorTransfer(
	sourceSponsorings: SponsoringWithDetails[],
	targetCategories: SponsoringCategory[]
): SponsorTransferPlan[] {
	const targetByName = new Map(targetCategories.map((c) => [normalizeName(c.name), c]));

	return sourceSponsorings.map((sponsoring) => ({
		sponsorId: sponsoring.sponsor_id,
		companyName: sponsoring.sponsor.company_name,
		freeAmount: sponsoring.free_amount,
		categories: sponsoring.assignments.map((a) => {
			const target = targetByName.get(normalizeName(a.category.name));
			return {
				name: a.category.name,
				status: target ? ('match' as const) : ('create' as const),
				targetCategoryId: target?.id ?? null,
				proposedValue: a.category.value,
				assignedValue: a.value
			};
		})
	}));
}
