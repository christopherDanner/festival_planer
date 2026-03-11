import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Clock, Users, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Station, StationShift } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

interface PreferenceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	member: Member | null;
	stations: Station[];
	stationShifts: StationShift[];
	stationPreferences: Record<string, string[]>;
	shiftPreferences: Record<string, string[]>;
	onSave: (memberId: string, stationPrefs: string[], shiftPrefs: string[]) => void;
}

const PreferenceDialog: React.FC<PreferenceDialogProps> = ({
	open,
	onOpenChange,
	member,
	stations,
	stationShifts,
	stationPreferences,
	shiftPreferences,
	onSave
}) => {
	const [tempStationPrefs, setTempStationPrefs] = useState<string[]>([]);
	const [tempShiftPrefs, setTempShiftPrefs] = useState<string[]>([]);

	useEffect(() => {
		if (member && open) {
			setTempStationPrefs(stationPreferences[member.id] || []);
			setTempShiftPrefs(shiftPreferences[member.id] || []);
		}
	}, [member, open, stationPreferences, shiftPreferences]);

	const handleToggleStation = (stationId: string) => {
		const isSelected = tempStationPrefs.includes(stationId);
		if (isSelected) {
			setTempStationPrefs((prev) => prev.filter((id) => id !== stationId));
			// Remove all shifts from this station
			const shiftIds = stationShifts
				.filter((s) => s.station_id === stationId)
				.map((s) => s.id);
			setTempShiftPrefs((prev) => prev.filter((id) => !shiftIds.includes(id)));
		} else {
			setTempStationPrefs((prev) => [...prev, stationId]);
		}
	};

	const handleToggleShift = (shiftId: string) => {
		const isSelected = tempShiftPrefs.includes(shiftId);
		const shift = stationShifts.find((s) => s.id === shiftId);
		if (isSelected) {
			setTempShiftPrefs((prev) => prev.filter((id) => id !== shiftId));
		} else {
			setTempShiftPrefs((prev) => [...prev, shiftId]);
			// Auto-add station preference
			if (shift && !tempStationPrefs.includes(shift.station_id)) {
				setTempStationPrefs((prev) => [...prev, shift.station_id]);
			}
		}
	};

	const handleSave = () => {
		if (!member) return;
		onSave(member.id, tempStationPrefs, tempShiftPrefs);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle className="flex items-center gap-2">
						<Heart className="h-5 w-5 text-red-500" />
						Präferenzen für {member?.last_name} {member?.first_name}
					</DialogTitle>
				</DialogHeader>
				<div className="flex-1 overflow-y-auto space-y-6 pr-2">
					{/* Station Preferences */}
					<div>
						<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
							<MapPin className="h-4 w-4 text-green-600" />
							Stationswünsche
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Wählen Sie die Stationen aus, bei denen {member?.first_name} gerne arbeiten möchte.
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{stations.map((station) => {
								const isSelected = tempStationPrefs.includes(station.id);
								return (
									<div
										key={station.id}
										className={cn(
											'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
											isSelected
												? 'bg-green-50 border-green-200'
												: 'hover:bg-muted border-border'
										)}
										onClick={() => handleToggleStation(station.id)}>
										<input
											type="checkbox"
											checked={isSelected}
											onChange={() => handleToggleStation(station.id)}
											className="rounded"
										/>
										<div className="flex-1">
											<div className="font-medium">{station.name}</div>
											{station.description && (
												<div className="text-sm text-muted-foreground">{station.description}</div>
											)}
										</div>
										<Badge variant="outline">
											<Users className="h-3 w-3 mr-1" />
											{station.required_people}
										</Badge>
									</div>
								);
							})}
						</div>
					</div>

					{/* Shift Preferences */}
					<div>
						<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
							<Clock className="h-4 w-4 text-blue-600" />
							Schichtwünsche (optional)
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Wählen Sie spezifische Schichten aus, in denen {member?.first_name} arbeiten möchte.
							Die Schichten sind nach Stationen gruppiert.
						</p>
						<div className="space-y-6">
							{stations.map((station) => {
								const shiftsForStation = stationShifts.filter(
									(s) => s.station_id === station.id
								);
								if (shiftsForStation.length === 0) return null;
								return (
									<div key={station.id} className="border rounded-lg p-4">
										<div className="flex items-center gap-2 mb-4">
											<MapPin className="h-5 w-5 text-green-600" />
											<h4 className="text-lg font-semibold">{station.name}</h4>
											<Badge variant="outline">
												<Users className="h-3 w-3 mr-1" />
												{station.required_people} Personen
											</Badge>
											{tempStationPrefs.includes(station.id) && (
												<Badge variant="default" className="bg-green-100 text-green-800">
													<Heart className="h-3 w-3 mr-1 fill-current" />
													Station gewünscht
												</Badge>
											)}
										</div>
										{station.description && (
											<p className="text-sm text-muted-foreground mb-4">{station.description}</p>
										)}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											{shiftsForStation.map((shift) => {
												const isSelected = tempShiftPrefs.includes(shift.id);
												return (
													<div
														key={shift.id}
														className={cn(
															'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
															isSelected
																? 'bg-blue-50 border-blue-200'
																: 'hover:bg-muted border-border'
														)}
														onClick={() => handleToggleShift(shift.id)}>
														<input
															type="checkbox"
															checked={isSelected}
															onChange={() => handleToggleShift(shift.id)}
															className="rounded"
														/>
														<div className="flex-1">
															<div className="font-medium">{shift.name}</div>
															<div className="text-sm text-muted-foreground">
																{new Date(shift.start_date).toLocaleDateString('de-DE')}{' '}
																{shift.start_time} - {shift.end_time}
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-4">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Abbrechen
						</Button>
						<Button onClick={handleSave}>
							<Save className="h-4 w-4 mr-2" />
							Speichern
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default PreferenceDialog;
