import {
	getStations, getStationShifts, getStationMembers, getShiftAssignments,
	createStationsBulk, createStationShiftsBulk, assignMemberToStation, assignMemberToStationShift
} from '@/lib/shiftService';
import { getMaterials, createMaterialsBulk } from '@/lib/materialService';
import { supabase } from '@/integrations/supabase/client';

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

	// Step 1: Copy stations
	if (options.stationIds.length > 0) {
		const allStations = await getStations(sourceFestivalId);
		const selectedStations = allStations.filter(s => options.stationIds.includes(s.id));

		const stationsToInsert = selectedStations.map(s => ({
			festival_id: targetFestivalId,
			name: s.name,
			description: s.description || undefined,
			required_people: s.required_people,
			responsible_member_id: options.copyAssignments ? (s.responsible_member_id || undefined) : undefined,
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
			const { data: existingMembers } = await supabase
				.from('members')
				.select('id');
			const existingMemberIds = new Set((existingMembers || []).map(m => m.id));

			// Station members
			const allStationMembers = await getStationMembers(sourceFestivalId);
			const selectedStationMembers = allStationMembers.filter(
				sm => stationIdMap[sm.station_id] && existingMemberIds.has(sm.member_id)
			);
			for (const sm of selectedStationMembers) {
				await assignMemberToStation(targetFestivalId, stationIdMap[sm.station_id], sm.member_id);
			}

			// Shift assignments
			const allAssignments = await getShiftAssignments(sourceFestivalId);
			const selectedAssignments = allAssignments.filter(
				a => a.member_id && shiftIdMap[a.station_shift_id] && existingMemberIds.has(a.member_id)
			);
			for (const a of selectedAssignments) {
				await assignMemberToStationShift(
					targetFestivalId,
					shiftIdMap[a.station_shift_id],
					a.member_id!,
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
