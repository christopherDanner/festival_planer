import * as XLSX from 'xlsx';
import { Shift, Station, ShiftAssignmentWithMember, StationShiftAssignment } from './shiftService';
import { Member } from './memberService';

export interface ExportData {
	shifts: Shift[];
	stations: Station[];
	assignments: ShiftAssignmentWithMember[];
	stationShiftAssignments: StationShiftAssignment[];
	members: Member[];
	festivalName: string;
	festivalDates: string;
}

export const exportToExcel = (data: ExportData) => {
	const workbook = XLSX.utils.book_new();

	// Einfacher, übersichtlicher Export: Wer arbeitet wann wo
	const assignmentData: Record<string, string>[] = [];

	// Für jede Person eine Zeile mit allen ihren Zuweisungen
	data.members.forEach((member) => {
		const memberAssignments = data.assignments.filter(
			(assignment) => assignment.member_id === member.id
		);

		if (memberAssignments.length > 0) {
			// Person hat Zuweisungen
			memberAssignments.forEach((assignment) => {
				const shift = data.shifts.find((s) => s.id === assignment.shift_id);
				const station = data.stations.find((s) => s.id === assignment.station_id);

				assignmentData.push({
					Name: `${member.first_name} ${member.last_name}`,
					Schicht: shift?.name || '',
					Station: station?.name || '',
					Datum: shift?.start_date || '',
					Startzeit: shift?.start_time || '',
					Endzeit: shift?.end_time || '',
					Status: 'Zugewiesen'
				});
			});
		} else {
			// Person hat keine Zuweisungen
			assignmentData.push({
				Name: `${member.first_name} ${member.last_name}`,
				Schicht: '',
				Station: '',
				Datum: '',
				Startzeit: '',
				Endzeit: '',
				Status: 'Nicht zugewiesen'
			});
		}
	});

	// Sortiere nach Name
	assignmentData.sort((a, b) => a.Name.localeCompare(b.Name));

	const assignmentSheet = XLSX.utils.json_to_sheet(assignmentData);

	// Spaltenbreiten setzen
	assignmentSheet['!cols'] = [
		{ width: 20 }, // Name
		{ width: 15 }, // Schicht
		{ width: 15 }, // Station
		{ width: 12 }, // Datum
		{ width: 10 }, // Startzeit
		{ width: 10 }, // Endzeit
		{ width: 15 } // Status
	];

	XLSX.utils.book_append_sheet(workbook, assignmentSheet, 'Schichtplan Übersicht');

	// 2. Matrix Sheet - Wie die Anwendung
	const matrixData: string[][] = [];

	// Header Row mit Schicht-Details
	const headerRow = ['Station'];
	data.shifts.forEach((shift) => {
		headerRow.push(`${shift.name}\n${shift.start_date} ${shift.start_time}-${shift.end_time}`);
	});
	matrixData.push(headerRow);

	// Daten-Zeilen für jede Station
	data.stations.forEach((station) => {
		const row = [`${station.name}\n(${station.required_people} Personen)`];

		data.shifts.forEach((shift) => {
			const isAssigned = data.stationShiftAssignments.some(
				(assignment) => assignment.station_id === station.id && assignment.shift_id === shift.id
			);

			if (isAssigned) {
				const cellAssignments = data.assignments.filter(
					(assignment) => assignment.shift_id === shift.id && assignment.station_id === station.id
				);
				const assignedMembers = cellAssignments
					.map((a) => `${a.member?.first_name} ${a.member?.last_name}`)
					.join('\n');
				const remaining = station.required_people - cellAssignments.length;

				if (remaining > 0) {
					row.push(`${assignedMembers}\n\n⚠️ ${remaining} fehlt`);
				} else {
					row.push(`${assignedMembers}\n\n✅ Vollständig`);
				}
			} else {
				row.push('❌ Nicht zugewiesen');
			}
		});

		matrixData.push(row);
	});

	const matrixSheet = XLSX.utils.aoa_to_sheet(matrixData);

	// Spaltenbreiten für Matrix
	matrixSheet['!cols'] = data.shifts.map(() => ({ width: 20 }));
	matrixSheet['!cols'].unshift({ width: 25 }); // Station column

	XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Schichtplan Matrix');

	// Export Excel file
	const fileName = `Schichtplan_${data.festivalName.replace(/[^a-zA-Z0-9]/g, '_')}_${
		new Date().toISOString().split('T')[0]
	}.xlsx`;
	XLSX.writeFile(workbook, fileName);
};
