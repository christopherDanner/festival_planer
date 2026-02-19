import { supabase } from '@/integrations/supabase/client';
import type { Station, StationShift } from './shiftService';
import { assignMemberToStationShift, getShiftAssignments } from './shiftService';
import type { Member } from './memberService';

export interface AutoAssignmentConfig {
	minShiftsPerMember: number;
	maxShiftsPerMember: number;
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
	memberStats: Array<{
		memberId: string;
		assignedShifts: number;
	}>;
}

interface AssignmentScore {
	memberId: string;
	score: number;
	hasPreference: boolean;
	currentShifts: number;
}

export const performAutomaticAssignment = async (
	festivalId: string,
	stationShifts: StationShift[],
	stations: Station[],
	members: Member[],
	config: AutoAssignmentConfig,
	stationPreferences?: Record<string, string[]>
): Promise<AssignmentResult> => {
	const result: AssignmentResult = {
		success: false,
		assignmentsCreated: 0,
		unfilledPositions: [],
		memberStats: []
	};

	try {
		// Get existing assignments
		const existingAssignments = await getShiftAssignments(festivalId);

		// Track member shift counts
		const memberShiftCounts = new Map<string, number>();
		members.forEach((member) => {
			const currentAssignments = existingAssignments.filter((a) => a.member_id === member.id);
			memberShiftCounts.set(member.id, currentAssignments.length);
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
				(a) => a.station_shift_id === stationShift.id && a.member_id
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

			const availableMembers = members.filter((member) => {
				const currentShifts = memberShiftCounts.get(member.id) || 0;

				// Check if member is already assigned to this station shift
				const alreadyAssigned = existingAssignments.some(
					(a) => a.station_shift_id === position.stationShiftId && a.member_id === member.id
				);

				return (
					!alreadyAssigned && currentShifts < config.maxShiftsPerMember && member.is_active
				);
			});

			if (availableMembers.length === 0) continue;

			// Score members for this position
			const memberScores: AssignmentScore[] = availableMembers.map((member) => {
				const currentShifts = memberShiftCounts.get(member.id) || 0;
				let score = 0;

				// Preference bonus (highest priority)
				const memberPreferences = stationPreferences?.[member.id] || [];
				const hasPreference =
					config.respectPreferences && memberPreferences.includes(position.stationId);
				if (hasPreference) {
					score += 1000;
				}

				// Favor members with fewer shifts (load balancing)
				score += (config.maxShiftsPerMember - currentShifts) * 10;

				// Small bonus for members below minimum shifts
				if (currentShifts < config.minShiftsPerMember) {
					score += 50;
				}

				// Add small randomization to break ties
				score += Math.random() * 5;

				return {
					memberId: member.id,
					score,
					hasPreference,
					currentShifts
				};
			});

			// Sort by score (highest first)
			memberScores.sort((a, b) => b.score - a.score);

			// Assign slots for this position
			const slotsToFill = Math.min(position.remainingSlots, memberScores.length);

			for (let slot = 0; slot < slotsToFill; slot++) {
				const selectedMember = memberScores[slot];

				try {
					await assignMemberToStationShift(
						festivalId,
						position.stationShiftId,
						selectedMember.memberId,
						position.currentAssignments + slot + 1
					);

					// Update our tracking
					memberShiftCounts.set(
						selectedMember.memberId,
						(memberShiftCounts.get(selectedMember.memberId) || 0) + 1
					);

					assignmentsCreated++;
				} catch (error) {
					console.error('Failed to assign member:', error);
				}
			}

			// Update remaining slots
			position.remainingSlots -= slotsToFill;
		}

		// Calculate final stats
		result.memberStats = members.map((member) => ({
			memberId: member.id,
			assignedShifts: memberShiftCounts.get(member.id) || 0
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
