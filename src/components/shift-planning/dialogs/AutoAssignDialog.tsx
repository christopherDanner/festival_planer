import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AutoAssignmentConfig } from '@/lib/automaticAssignmentService';

interface AutoAssignDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAssign: (config: AutoAssignmentConfig) => void;
	onClear: () => void;
	isLoading: boolean;
}

const AutoAssignDialog: React.FC<AutoAssignDialogProps> = ({
	open,
	onOpenChange,
	onAssign,
	onClear,
	isLoading
}) => {
	const [config, setConfig] = useState<AutoAssignmentConfig>({
		minShiftsPerMember: 1,
		maxShiftsPerMember: 3,
		respectPreferences: true
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Automatische Schichtzuteilung</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="min-shifts">Min. Schichten pro Person</Label>
							<Input
								id="min-shifts"
								type="number"
								min="0"
								value={config.minShiftsPerMember}
								onChange={(e) =>
									setConfig((prev) => ({
										...prev,
										minShiftsPerMember: parseInt(e.target.value) || 0
									}))
								}
							/>
						</div>
						<div>
							<Label htmlFor="max-shifts">Max. Schichten pro Person</Label>
							<Input
								id="max-shifts"
								type="number"
								min="1"
								value={config.maxShiftsPerMember}
								onChange={(e) =>
									setConfig((prev) => ({
										...prev,
										maxShiftsPerMember: parseInt(e.target.value) || 1
									}))
								}
							/>
						</div>
					</div>
					<div className="bg-muted p-4 rounded-lg">
						<p className="text-sm text-muted-foreground">
							Die automatische Zuteilung berücksichtigt nur Stationen, die den jeweiligen
							Schichten zugewiesen wurden. Mitglieder mit Stationswünschen werden bevorzugt
							zugewiesen, solange Schichten in ihren Wunschstationen frei sind. Die Schichten
							werden gleichmäßig verteilt.
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="destructive" onClick={onClear}>
							Alle Zuweisungen löschen
						</Button>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Abbrechen
						</Button>
						<Button
							onClick={() => {
								onAssign(config);
								onOpenChange(false);
							}}
							disabled={isLoading}>
							{isLoading ? 'Zuteilen...' : 'Automatisch zuteilen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default AutoAssignDialog;
