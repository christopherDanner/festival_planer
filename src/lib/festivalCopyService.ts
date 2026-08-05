import {
	getStations, getStationShifts, getStationHelpers, getShiftAssignments,
	createStationsBulk, createStationShiftsBulk, assignHelperToStation, assignHelperToStationShift
} from '@/lib/shiftService';
import { getHelpers, createHelper } from '@/lib/helperService';
import { getMaterials, createMaterialsBulk } from '@/lib/materialService';

export interface CopyFestivalOptions {
	stationIds: string[];
	copyAssignments: boolean;
	materialIds: string[];
	materialQuantitySource: 'ordered' | 'actual';
	sourceFestivalStartDate: string;
	targetFestivalStartDate: string;
}

function computeDateOffset(sourceStart: string, shiftDate: string, targetStart: string): string {
	const source = new Date(sourceStart);
	const shift = new Date(shiftDate);
	const target = new Date(targetStart);
	const offsetMs = shift.getTime() - source.getTime();
	const result = new Date(target.getTime() + offsetMs);
	return result.toISOString().split('T')[0];
}

export async function copyFestivalData(
	sourceFestivalId: string,
	targetFestivalId: string,
	options: CopyFestivalOptions
): Promise<void> {
	const stationIdMap: Record<string, string> = {};
	const shiftIdMap: Record<string, string> = {};
	/** Quell-Helfer → seine neue Zeile im Zielfest. */
	const helperIdMap: Record<string, string> = {};

	// Step 1: Copy stations
	if (options.stationIds.length > 0) {
		const allStations = await getStations(sourceFestivalId);
		const selectedStations = allStations.filter(s => options.stationIds.includes(s.id));

		// Ein Helfer gehört dem Fest (ADR 0005) — die Zuteilungen des Quellfests
		// können im Zielfest also nicht auf dieselbe Zeile zeigen. Wer gebraucht
		// wird, wird im Zielfest neu angelegt. Bewusst nur die tatsächlich
		// gebrauchten und ohne Wünsche: die ganze Helferliste samt auf die neuen
		// Stationen umgeschlüsselten Wünschen holt der eigene Schalter „Helfer
		// übernehmen" (ADR 0005), der noch nicht existiert.
		if (options.copyAssignments) {
			const sourceStationHelpers = await getStationHelpers(sourceFestivalId);
			const sourceAssignments = await getShiftAssignments(sourceFestivalId);

			// Nur Helfer, deren Zuteilung auch mitkopiert wird. Wer allein an einer
			// nicht gewählten Station hängt, bliebe im Zielfest ohne jede Zuteilung
			// stehen — und ohne Mitglieder-Seite räumt das niemand mehr auf.
			const selectedStationIds = new Set(selectedStations.map(s => s.id));
			const selectedShiftIds = new Set(
				(await getStationShifts(sourceFestivalId))
					.filter(s => selectedStationIds.has(s.station_id))
					.map(s => s.id)
			);

			const neededHelperIds = new Set<string>();
			for (const s of selectedStations) {
				if (s.responsible_helper_id) neededHelperIds.add(s.responsible_helper_id);
			}
			for (const sm of sourceStationHelpers) {
				if (sm.helper_id && selectedStationIds.has(sm.station_id)) {
					neededHelperIds.add(sm.helper_id);
				}
			}
			for (const a of sourceAssignments) {
				if (a.helper_id && selectedShiftIds.has(a.station_shift_id)) {
					neededHelperIds.add(a.helper_id);
				}
			}

			// Reihenfolge der Helferliste, damit die Kopie nachvollziehbar bleibt.
			const sourceHelpers = await getHelpers(sourceFestivalId);
			for (const helper of sourceHelpers) {
				if (!neededHelperIds.has(helper.id)) continue;
				helperIdMap[helper.id] = await createHelper(targetFestivalId, {
					first_name: helper.first_name,
					last_name: helper.last_name,
					email: helper.email,
					phone: helper.phone,
					notes: helper.notes
				});
			}
		}

		const stationsToInsert = selectedStations.map(s => ({
			festival_id: targetFestivalId,
			name: s.name,
			description: s.description || undefined,
			required_people: s.required_people,
			responsible_helper_id: (s.responsible_helper_id && helperIdMap[s.responsible_helper_id]) || undefined,
		}));

		const created = await createStationsBulk(stationsToInsert);
		selectedStations.forEach((old, i) => {
			stationIdMap[old.id] = created[i].id;
		});

		// Step 2: Copy shifts for selected stations
		const allShifts = await getStationShifts(sourceFestivalId);
		const selectedShifts = allShifts.filter(s => stationIdMap[s.station_id]);

		if (selectedShifts.length > 0) {
			const shiftsToInsert = selectedShifts.map(s => ({
				festival_id: targetFestivalId,
				station_id: stationIdMap[s.station_id],
				name: s.name,
				start_date: computeDateOffset(options.sourceFestivalStartDate, s.start_date, options.targetFestivalStartDate),
				end_date: s.end_date
					? computeDateOffset(options.sourceFestivalStartDate, s.end_date, options.targetFestivalStartDate)
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

		// Step 3: Copy assignments if requested
		if (options.copyAssignments) {
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

	// Step 4: Copy materials
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
