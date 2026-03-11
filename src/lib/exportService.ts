import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

export interface ExportData {
	festivalName: string;
	festivalDate: string;
	stations: Station[];
	stationShifts: StationShift[];
	assignments: ShiftAssignmentWithMember[];
	stationMembers: StationMemberWithDetails[];
	members: Member[];
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
	return `${member.last_name} ${member.first_name}`;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

/** Build per-station column data */
function buildStationColumns(data: ExportData) {
	return data.stations.map(station => {
		const stMembers = data.stationMembers
			.filter(sm => sm.station_id === station.id)
			.map(sm => getMemberName(sm.member))
			.filter(Boolean);

		const shifts = data.stationShifts.filter(s => s.station_id === station.id);
		const shiftBlocks = shifts.map(shift => {
			const assignedNames = data.assignments
				.filter(a => a.station_shift_id === shift.id)
				.map(a => getMemberName(a.member))
				.filter(Boolean);
			return {
				label: `${shift.name} (${formatShiftTime(shift)})`,
				filled: assignedNames.length,
				required: shift.required_people,
				names: assignedNames,
			};
		});

		const responsible = station.responsible_member
			? getMemberName(station.responsible_member)
			: null;

		return {
			station,
			responsible,
			stationMemberNames: stMembers,
			shiftBlocks,
		};
	});
}

/** Build member overview with assigned station names */
function buildMemberOverview(data: ExportData) {
	// Map shift -> station for lookups
	const shiftToStation: Record<string, string> = {};
	for (const shift of data.stationShifts) {
		shiftToStation[shift.id] = shift.station_id;
	}

	const stationNameMap: Record<string, string> = {};
	for (const station of data.stations) {
		stationNameMap[station.id] = station.name;
	}

	const memberStations: Record<string, Set<string>> = {};
	const counts: Record<string, number> = {};
	for (const m of data.members) {
		memberStations[m.id] = new Set();
		counts[m.id] = 0;
	}

	// Direct station assignments
	for (const sm of data.stationMembers) {
		if (counts[sm.member_id] !== undefined) {
			counts[sm.member_id]++;
			const name = stationNameMap[sm.station_id];
			if (name) memberStations[sm.member_id].add(name);
		}
	}

	// Shift assignments
	for (const a of data.assignments) {
		if (a.member_id && counts[a.member_id] !== undefined) {
			counts[a.member_id]++;
			const stationId = shiftToStation[a.station_shift_id];
			const name = stationId ? stationNameMap[stationId] : undefined;
			if (name) memberStations[a.member_id].add(name);
		}
	}

	return data.members.map(m => ({
		name: getMemberName(m),
		id: m.id,
		count: counts[m.id] || 0,
		stations: [...(memberStations[m.id] || [])],
		isActive: m.is_active,
	}));
}

// ── Excel Export ──────────────────────────────────────────────

export function exportToExcel(data: ExportData): void {
	const wb = XLSX.utils.book_new();
	const columns = buildStationColumns(data);

	// ── Sheet 1: Station columns ──
	const totalCols = columns.length * 2 - 1;
	const grid: (string | null)[][] = [];

	// Row 0: Title
	const titleRow: (string | null)[] = Array(Math.max(totalCols, 1)).fill(null);
	titleRow[0] = `${data.festivalName} — ${data.festivalDate}`;
	grid.push(titleRow);
	grid.push(Array(totalCols).fill(null));

	// Build each column's rows
	const colRows: string[][] = columns.map(col => {
		const rows: string[] = [];
		rows.push(col.station.name);
		if (col.responsible) {
			rows.push(`Leitung: ${col.responsible}`);
		}
		const totalAssigned = col.stationMemberNames.length + col.shiftBlocks.reduce((s, b) => s + b.names.length, 0);
		rows.push(`${totalAssigned}/${col.station.required_people} Personen`);
		rows.push('');

		if (col.stationMemberNames.length > 0) {
			for (const name of col.stationMemberNames) rows.push(name);
			rows.push('');
		}

		for (const block of col.shiftBlocks) {
			rows.push(block.label);
			rows.push(`${block.filled}/${block.required} besetzt`);
			if (block.names.length > 0) {
				for (const name of block.names) rows.push(name);
			} else {
				rows.push('– keine –');
			}
			rows.push('');
		}

		return rows;
	});

	const maxRows = Math.max(...colRows.map(r => r.length));

	for (let r = 0; r < maxRows; r++) {
		const row: (string | null)[] = [];
		for (let c = 0; c < columns.length; c++) {
			if (c > 0) row.push(null);
			row.push(colRows[c][r] ?? null);
		}
		grid.push(row);
	}

	const ws = XLSX.utils.aoa_to_sheet(grid);

	const colWidths: { wch: number }[] = [];
	for (let c = 0; c < columns.length; c++) {
		if (c > 0) colWidths.push({ wch: 2 });
		colWidths.push({ wch: 30 });
	}
	ws['!cols'] = colWidths;

	if (totalCols > 1) {
		ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
	}

	XLSX.utils.book_append_sheet(wb, ws, 'Schichtplan');

	// ── Sheet 2: Member overview ──
	const overview = buildMemberOverview(data);
	overview.sort((a, b) => a.count - b.count);

	const ovRows: (string | number | null)[][] = [];
	ovRows.push(['Mitgliederübersicht']);
	ovRows.push([]);
	ovRows.push(['Name', 'Zuweisungen', 'Station']);

	for (const m of overview) {
		const stationText = m.count === 0 ? 'FREI' : m.stations.join(', ');
		ovRows.push([m.name, m.count, stationText]);
	}

	ovRows.push([]);
	const freeCount = overview.filter(m => m.count === 0).length;
	const assignedCount = overview.filter(m => m.count > 0).length;
	ovRows.push([`Gesamt: ${overview.length} Mitglieder | ${freeCount} frei | ${assignedCount} zugewiesen`]);

	const ws2 = XLSX.utils.aoa_to_sheet(ovRows);
	ws2['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 40 }];

	XLSX.utils.book_append_sheet(wb, ws2, 'Übersicht');

	XLSX.writeFile(wb, `${sanitizeFilename(data.festivalName)}_Schichtplan.xlsx`);
}

// ── PDF Export ────────────────────────────────────────────────

export function exportToPdf(data: ExportData): void {
	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 14;
	let y = 15;

	// Title
	doc.setFontSize(16);
	doc.setFont('helvetica', 'bold');
	doc.text(data.festivalName, pageWidth / 2, y, { align: 'center' });
	y += 7;
	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	doc.text(data.festivalDate, pageWidth / 2, y, { align: 'center' });
	y += 10;

	// ── Station columns as table ──
	const columns = buildStationColumns(data);
	const head = columns.map(col => col.station.name);

	const colLines: string[][] = columns.map(col => {
		const lines: string[] = [];
		if (col.responsible) {
			lines.push(`Leitung: ${col.responsible}`);
		}
		const totalAssigned = col.stationMemberNames.length + col.shiftBlocks.reduce((s, b) => s + b.names.length, 0);
		lines.push(`${totalAssigned}/${col.station.required_people} Personen`);

		if (col.stationMemberNames.length > 0) {
			lines.push('');
			for (const name of col.stationMemberNames) lines.push(name);
		}

		for (const block of col.shiftBlocks) {
			lines.push('');
			lines.push(block.label);
			lines.push(`${block.filled}/${block.required} besetzt`);
			if (block.names.length > 0) {
				for (const name of block.names) lines.push(name);
			} else {
				lines.push('– keine –');
			}
		}

		return lines;
	});

	const maxLines = Math.max(...colLines.map(l => l.length));
	const bodyRows: string[][] = [];
	for (let r = 0; r < maxLines; r++) {
		bodyRows.push(colLines.map(lines => lines[r] ?? ''));
	}

	const usableWidth = pageWidth - margin * 2;
	const colWidth = usableWidth / columns.length;

	autoTable(doc, {
		startY: y,
		head: [head],
		body: bodyRows,
		theme: 'grid',
		styles: {
			fontSize: 7.5,
			cellPadding: { top: 1.2, right: 2, bottom: 1.2, left: 2 },
			overflow: 'linebreak',
			valign: 'top',
			lineWidth: 0.2,
			cellWidth: 'wrap',
		},
		headStyles: {
			fillColor: [70, 70, 70],
			fontStyle: 'bold',
			fontSize: 9,
			halign: 'center',
			cellPadding: 3,
		},
		columnStyles: Object.fromEntries(
			columns.map((_, i) => [i, { cellWidth: colWidth, minCellWidth: 30 }])
		),
		margin: { left: margin, right: margin },
		tableWidth: usableWidth,
		didParseCell: (hookData) => {
			if (hookData.section === 'body') {
				const text = hookData.cell.raw as string;
				if (text.match(/^\d+\/\d+ besetzt$/)) {
					hookData.cell.styles.fontStyle = 'bold';
					hookData.cell.styles.textColor = [100, 100, 100];
					hookData.cell.styles.fontSize = 6.5;
				}
				if (text.startsWith('Leitung:')) {
					hookData.cell.styles.fontStyle = 'italic';
					hookData.cell.styles.textColor = [80, 80, 80];
					hookData.cell.styles.fontSize = 7;
				}
				// Shift time labels: "Name (Do 01.01 08:00–16:00)"
				if (/\(\w{2}\s\d{2}\.\d{2}/.test(text)) {
					hookData.cell.styles.fontStyle = 'bold';
					hookData.cell.styles.fontSize = 7;
				}
				if (text.match(/^\d+\/\d+ Personen$/)) {
					hookData.cell.styles.fontStyle = 'italic';
					hookData.cell.styles.textColor = [120, 120, 120];
					hookData.cell.styles.fontSize = 6.5;
				}
			}
		},
	});

	y = (doc as any).lastAutoTable.finalY + 12;

	// ── Member overview ──
	const overview = buildMemberOverview(data);
	overview.sort((a, b) => a.count - b.count);

	doc.addPage();
	y = 15;

	doc.setFontSize(13);
	doc.setFont('helvetica', 'bold');
	doc.text('Mitgliederübersicht', margin, y);
	y += 6;

	const freeCount = overview.filter(m => m.count === 0).length;
	const assignedCount = overview.filter(m => m.count > 0).length;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.text(`${overview.length} Mitglieder gesamt | ${freeCount} frei | ${assignedCount} zugewiesen`, margin, y);
	y += 6;

	autoTable(doc, {
		startY: y,
		head: [['Name', 'Zuweisungen', 'Station']],
		body: overview.map(m => [
			m.name,
			m.count.toString(),
			m.count === 0 ? 'FREI' : m.stations.join(', '),
		]),
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: 2,
			overflow: 'linebreak',
		},
		headStyles: { fillColor: [70, 70, 70], fontStyle: 'bold', fontSize: 9 },
		columnStyles: {
			0: { cellWidth: 55 },
			1: { cellWidth: 22, halign: 'center' },
			2: { cellWidth: 'auto' },
		},
		margin: { left: margin, right: margin },
		tableWidth: usableWidth,
		didParseCell: (hookData) => {
			if (hookData.section === 'body') {
				const rowIdx = hookData.row.index;
				const memberData = overview[rowIdx];
				if (memberData && memberData.count === 0) {
					hookData.cell.styles.fillColor = [255, 235, 235];
					hookData.cell.styles.textColor = [180, 40, 40];
					hookData.cell.styles.fontStyle = 'bold';
				} else if (memberData && memberData.count >= 3) {
					hookData.cell.styles.fillColor = [255, 248, 225];
					hookData.cell.styles.textColor = [160, 120, 20];
				}
			}
		},
	});

	doc.save(`${sanitizeFilename(data.festivalName)}_Schichtplan.pdf`);
}
