import {
	getStations, getStationShifts, getStationHelpers, getShiftAssignments,
	createStationsBulk, createStationShiftsBulk, assignHelperToStation, assignHelperToStationShift
} from '@/lib/shiftService';
import { getHelpers, createHelpersBulk, updateHelperPreferences } from '@/lib/helperService';
import { getMaterials, createMaterialsBulk } from '@/lib/materialService';
import { shiftFestivalDate } from '@/lib/shiftDates';

export interface CopyFestivalOptions {
	stationIds: string[];
	/**
	 * Die ganze Helferliste des Quellfests als neue Zeilen ins Zielfest. Weil
	 * ein Helfer dem Fest gehört (ADR 0005), ist das der einzige Weg,
	 * letztjährige Helfer zu holen.
	 */
	copyHelpers: boolean;
	/** Setzt `copyHelpers` voraus — ohne Helfer hängt keine Zuteilung an etwas. */
	copyAssignments: boolean;
	materialIds: string[];
	materialQuantitySource: 'ordered' | 'actual';
	sourceFestivalStartDate: string;
	targetFestivalStartDate: string;
}

/** IDs auf ihre Entsprechung im Zielfest; was dort nicht existiert, fällt weg. */
const remapIds = (ids: string[] | null | undefined, idMap: Record<string, string>): string[] =>
	(ids || []).map(id => idMap[id]).filter(Boolean);

