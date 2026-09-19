import React, { useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { helperName } from '@/lib/shiftBoard';
import { fullPlanText, helperPlanText, type ShiftPlanTextData } from '@/lib/shiftPlanText';
import type {
	ShiftAssignmentWithHelper,
	Station,
	StationHelperWithDetails,
	StationShift
} from '@/lib/shiftService';
import type { Helper } from '@/lib/helperService';

import ShareZettel, { type ShareMode } from './ShareZettel';

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

/**
 * Der Radix-Rahmen um den Teilen-Zettel des Schichtplans (#109). Er hält Modus
 * und gewählte Person und schiebt den Text raus — die Handschrift liegt im
 * `ShareZettel`, der Wortlaut in `shiftPlanText`, die Papiere in
 * `exportService`.
 */
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
	const [mode, setMode] = useState<ShareMode>('full');
	const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null);

	const data: ShiftPlanTextData = useMemo(
		() => ({ festivalName, festivalDate, stations, stationShifts, assignments, stationHelpers }),
		[festivalName, festivalDate, stations, stationShifts, assignments, stationHelpers]
	);

	// Dieselbe Ordnung wie überall sonst: Nachname zuerst.
	const sortedHelpers = useMemo(
		() => [...helpers].sort((a, b) => helperName(a).localeCompare(helperName(b), 'de')),
		[helpers]
	);
	const selectedHelper = sortedHelpers.find((h) => h.id === selectedHelperId) ?? null;

	const previewText = useMemo(() => {
		if (mode === 'full') return fullPlanText(data);
		return selectedHelper ? helperPlanText(data, selectedHelper) : '';
	}, [mode, selectedHelper, data]);

	const handleCopy = async () => {
		if (!previewText) return;
		try {
			await navigator.clipboard.writeText(previewText);
			toast({ title: 'Text kopiert!' });
		} catch {
			toast({
				title: 'Fehler',
				description: 'Text konnte nicht kopiert werden.',
				variant: 'destructive'
			});
		}
	};

	const handleWhatsApp = () => {
		if (!previewText) return;
		window.open(`https://wa.me/?text=${encodeURIComponent(previewText)}`, '_blank');
	};

	const handleFile = (type: 'pdf' | 'excel') => {
		if (type === 'pdf') onExportPdf();
		else onExportExcel();
		toast({
			title: `${type === 'pdf' ? 'PDF' : 'Excel'} erstellt`,
			description: 'Datei heruntergeladen. Teile sie via WhatsApp aus deinem Download-Ordner.'
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Der Zettel bringt Rahmen, Papier und Versatz-Schatten mit — die Shell
			bleibt reine Positionierung (wie beim Material-Export #119). */}
			<DialogContent
				hideClose
				aria-describedby={undefined}
				className="max-w-[560px] border-0 bg-transparent p-0 shadow-none sm:p-0">
				<ShareZettel
					mode={mode}
					onModeChange={setMode}
					helpers={sortedHelpers}
					selectedHelperId={selectedHelperId}
					onSelectHelper={setSelectedHelperId}
					previewText={previewText}
					onCopy={() => void handleCopy()}
					onWhatsApp={handleWhatsApp}
					onPdf={() => handleFile('pdf')}
					onExcel={() => handleFile('excel')}
					onCancel={() => onOpenChange(false)}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default ShareDialog;
