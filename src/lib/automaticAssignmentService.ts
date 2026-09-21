import { supabase } from '@/integrations/supabase/client';
import type { Station, StationShift } from './shiftService';
import { assignHelperToStationShift, getShiftAssignments } from './shiftService';
import type { Helper } from './helperService';

export interface AutoAssignmentConfig {
	minShiftsPerHelper: number;
	maxShiftsPerHelper: number;
	respectPreferences: boolean;
}

export interface AssignmentResult {
	success: boolean;
	assignmentsCreated: number;
	unfilledPositions: Array<{
		stationShiftId: string;
		stationId: string;
		remainingSlots: number;
	}>;
	helperStats: Array<{
		helperId: string;
		assignedShifts: number;
	}>;
}

interface AssignmentScore {
	helperId: string;
	score: number;
	hasPreference: boolean;
	currentShifts: number;
}

export const performAutomaticAssignment = async (
	festivalId: string,
	stationShifts: StationShift[],
	stations: Station[],
	helpers: Helper[],
	config: AutoAssignmentConfig,
	stationPreferences?: Record<string, string[]>
): Promise<AssignmentResult> => {
	const result: AssignmentResult = {
		success: false,
		assignmentsCreated: 0,
		unfilledPositions: [],
		helperStats: []
	};

	try {
		// Get existing assignments
		const existingAssignments = await getShiftAssignments(festivalId);

		// Track helper shift counts
		const helperShiftCounts = new Map<string, number>();
		helpers.forEach((helper) => {
			const currentAssignments = existingAssignments.filter((a) => a.helper_id === helper.id);
			helperShiftCounts.set(helper.id, currentAssignments.length);
		});

		// Build assignment matrix directly from station shifts
		const assignmentMatrix: Array<{
			stationShiftId: string;
			stationId: string;
			requiredPeople: number;
			currentAssignments: number;
			remainingSlots: number;
		}> = [];

		stationShifts.forEach((stationShift) => {
			const currentAssignments = existingAssignments.filter(
				(a) => a.station_shift_id === stationShift.id && a.helper_id
			).length;

			const remainingSlots = stationShift.required_people - currentAssignments;

			assignmentMatrix.push({
				stationShiftId: stationShift.id,
				stationId: stationShift.station_id,
				requiredPeople: stationShift.required_people,
				currentAssignments,
				remainingSlots: Math.max(0, remainingSlots)
			});
		});

		// Sort positions by priority (least filled first)
		assignmentMatrix.sort((a, b) => {
			const aFillRatio = a.currentAssignments / a.requiredPeople;
			const bFillRatio = b.currentAssignments / b.requiredPeople;
			return aFillRatio - bFillRatio;
		});

		let assignmentsCreated = 0;

		// Process each position that needs filling
		for (const position of assignmentMatrix) {
			if (position.remainingSlots <= 0) continue;

			// Kein Aktiv-Filter mehr (ADR 0005): wer nicht mitmacht, steht gar nicht
			// erst in der Helferliste des Fests.
			const availableHelpers = helpers.filter((helper) => {
				const currentShifts = helperShiftCounts.get(helper.id) || 0;

				// Check if the helper is already assigned to this station shift
				const alreadyAssigned = existingAssignments.some(
					(a) => a.station_shift_id === position.stationShiftId && a.helper_id === helper.id
				);

				return !alreadyAssigned && currentShifts < config.maxShiftsPerHelper;
			});

			if (availableHelpers.length === 0) continue;

			// Score helpers for this position
			const helperScores: AssignmentScore[] = availableHelpers.map((helper) => {
				const currentShifts = helperShiftCounts.get(helper.id) || 0;
				let score = 0;

				// Preference bonus (highest priority)
				const helperPreferences = stationPreferences?.[helper.id] || [];
				const hasPreference =
					config.respectPreferences && helperPreferences.includes(position.stationId);
				if (hasPreference) {
					score += 1000;
				}

				// Favor helpers with fewer shifts (load balancing)
				score += (config.maxShiftsPerHelper - currentShifts) * 10;

				// Small bonus for helpers below minimum shifts
				if (currentShifts < config.minShiftsPerHelper) {
					score += 50;
				}

				// Add small randomization to break ties
				score += Math.random() * 5;

				return {
					helperId: helper.id,
					score,
					hasPreference,
					currentShifts
				};
			});

			// Sort by score (highest first)
			helperScores.sort((a, b) => b.score - a.score);

			// Assign slots for this position
			const slotsToFill = Math.min(position.remainingSlots, helperScores.length);

			for (let slot = 0; slot < slotsToFill; slot++) {
				const selectedHelper = helperScores[slot];

				try {
					await assignHelperToStationShift(
						festivalId,
						position.stationShiftId,
						selectedHelper.helperId,
						position.currentAssignments + slot + 1
					);

					// Update our tracking
					helperShiftCounts.set(
						selectedHelper.helperId,
						(helperShiftCounts.get(selectedHelper.helperId) || 0) + 1
					);

					assignmentsCreated++;
				} catch (error) {
					console.error('Failed to assign helper:', error);
				}
			}

			// Update remaining slots
			position.remainingSlots -= slotsToFill;
		}

		// Calculate final stats
		result.helperStats = helpers.map((helper) => ({
			helperId: helper.id,
			assignedShifts: helperShiftCounts.get(helper.id) || 0
		}));

		result.unfilledPositions = assignmentMatrix
			.filter((pos) => pos.remainingSlots > 0)
			.map((pos) => ({
				stationShiftId: pos.stationShiftId,
				stationId: pos.stationId,
				remainingSlots: pos.remainingSlots
			}));

		result.assignmentsCreated = assignmentsCreated;
		result.success = true;

		return result;
	} catch (error) {
		console.error('Automatic assignment failed:', error);
		return result;
	}
};

export const clearAllAssignments = async (festivalId: string): Promise<boolean> => {
	try {
		const { error } = await supabase
			.from('shift_assignments')
			.delete()
			.eq('festival_id', festivalId);

		if (error) throw error;
		return true;
	} catch (error) {
		console.error('Failed to clear assignments:', error);
		return false;
	}
};