export async function copyFestivalData(
	sourceFestivalId: string,
	targetFestivalId: string,
	options: CopyFestivalOptions
): Promise<void> {
	const stationIdMap: Record<string, string> = {};
	const shiftIdMap: Record<string, string> = {};
	/** Quell-Helfer → seine neue Zeile im Zielfest. */
	const helperIdMap: Record<string, string> = {};
	// Ohne kopierte Helfer hängt keine Zuteilung an etwas — die Oberfläche graut
	// den Schalter dann aus, hier steht die Regel noch einmal, damit sie nicht an
	// der Oberfläche allein hängt.
	const copyAssignments = options.copyHelpers && options.copyAssignments;

	// Step 1: Copy helpers — vor den Stationen, weil der Verantwortliche einer
	// Station schon auf die neue Helfer-Zeile zeigen muss. Ein Helfer gehört dem
	// Fest (ADR 0005), die Zuteilungen des Quellfests können im Zielfest also
	// nicht auf dieselbe Zeile zeigen. Kopiert wird die **ganze** Liste, nicht
	// nur die Zugeteilten: wer denselben Stamm, aber einen frischen Plan will,
	// soll nicht jeden Namen neu tippen müssen (#100). Die Wünsche folgen erst,
	// wenn Stationen und Schichten stehen — vorher gäbe es nichts, worauf sie
	// zeigen könnten.
	const sourceHelpers = options.copyHelpers ? await getHelpers(sourceFestivalId) : [];
	const newHelperIds = await createHelpersBulk(
		targetFestivalId,
		sourceHelpers.map(helper => ({
			first_name: helper.first_name,
			last_name: helper.last_name,
			email: helper.email,
			phone: helper.phone,
			notes: helper.notes
		}))
	);
	sourceHelpers.forEach((old, i) => {
		helperIdMap[old.id] = newHelperIds[i];
	});

	// Step 2: Copy stations
	if (options.stationIds.length > 0) {
		const allStations = await getStations(sourceFestivalId);
		const selectedStations = allStations.filter(s => options.stationIds.includes(s.id));

		const stationsToInsert = selectedStations.map(s => ({
			festival_id: targetFestivalId,
			name: s.name,
			description: s.description || undefined,
			required_people: s.required_people,
			// Der Verantwortliche ist eine Zuteilung wie jede andere und hängt
			// darum am zweiten Schalter, nicht schon am ersten.
			responsible_helper_id:
				(copyAssignments && s.responsible_helper_id && helperIdMap[s.responsible_helper_id]) ||
				undefined,
		}));

		const created = await createStationsBulk(stationsToInsert);
		selectedStations.forEach((old, i) => {
			stationIdMap[old.id] = created[i].id;
		});

		// Step 3: Copy shifts for selected stations
		const allShifts = await getStationShifts(sourceFestivalId);
		const selectedShifts = allShifts.filter(s => stationIdMap[s.station_id]);

		if (selectedShifts.length > 0) {
			const shiftsToInsert = selectedShifts.map(s => ({
				festival_id: targetFestivalId,
				station_id: stationIdMap[s.station_id],
				name: s.name,
				// Dieselbe Versatz-Funktion, die die Vorschau in Schritt 2 des
				// Kopierwerks anschreibt (#94) — sonst verspricht der Bildschirm
				// Termine, die hier anders landen.
				start_date: shiftFestivalDate(options.sourceFestivalStartDate, s.start_date, options.targetFestivalStartDate),
				end_date: s.end_date
					? shiftFestivalDate(options.sourceFestivalStartDate, s.end_date, options.targetFestivalStartDate)
					: undefined,
				start_time: s.start_time,
				end_time: s.end_time,
				required_people: s.required_people,
			}));

			const createdShifts = await createStationShiftsBulk(shiftsToInsert);
			selectedShifts.forEach((old, i) => {
				shiftIdMap[old.id] = createdShifts[i].id;
			});
		}

		// Step 4: Remap the copied helpers' preferences. Erst hier, weil beide
		// Maps stehen müssen; wessen Station oder Schicht in Schritt 2 abgewählt
		// wurde, fällt still raus statt als Karteileiche mitzukommen (ADR 0005:
		// Wünsche haben keine Fremdschlüssel). Ohne gewählte Station gibt es
		// nichts umzuschlüsseln — darum steht der Block hier drinnen.
		for (const helper of sourceHelpers) {
			const stationPreferences = remapIds(helper.station_preferences, stationIdMap);
			const shiftPreferences = remapIds(helper.shift_preferences, shiftIdMap);
			// Eine frische Helfer-Zeile trägt ohnehin zwei leere Arrays — ein
			// Update, das nichts setzt, wäre eine Abfrage ohne Wirkung.
			if (stationPreferences.length === 0 && shiftPreferences.length === 0) continue;
			await updateHelperPreferences(
				targetFestivalId,
				helperIdMap[helper.id],
				stationPreferences,
				shiftPreferences
			);
		}

		// Step 5: Copy assignments if requested
		if (copyAssignments) {
			// Station helpers
			const allStationHelpers = await getStationHelpers(sourceFestivalId);
			const selectedStationHelpers = allStationHelpers.filter(
				sm => stationIdMap[sm.station_id] && helperIdMap[sm.helper_id]
			);
			for (const sm of selectedStationHelpers) {
				await assignHelperToStation(
					targetFestivalId,
					stationIdMap[sm.station_id],
					helperIdMap[sm.helper_id]
				);
			}

			// Shift assignments
			const allAssignments = await getShiftAssignments(sourceFestivalId);
			const selectedAssignments = allAssignments.filter(
				a => a.helper_id && shiftIdMap[a.station_shift_id] && helperIdMap[a.helper_id]
			);
			for (const a of selectedAssignments) {
				await assignHelperToStationShift(
					targetFestivalId,
					shiftIdMap[a.station_shift_id],
					helperIdMap[a.helper_id!],
					a.position
				);
			}
		}
	}

	// Step 6: Copy materials
	if (options.materialIds.length > 0) {
		const allMaterials = await getMaterials(sourceFestivalId);
		const selectedMaterials = allMaterials.filter(m => options.materialIds.includes(m.id));

		const materialsToInsert = selectedMaterials.map(m => ({
			festival_id: targetFestivalId,
			name: m.name,
			category: m.category,
			supplier: m.supplier,
			unit: m.unit,
			packaging_unit: m.packaging_unit,
			amount_per_packaging: m.amount_per_packaging,
			ordered_quantity: options.materialQuantitySource === 'actual'
				? (m.actual_quantity ?? 0)
				: (m.ordered_quantity ?? 0),
			actual_quantity: null,
			unit_price: m.unit_price,
			notes: m.notes,
			station_id: m.station_id && stationIdMap[m.station_id]
				? stationIdMap[m.station_id]
				: null,
		}));

		await createMaterialsBulk(materialsToInsert);
	}
}
