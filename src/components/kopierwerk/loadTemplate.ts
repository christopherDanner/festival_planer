import { getFestival, type Festival } from '@/lib/festivalService';
import { getMaterials, type FestivalMaterialWithStation } from '@/lib/materialService';
import { getStationShifts, getStations, type Station, type StationShift } from '@/lib/shiftService';

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
}

/**
 * Lädt die Vorlage des Kopierwerks in einem Rutsch. Das Quellfest kommt aus
 * `getFestival` und nicht aus der Auswahl-Liste des Vorlage-Felds: die Liste
 * kann scheitern, und ein Deep-Link darf auf ein Fest zeigen, das nicht in ihr
 * steht. Ohne Quellfest gibt es keine Vorlage — der Kopier-Schritt griffe sonst
 * ins Leere und das Fest entstünde still ohne Kopie.
 */
export async function loadTemplate(templateId: string): Promise<LoadedTemplate> {
	const [festival, stations, shifts, materials] = await Promise.all([
		getFestival(templateId),
		getStations(templateId),
		getStationShifts(templateId),
		getMaterials(templateId)
	]);

	if (!festival) throw new Error('Vorlage nicht gefunden');

	return { festival, stations, shifts, materials };
}
