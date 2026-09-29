import { getFestival, type Festival } from '@/lib/festivalService';
import { getMaterials, type FestivalMaterialWithStation } from '@/lib/materialService';
import { getScheduleDays, type ScheduleDayWithEntries } from '@/lib/scheduleService';
import { getStationShifts, getStations, type Station, type StationShift } from '@/lib/shiftService';
import { getCategories, getSponsoringSponsorIds } from '@/lib/sponsorService';

/**
 * Die geladene Vorlage: das Quellfest selbst plus das, was aus ihm kopiert
 * werden kann. Das Quellfest gehört dazu, weil `copyFestivalData` sein
 * Startdatum für den Termin-Versatz braucht.
 */
export interface LoadedTemplate {
	festival: Festival;
	stations: Station[];
	shifts: StationShift[];
	materials: FestivalMaterialWithStation[];
	/** Ablauf-Tage samt Phasen und Einträgen — die Vorschau von Schritt 4 (#127). */
	scheduleDays: ScheduleDayWithEntries[];
	/**
	 * Preisliste und Firmen der Vorlage als **Zahlen** — anders als Stationen,
	 * Schichten, Positionen und Ablauf-Tage, die der jeweilige Schritt einzeln
	 * zeigt. Schritt 5 zeigt nichts einzeln: er stellt zwei Schalter hin und
	 * beziffert sie (#146). Was dann wirklich kopiert wird, liest
	 * `copyFestivalData` selbst — die nackte Verknüpfung trägt keine Zuweisung,
	 * es gibt also nichts, was von hier mitwandern müsste.
	 */
	sponsoringCategoryCount: number;
	sponsorCount: number;
}

/**
 * Lädt die Vorlage des Kopierwerks in einem Rutsch. Das Quellfest kommt aus
 * `getFestival` und nicht aus der Auswahl-Liste des Vorlage-Felds: die Liste
 * kann scheitern, und ein Deep-Link darf auf ein Fest zeigen, das nicht in ihr
 * steht. Ohne Quellfest gibt es keine Vorlage — der Kopier-Schritt griffe sonst
 * ins Leere und das Fest entstünde still ohne Kopie.
 */
export async function loadTemplate(templateId: string): Promise<LoadedTemplate> {
	const [festival, stations, shifts, materials, scheduleDays, sponsoringCategories, sponsorIds] =
		await Promise.all([
			getFestival(templateId),
			getStations(templateId),
			getStationShifts(templateId),
			getMaterials(templateId),
			getScheduleDays(templateId),
			getCategories(templateId),
			getSponsoringSponsorIds(templateId)
		]);

	if (!festival) throw new Error('Vorlage nicht gefunden');

	return {
		festival,
		stations,
		shifts,
		materials,
		scheduleDays,
		sponsoringCategoryCount: sponsoringCategories.length,
		sponsorCount: sponsorIds.length
	};
}
