import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';

export interface ExportData {
	festivalName: string;
	festivalDate: string;
	stations: Station[];
	stationShifts: StationShift[];
	assignments: ShiftAssignmentWithMember[];
	stationMembers: StationMemberWithDetails[];
}

function formatShiftTime(shift: StationShift): string {
	const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
	const startDate = new Date(shift.start_date);
	const day = days[startDate.getDay()];
	const dateStr = startDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
	const startTime = shift.start_time.slice(0, 5);
	const endTime = shift.end_time.slice(0, 5);
	return `${day} ${dateStr} ${startTime}–${endTime}`;
}

function getMemberName(member?: { first_name: string; last_name: string }): string {
	if (!member) return '';
	return `${member.first_name} ${member.last_name}`;
}

function getStationShiftRows(station: Station, data: ExportData) {
	const shifts = data.stationShifts.filter(s => s.station_id === station.id);
	return shifts.map(shift => {
		const shiftAssignments = data.assignments.filter(a => a.station_shift_id === shift.id);
		const memberNames = shiftAssignments
			.map(a => getMemberName(a.member))
			.filter(Boolean)
			.join(', ');
		return {
			name: shift.name,
			time: formatShiftTime(shift),
			members: memberNames || '–',
		};
	});
}

function getStationMemberNames(station: Station, data: ExportData): string {
	const members = data.stationMembers
		.filter(sm => sm.station_id === station.id)
		.map(sm => getMemberName(sm.member))
		.filter(Boolean);
	return members.length > 0 ? members.join(', ') : '–';
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

// ── Excel Export ──────────────────────────────────────────────

export function exportToExcel(data: ExportData): void {
	const rows: (string | number | null)[][] = [];

	// Header
	rows.push([data.festivalName]);
	rows.push([data.festivalDate]);
	rows.push([]);

	for (const station of data.stations) {
		const responsible = station.responsible_member
			? getMemberName(station.responsible_member)
			: '–';

		// Station header row
		rows.push([
			`Station: ${station.name}`,
			`Verantwortlich: ${responsible}`,
			`Bedarf: ${station.required_people} Personen`,
		]);

		// Station members row
		rows.push([`Mitglieder: ${getStationMemberNames(station, data)}`]);

		// Shift table
		const shiftRows = getStationShiftRows(station, data);
		if (shiftRows.length > 0) {
			rows.push(['Schicht', 'Zeit', 'Personen']);
			for (const row of shiftRows) {
				rows.push([row.name, row.time, row.members]);
			}
		}

		// Spacer
		rows.push([]);
	}

	const ws = XLSX.utils.aoa_to_sheet(rows);

	// Auto column widths
	const colWidths = [30, 30, 40].map(w => ({ wch: w }));
	ws['!cols'] = colWidths;

	// Merge festival name across columns
	ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

	// Bold styles for header cells
	if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 } };

	// Bold station headers
	let rowIndex = 0;
	for (const row of rows) {
		if (row[0] && typeof row[0] === 'string' && row[0].startsWith('Station: ')) {
			const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
			if (ws[cellRef]) ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DDDDDD' } } };
		}
		if (row[0] === 'Schicht') {
			for (let c = 0; c < 3; c++) {
				const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c });
				if (ws[cellRef]) ws[cellRef].s = { font: { bold: true } };
			}
		}
		rowIndex++;
	}

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Schichtplan');
	XLSX.writeFile(wb, `${sanitizeFilename(data.festivalName)}_Schichtplan.xlsx`);
}

// ── PDF Export ────────────────────────────────────────────────

export function exportToPdf(data: ExportData): void {
	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	let y = 15;

	// Title
	doc.setFontSize(18);
	doc.setFont('helvetica', 'bold');
	doc.text(data.festivalName, pageWidth / 2, y, { align: 'center' });
	y += 8;
	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.text(data.festivalDate, pageWidth / 2, y, { align: 'center' });
	y += 12;

	const margin = 14;
	const maxTextWidth = pageWidth - margin * 2;
	const pageHeight = doc.internal.pageSize.getHeight();

	for (const station of data.stations) {
		const responsible = station.responsible_member
			? getMemberName(station.responsible_member)
			: '–';

		// Check if we need a page break (at least 40mm needed for station header + some rows)
		if (y > pageHeight - 40) {
			doc.addPage();
			y = 15;
		}

		// Station header
		doc.setFontSize(13);
		doc.setFont('helvetica', 'bold');
		doc.text(`Station: ${station.name}`, margin, y);
		y += 6;

		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');

		const infoLine = `Verantwortlich: ${responsible}  |  Bedarf: ${station.required_people} Personen`;
		const infoLines = doc.splitTextToSize(infoLine, maxTextWidth);
		doc.text(infoLines, margin, y);
		y += infoLines.length * 4.5;

		const memberLine = `Mitglieder: ${getStationMemberNames(station, data)}`;
		const memberLines = doc.splitTextToSize(memberLine, maxTextWidth);
		doc.text(memberLines, margin, y);
		y += memberLines.length * 4.5 + 2;

		// Shift table
		const shiftRows = getStationShiftRows(station, data);
		if (shiftRows.length > 0) {
			autoTable(doc, {
				startY: y,
				head: [['Schicht', 'Zeit', 'Personen']],
				body: shiftRows.map(r => [r.name, r.time, r.members]),
				theme: 'grid',
				styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
				headStyles: { fillColor: [80, 80, 80], fontStyle: 'bold' },
				columnStyles: {
					0: { cellWidth: 50 },
					1: { cellWidth: 60 },
					2: { cellWidth: 'auto' },
				},
				margin: { left: margin, right: margin },
			});
			y = (doc as any).lastAutoTable.finalY + 10;
		} else {
			y += 4;
		}
	}

	doc.save(`${sanitizeFilename(data.festivalName)}_Schichtplan.pdf`);
}
