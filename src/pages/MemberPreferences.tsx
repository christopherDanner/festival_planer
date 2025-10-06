import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
	validateMagicLink,
	getMemberInfoForMagicLink,
	getAvailableStations,
	getAvailableShifts,
	saveMemberPreferences,
	markMagicLinkAsUsed,
	getMagicLinkIdByToken,
	type PreferenceFormData
} from '@/lib/magicLinkService';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, Heart } from 'lucide-react';

interface Station {
	id: string;
	name: string;
	description?: string;
	required_people: number;
}

interface Shift {
	id: string;
	name: string;
	start_date: string;
	start_time: string;
	end_date?: string;
	end_time: string;
	stations: {
		id: string;
		name: string;
	};
}

interface MemberInfo {
	members: {
		id: string;
		first_name: string;
		last_name: string;
		email: string;
		phone?: string;
	};
	festivals: {
		id: string;
		name: string;
		start_date: string;
		end_date: string;
	};
}

const MemberPreferences: React.FC = () => {
	const { token } = useParams<{ token: string }>();
	const { toast } = useToast();

	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
	const [stations, setStations] = useState<Station[]>([]);
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [error, setError] = useState<string | null>(null);

	const [preferences, setPreferences] = useState<PreferenceFormData>({
		station_preferences: [],
		shift_preferences: [],
		min_shifts: 0,
		max_shifts: 3,
		availability_notes: ''
	});

	useEffect(() => {
		if (!token) {
			setError('Kein gültiger Link gefunden');
			setLoading(false);
			return;
		}

		loadData();
	}, [token]);

	const loadData = async () => {
		try {
			// Validate magic link
			const validation = await validateMagicLink(token!);
			if (!validation.valid) {
				setError(validation.error || 'Ungültiger oder abgelaufener Link');
				setLoading(false);
				return;
			}

			// Get member and festival info
			const info = await getMemberInfoForMagicLink(token!);
			setMemberInfo({
				members: info.members as any,
				festivals: info.festivals as any
			});

			// Load available stations and shifts
			const [stationsData, shiftsData] = await Promise.all([
				getAvailableStations((info.festivals as any).id),
				getAvailableShifts((info.festivals as any).id)
			]);

			setStations(stationsData as any);
			setShifts(shiftsData as any);
		} catch (error) {
			console.error('Error loading data:', error);
			setError('Fehler beim Laden der Daten');
		} finally {
			setLoading(false);
		}
	};

	const handleStationToggle = (stationId: string) => {
		setPreferences((prev) => {
			const isSelected = prev.station_preferences.includes(stationId);

			if (isSelected) {
				// Remove station and all its shifts
				const stationShifts = shifts.filter((shift) => shift.stations.id === stationId);
				const shiftIds = stationShifts.map((shift) => shift.id);

				return {
					...prev,
					station_preferences: prev.station_preferences.filter((id) => id !== stationId),
					shift_preferences: prev.shift_preferences.filter((id) => !shiftIds.includes(id))
				};
			} else {
				// Add station
				return {
					...prev,
					station_preferences: [...prev.station_preferences, stationId]
				};
			}
		});
	};

	const handleShiftToggle = (shiftId: string) => {
		setPreferences((prev) => {
			const isSelected = prev.shift_preferences.includes(shiftId);
			const shift = shifts.find((s) => s.id === shiftId);
			const stationId = shift?.stations.id;

			if (isSelected) {
				// Remove shift
				return {
					...prev,
					shift_preferences: prev.shift_preferences.filter((id) => id !== shiftId)
				};
			} else {
				// Add shift and automatically add station preference
				const newStationPreferences =
					stationId && !prev.station_preferences.includes(stationId)
						? [...prev.station_preferences, stationId]
						: prev.station_preferences;

				return {
					...prev,
					station_preferences: newStationPreferences,
					shift_preferences: [...prev.shift_preferences, shiftId]
				};
			}
		});
	};

	const handleSubmit = async () => {
		if (!token || !memberInfo) return;

		// Validation
		if (
			preferences.station_preferences.length === 0 &&
			preferences.shift_preferences.length === 0
		) {
			toast({
				title: 'Fehler',
				description: 'Bitte wählen Sie mindestens eine Station oder Schicht aus.',
				variant: 'destructive'
			});
			return;
		}

		setSubmitting(true);

		try {
			// Get magic link ID
			const magicLinkId = await getMagicLinkIdByToken(token);

			// Save preferences
			await saveMemberPreferences(
				memberInfo.festivals.id,
				memberInfo.members.id,
				preferences,
				magicLinkId || undefined
			);

			// Mark magic link as used
			await markMagicLinkAsUsed(token);

			toast({
				title: 'Erfolg',
				description: 'Ihre Präferenzen wurden erfolgreich gespeichert. Vielen Dank!'
			});

			// Reset form
			setPreferences({
				station_preferences: [],
				shift_preferences: [],
				min_shifts: 0,
				max_shifts: 3,
				availability_notes: ''
			});
		} catch (error: any) {
			console.error('Error saving preferences:', error);
			toast({
				title: 'Fehler',
				description: error.message || 'Fehler beim Speichern der Präferenzen.',
				variant: 'destructive'
			});
		} finally {
			setSubmitting(false);
		}
	};

	const formatShiftTime = (shift: Shift) => {
		const startDate = new Date(`${shift.start_date}T${shift.start_time}`);
		const endDate = new Date(`${shift.end_date || shift.start_date}T${shift.end_time}`);

		return `${startDate.toLocaleDateString('de-DE')} ${startDate.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		})} - ${endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
	};

	// Group shifts by station
	const getShiftsByStation = () => {
		const grouped: { [stationId: string]: { station: Station; shifts: Shift[] } } = {};

		shifts.forEach((shift) => {
			const stationId = shift.stations.id;
			if (!grouped[stationId]) {
				grouped[stationId] = {
					station: stations.find((s) => s.id === stationId)!,
					shifts: []
				};
			}
			grouped[stationId].shifts.push(shift);
		});

		return Object.values(grouped);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-2 text-gray-600">Lade Daten...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!memberInfo) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>Keine Daten gefunden.</AlertDescription>
						</Alert>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-4xl mx-auto px-4">
				{/* Header */}
				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Calendar className="h-6 w-6 text-blue-600" />
							Schichtplan-Präferenzen
						</CardTitle>
						<div className="space-y-2">
							<p className="text-lg font-semibold">
								Hallo {memberInfo.members.first_name} {memberInfo.members.last_name}!
							</p>
							<p className="text-gray-600">
								Bitte geben Sie Ihre Präferenzen für das Festival "{memberInfo.festivals.name}" an.
							</p>
						</div>
					</CardHeader>
				</Card>

				{/* Stationswünsche */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-green-600" />
							Stationswünsche
						</CardTitle>
						<p className="text-sm text-gray-600">
							Wählen Sie die Stationen aus, bei denen Sie gerne arbeiten möchten. Sie können auch
							nur Stationen auswählen, ohne spezifische Schichten zu wählen.
						</p>
						<div className="flex items-center gap-4 text-sm text-gray-600">
							<span>Ausgewählt: {preferences.station_preferences.length} Stationen</span>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{stations.map((station) => (
								<div
									key={station.id}
									className={cn(
										'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
										preferences.station_preferences.includes(station.id)
											? 'bg-green-50 border-green-200'
											: 'hover:bg-gray-50 border-gray-200'
									)}
									onClick={() => handleStationToggle(station.id)}>
									<Checkbox
										checked={preferences.station_preferences.includes(station.id)}
										onChange={() => handleStationToggle(station.id)}
									/>
									<div className="flex-1">
										<div className="font-medium">{station.name}</div>
										{station.description && (
											<div className="text-sm text-gray-600">{station.description}</div>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Schichtwünsche nach Stationen gruppiert */}
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Clock className="h-5 w-5 text-blue-600" />
							Schichtwünsche (optional)
						</CardTitle>
						<p className="text-sm text-gray-600">
							Wählen Sie spezifische Schichten aus, in denen Sie arbeiten möchten. Die Schichten
							sind nach Stationen gruppiert.
						</p>
						<div className="flex items-center gap-4 text-sm text-gray-600">
							<span>Ausgewählt: {preferences.shift_preferences.length} Schichten</span>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							{getShiftsByStation().map(({ station, shifts }) => (
								<div key={station.id} className="border rounded-lg p-4">
									<div className="flex items-center gap-2 mb-4">
										<MapPin className="h-5 w-5 text-green-600" />
										<h3 className="text-lg font-semibold">{station.name}</h3>
										{preferences.station_preferences.includes(station.id) && (
											<Badge variant="default" className="bg-green-100 text-green-800">
												<Heart className="h-3 w-3 mr-1 fill-current" />
												Station gewünscht
											</Badge>
										)}
									</div>
									{station.description && (
										<p className="text-sm text-gray-600 mb-4">{station.description}</p>
									)}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{shifts.map((shift) => (
											<div
												key={shift.id}
												className={cn(
													'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
													preferences.shift_preferences.includes(shift.id)
														? 'bg-blue-50 border-blue-200'
														: 'hover:bg-gray-50 border-gray-200'
												)}
												onClick={() => handleShiftToggle(shift.id)}>
												<Checkbox
													checked={preferences.shift_preferences.includes(shift.id)}
													onChange={() => handleShiftToggle(shift.id)}
												/>
												<div className="flex-1">
													<div className="font-medium">{shift.name}</div>
													<div className="text-sm text-gray-600">{formatShiftTime(shift)}</div>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Submit Button */}
				<div className="mt-6 flex justify-center">
					<Button onClick={handleSubmit} disabled={submitting} size="lg" className="px-8">
						{submitting ? 'Speichere...' : 'Präferenzen speichern'}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default MemberPreferences;
