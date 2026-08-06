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
import type { Station, StationShift, ShiftAssignmentWithHelper, StationHelperWithDetails } from '@/lib/shiftService';
import type { Helper } from '@/lib/helperService';

interface ShareDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalName: string;
	festivalDate: string;
	stations: Station[];
	stationShifts: StationShift[];
	assignments: ShiftAssignmentWithHelper[];
	stationHelpers: StationHelperWithDetails[];
	helpers: Helper[];
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

function resolveHelperName(helperId: string | undefined, helpers: Helper[], assignment?: ShiftAssignmentWithHelper): string {
	// Try populated relation on assignment
	if (assignment?.helper?.last_name) {
		return `${assignment.helper.last_name} ${assignment.helper.first_name}`;
	}
	// Fallback: lookup by ID
	const id = helperId || assignment?.helper_id;
	if (id) {
		const h = helpers.find(candidate => candidate.id === id);
		if (h) return `${h.last_name} ${h.first_name}`;
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
	stationHelpers,
	helpers,
	onExportPdf,
	onExportExcel
}) => {
	const { toast } = useToast();
	const isMobile = useIsMobile();
	const [mode, setMode] = useState<'full' | 'helper'>('full');
	const [selectedHelperId, setSelectedHelperId] = useState<string>('__none__');

	const sortedHelpers = useMemo(
		() => [...helpers].sort((a, b) => a.last_name.localeCompare(b.last_name)),
		[helpers]
	);

	function generateFullPlanText(): string {
		let text = `SCHICHTPLAN\n${festivalName}\n${festivalDate}\n`;

		for (const station of stations) {
			text += `\n--- ${station.name} ---\n`;

			// Stations-Helfer (ohne bestimmte Schicht)
			const stHelpers = stationHelpers.filter(sm => sm.station_id === station.id);
			if (stHelpers.length > 0) {
				const names = stHelpers
					.map(sm => {
						if (sm.helper) return `${sm.helper.last_name} ${sm.helper.first_name}`;
						return resolveHelperName(sm.helper_id, helpers);
					})
					.filter(Boolean);
				if (names.length > 0) {
					text += `Helfer:\n`;
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
				const names = shiftAssignments.map(a => resolveHelperName(undefined, helpers, a)).filter(Boolean);
				text += `${shift.name} (${time})\n`;
				if (names.length > 0) {
					for (const name of names) {
						text += `  - ${name}\n`;
					}
				} else {
					text += `  (nicht besetzt)\n`;
				}
			}

			// Station ohne Schichten und ohne Helfer
			if (stShifts.length === 0 && stHelpers.length === 0) {
				text += `  (keine Zuweisungen)\n`;
			}
		}
		return text.trim();
	}

	function generateHelperPlanText(helperId: string): string {
		const helper = helpers.find(h => h.id === helperId);
		if (!helper) return '';

		const name = `${helper.last_name} ${helper.first_name}`;
		let text = `EINSATZPLAN\n${name}\n${festivalName} | ${festivalDate}\n`;

		// Station-level assignments
		const helperStations = stationHelpers.filter(sm => sm.helper_id === helperId);
		// Shift assignments
		const helperAssignments = assignments.filter(a => a.helper_id === helperId);

		// Alle Stationen, in denen dieser Helfer steht
		const stationIds = new Set<string>();
		helperStations.forEach(sm => stationIds.add(sm.station_id));
		helperAssignments.forEach(a => {
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
				if (helperStations.some(sm => sm.station_id === stationId)) {
					text += `  Stations-Helfer\n`;
				}

				// Show shift assignments
				const stationShiftAssignments = helperAssignments.filter(a => {
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

			const totalAssignments = helperStations.length + helperAssignments.length;
			text += `\nGesamt: ${totalAssignments} ${totalAssignments === 1 ? 'Zuweisung' : 'Zuweisungen'}`;
		}

		return text.trim();
	}

	const previewText = useMemo(() => {
		if (mode === 'full') return generateFullPlanText();
		if (mode === 'helper' && selectedHelperId !== '__none__') return generateHelperPlanText(selectedHelperId);
		return '';
	}, [mode, selectedHelperId, stations, stationShifts, assignments, stationHelpers, helpers, festivalName, festivalDate]);

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
							variant={mode === 'helper' ? 'default' : 'outline'}
							size="sm"
							className="flex-1"
							onClick={() => setMode('helper')}
						>
							Pro Helfer
						</Button>
					</div>

					{mode === 'helper' && (
						<Select value={selectedHelperId} onValueChange={setSelectedHelperId}>
							<SelectTrigger>
								<SelectValue placeholder="Helfer auswählen" />
							</SelectTrigger>
							<SelectContent>
								{sortedHelpers.map(helper => (
									<SelectItem key={helper.id} value={helper.id}>
										{helper.last_name} {helper.first_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{previewText && (
						<div className="whitespace-pre-wrap font-mono text-xs bg-muted p-3 max-h-40 overflow-y-auto border">
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
