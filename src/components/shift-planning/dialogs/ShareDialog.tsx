import React, { useState, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Share2, Copy, MessageCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

interface ShareDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalName: string;
	festivalDate: string;
	stations: Station[];
	stationShifts: StationShift[];
	assignments: ShiftAssignmentWithMember[];
	stationMembers: StationMemberWithDetails[];
	members: Member[];
	onExportPdf: () => void;
	onExportExcel: () => void;
}

function formatShiftTime(shift: StationShift): string {
	const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
	const startDate = new Date(shift.start_date);
	const day = days[startDate.getDay()];
	const dateStr = startDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
	return `${day} ${dateStr} ${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`;
}

function resolveMemberName(memberId: string | undefined, members: Member[], assignment?: ShiftAssignmentWithMember): string {
	// Try populated relation on assignment
	if (assignment?.member?.last_name) {
		return `${assignment.member.last_name} ${assignment.member.first_name}`;
	}
	// Fallback: lookup by ID
	const id = memberId || assignment?.member_id;
	if (id) {
		const m = members.find(mem => mem.id === id);
		if (m) return `${m.last_name} ${m.first_name}`;
	}
	return '';
}

const ShareDialog: React.FC<ShareDialogProps> = ({
	open,
	onOpenChange,
	festivalName,
	festivalDate,
	stations,
	stationShifts,
	assignments,
	stationMembers,
	members,
	onExportPdf,
	onExportExcel
}) => {
	const { toast } = useToast();
	const isMobile = useIsMobile();
	const [mode, setMode] = useState<'full' | 'member'>('full');
	const [selectedMemberId, setSelectedMemberId] = useState<string>('__none__');

	const sortedMembers = useMemo(
		() => [...members].sort((a, b) => a.last_name.localeCompare(b.last_name)),
		[members]
	);

	function generateFullPlanText(): string {
		let text = `SCHICHTPLAN\n${festivalName}\n${festivalDate}\n`;

		for (const station of stations) {
			text += `\n--- ${station.name} ---\n`;

			// Station-level members (without specific shifts)
			const stMembers = stationMembers.filter(sm => sm.station_id === station.id);
			if (stMembers.length > 0) {
				const names = stMembers
					.map(sm => {
						if (sm.member) return `${sm.member.last_name} ${sm.member.first_name}`;
						return resolveMemberName(sm.member_id, members);
					})
					.filter(Boolean);
				if (names.length > 0) {
					text += `Mitglieder:\n`;
					for (const name of names) {
						text += `  - ${name}\n`;
					}
				}
			}

			// Shifts with their assignments
			const stShifts = stationShifts.filter(s => s.station_id === station.id);
			for (const shift of stShifts) {
				const time = formatShiftTime(shift);
				const shiftAssignments = assignments.filter(a => a.station_shift_id === shift.id);
				const names = shiftAssignments.map(a => resolveMemberName(undefined, members, a)).filter(Boolean);
				text += `${shift.name} (${time})\n`;
				if (names.length > 0) {
					for (const name of names) {
						text += `  - ${name}\n`;
					}
				} else {
					text += `  (nicht besetzt)\n`;
				}
			}

			// Station with no shifts and no members
			if (stShifts.length === 0 && stMembers.length === 0) {
				text += `  (keine Zuweisungen)\n`;
			}
		}
		return text.trim();
	}

	function generateMemberPlanText(memberId: string): string {
		const member = members.find(m => m.id === memberId);
		if (!member) return '';

		const name = `${member.last_name} ${member.first_name}`;
		let text = `EINSATZPLAN\n${name}\n${festivalName} | ${festivalDate}\n`;

		// Station-level assignments
		const memberStations = stationMembers.filter(sm => sm.member_id === memberId);
		// Shift assignments
		const memberAssignments = assignments.filter(a => a.member_id === memberId);

		// Collect all station IDs this member is assigned to
		const stationIds = new Set<string>();
		memberStations.forEach(sm => stationIds.add(sm.station_id));
		memberAssignments.forEach(a => {
			const shift = stationShifts.find(s => s.id === a.station_shift_id);
			if (shift) stationIds.add(shift.station_id);
		});

		if (stationIds.size === 0) {
			text += '\nKeine Zuweisungen.\n';
		} else {
			for (const stationId of stationIds) {
				const station = stations.find(s => s.id === stationId);
				text += `\n--- ${station?.name || 'Station'} ---\n`;

				// Show if assigned at station level
				if (memberStations.some(sm => sm.station_id === stationId)) {
					text += `  Stationsmitglied\n`;
				}

				// Show shift assignments
				const stationShiftAssignments = memberAssignments.filter(a => {
					const shift = stationShifts.find(s => s.id === a.station_shift_id);
					return shift && shift.station_id === stationId;
				});
				for (const a of stationShiftAssignments) {
					const shift = stationShifts.find(s => s.id === a.station_shift_id);
					if (shift) {
						text += `  ${shift.name} (${formatShiftTime(shift)})\n`;
					}
				}
			}

			const totalAssignments = memberStations.length + memberAssignments.length;
			text += `\nGesamt: ${totalAssignments} ${totalAssignments === 1 ? 'Zuweisung' : 'Zuweisungen'}`;
		}

		return text.trim();
	}

	const previewText = useMemo(() => {
		if (mode === 'full') return generateFullPlanText();
		if (mode === 'member' && selectedMemberId !== '__none__') return generateMemberPlanText(selectedMemberId);
		return '';
	}, [mode, selectedMemberId, stations, stationShifts, assignments, stationMembers, members, festivalName, festivalDate]);

	const handleCopy = async () => {
		if (!previewText) return;
		try {
			await navigator.clipboard.writeText(previewText);
			toast({ title: 'Text kopiert!' });
		} catch {
			toast({ title: 'Fehler', description: 'Text konnte nicht kopiert werden.', variant: 'destructive' });
		}
	};

	const handleWhatsAppText = () => {
		if (!previewText) return;
		window.open(`https://wa.me/?text=${encodeURIComponent(previewText)}`, '_blank');
	};

	const handleShareFile = (type: 'pdf' | 'excel') => {
		if (type === 'pdf') onExportPdf();
		else onExportExcel();
		toast({
			title: `${type === 'pdf' ? 'PDF' : 'Excel'} erstellt`,
			description: 'Datei heruntergeladen. Teile sie via WhatsApp aus deinem Download-Ordner.',
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Share2 className="h-5 w-5" />
						Schichtplan teilen
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Mode toggle */}
					<div className="flex gap-2">
						<Button
							variant={mode === 'full' ? 'default' : 'outline'}
							size="sm"
							className="flex-1"
							onClick={() => setMode('full')}
						>
							Gesamter Plan
						</Button>
						<Button
							variant={mode === 'member' ? 'default' : 'outline'}
							size="sm"
							className="flex-1"
							onClick={() => setMode('member')}
						>
							Pro Mitglied
						</Button>
					</div>

					{mode === 'member' && (
						<Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
							<SelectTrigger>
								<SelectValue placeholder="Mitglied auswählen" />
							</SelectTrigger>
							<SelectContent>
								{sortedMembers.map(member => (
									<SelectItem key={member.id} value={member.id}>
										{member.last_name} {member.first_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{previewText && (
						<div className="whitespace-pre-wrap font-mono text-xs bg-muted rounded-lg p-3 max-h-40 overflow-y-auto border">
							{previewText}
						</div>
					)}

					{/* Text share buttons */}
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopy}
							disabled={!previewText}
							className="flex-1 gap-1.5"
						>
							<Copy className="h-4 w-4" />
							{isMobile ? 'Kopieren' : 'Text kopieren'}
						</Button>
						<Button
							size="sm"
							onClick={handleWhatsAppText}
							disabled={!previewText}
							className="flex-1 gap-1.5 bg-[#25D366] hover:bg-[#1da851] text-white"
						>
							<MessageCircle className="h-4 w-4" />
							WhatsApp
						</Button>
					</div>

					<Separator />

					{/* File export + share */}
					<div>
						<p className="text-xs text-muted-foreground mb-2">Datei herunterladen & teilen:</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleShareFile('pdf')}
								className="flex-1 gap-1.5"
							>
								<FileText className="h-4 w-4" />
								PDF
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleShareFile('excel')}
								className="flex-1 gap-1.5"
							>
								<FileSpreadsheet className="h-4 w-4" />
								Excel
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ShareDialog;
