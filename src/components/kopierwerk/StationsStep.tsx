import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Station, StationShift } from '@/lib/shiftService';

export interface StationsStepProps {
	stations: Station[];
	shifts: StationShift[];
	selectedStationIds: ReadonlySet<string>;
	copyAssignments: boolean;
	onSelectionChange: (ids: Set<string>) => void;
	onCopyAssignmentsChange: (copyAssignments: boolean) => void;
	onBack: () => void;
	onNext: () => void;
}

/**
 * Schritt 2 „Stationen & Schichten" — Zwischenstand: die Auswahl der alten
 * Vorlagen-Maske, aus der #95 den Material-Teil herausgelöst hat. Die
 * Handschrift samt Schicht-Vorschau bringt #94; die Optik bleibt bis dahin
 * bewusst shadcn (Misch-Optik ist abgenommen, ADR 0003).
 *
 * Die Auswahl liegt bei der Route und nicht mehr hier: Schritt 3 braucht sie
 * für die Warnung „ohne Station", und ein Rücksprung darf sie nicht vergessen.
 */
export default function StationsStep({
	stations,
	shifts,
	selectedStationIds,
	copyAssignments,
	onSelectionChange,
	onCopyAssignmentsChange,
	onBack,
	onNext
}: StationsStepProps) {
	const shiftsPerStation = useMemo(() => {
		const perStation: Record<string, number> = {};
		for (const shift of shifts) {
			perStation[shift.station_id] = (perStation[shift.station_id] || 0) + 1;
		}
		return perStation;
	}, [shifts]);

	const allSelected = stations.length > 0 && selectedStationIds.size === stations.length;

	const toggleStation = (id: string) => {
		const next = new Set(selectedStationIds);
		if (!next.delete(id)) next.add(id);
		onSelectionChange(next);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-lg">Stationen</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{stations.length === 0 ? (
						<p className="text-sm text-muted-foreground">Keine Stationen vorhanden</p>
					) : (
						<>
							<div className="flex items-center gap-2">
								<Checkbox
									id="all-stations"
									checked={
										allSelected ? true : selectedStationIds.size === 0 ? false : 'indeterminate'
									}
									onCheckedChange={() =>
										onSelectionChange(allSelected ? new Set() : new Set(stations.map((s) => s.id)))
									}
								/>
								<Label htmlFor="all-stations" className="text-sm font-medium">
									Alle Stationen
								</Label>
							</div>
							<div className="max-h-[240px] divide-y overflow-y-auto border">
								{stations.map((station) => (
									<label
										key={station.id}
										className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/30">
										<Checkbox
											checked={selectedStationIds.has(station.id)}
											onCheckedChange={() => toggleStation(station.id)}
										/>
										<span className="flex-1 text-sm">{station.name}</span>
										<span className="text-xs text-muted-foreground">
											{station.required_people} Pers. · {shiftsPerStation[station.id] || 0} Schichten
										</span>
									</label>
								))}
							</div>
							<div className="flex items-center gap-2 pt-1">
								<Checkbox
									id="copy-assignments"
									checked={copyAssignments}
									onCheckedChange={(value) => onCopyAssignmentsChange(!!value)}
								/>
								<Label htmlFor="copy-assignments" className="text-sm">
									Zuweisungen übernehmen
								</Label>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<div className="flex gap-3">
				<Button variant="outline" onClick={onBack} className="flex-1">
					← Name &amp; Datum
				</Button>
				<Button onClick={onNext} className="flex-1">
					WEITER: MATERIAL →
				</Button>
			</div>
		</div>
	);
}
