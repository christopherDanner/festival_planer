import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { generateFestivalPlan, FestivalData } from '@/lib/festivalPlanGenerator';
import { AIInsight, AIStation, AIShift } from '@/lib/aiService';
import { createFestival } from '@/lib/festivalService';
import { getMembers } from '@/lib/memberService';
import {
	Users,
	Check,
	X,
	Edit,
	Lightbulb,
	Plus,
	Trash2,
	Brain,
	Info,
	AlertTriangle,
	Shield,
	Music,
	Heart,
	Wine,
	Snowflake,
	Crown,
	Sun,
	Sparkles
} from 'lucide-react';

interface FestivalPreviewProps {
	festivalData: FestivalData;
	onBack: () => void;
}

export default function FestivalPreview({ festivalData, onBack }: FestivalPreviewProps) {
	const [generatedPlan, setGeneratedPlan] = useState<unknown>(null);
	const [editableStations, setEditableStations] = useState<AIStation[]>([]);
	const [editableShifts, setEditableShifts] = useState<AIShift[]>([]);
	const [members, setMembers] = useState<unknown[]>([]);
	const [useAISuggestions, setUseAISuggestions] = useState(true);
	const [generateShiftPlan, setGenerateShiftPlan] = useState(false);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();

	const loadPreviewData = useCallback(async () => {
		try {
			// Load existing members
			const membersData = await getMembers();
			setMembers(membersData);

			// Generate preview plan with AI
			const plan = await generateFestivalPlan(festivalData, membersData);
			setGeneratedPlan(plan);
			setAiInsights(plan.aiInsights || []);

			// Set editable copies of AI-generated stations and shifts
			setEditableStations(plan.shiftStations || []);
			setEditableShifts(plan.aiShifts || []);

			// Auto-enable shift plan generation if members exist
			if (membersData.length > 0) {
				setGenerateShiftPlan(true);
			}
		} catch (error: unknown) {
			toast({
				title: 'Fehler beim Laden der Vorschau',
				description:
					error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	}, [toast, festivalData]);

	useEffect(() => {
		if (!user) {
			navigate('/auth');
			return;
		}
		loadPreviewData();
	}, [user, navigate, loadPreviewData]);

	const handleCreateFestival = async () => {
		if (!user) return;

		// Validate that all stations have names
		const emptyStations = editableStations.filter(
			(station) => !station.name || station.name.trim() === ''
		);
		if (emptyStations.length > 0) {
			toast({
				title: 'Fehler beim Speichern',
				description: 'Alle Stationen müssen einen Namen haben. Bitte füllen Sie alle Felder aus.',
				variant: 'destructive'
			});
			return;
		}

		setCreating(true);
		try {
			// Create festival with edited data
			const updatedData: FestivalData = {
				...festivalData,
				customStations: useAISuggestions
					? editableStations
							.filter((station) => station.name && station.name.trim() !== '') // Filter out empty stations
							.map((station, index) => ({
								id: index + 1,
								bereich: station.name.trim(),
								zeit: 'TBD',
								personen: [],
								bedarf: station.required_people || 1,
								status: 'incomplete' as const,
								priority: 'green' as const
							}))
					: undefined,
				customShifts: useAISuggestions ? editableShifts : undefined
			};

			const festivalId = await createFestival(updatedData, user.id);

			toast({
				title: 'Fest erfolgreich erstellt!',
				description: 'Ihr Festplan wurde generiert.'
			});

			navigate(`/festival-results?id=${festivalId}`);
		} catch (error: unknown) {
			toast({
				title: 'Fehler beim Erstellen des Festes',
				description:
					error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
		} finally {
			setCreating(false);
		}
	};

	const addStation = () => {
		const newStation: AIStation = {
			name: 'Neue Station',
			description: '',
			required_people: 1,
			aiReason: 'Manuell hinzugefügte Station'
		};
		setEditableStations([...editableStations, newStation]);
	};

	const updateStation = (index: number, field: string, value: unknown) => {
		const updated = [...editableStations];
		// Ensure name is never empty
		if (field === 'name' && (!value || (value as string).trim() === '')) {
			updated[index] = { ...updated[index], [field]: 'Neue Station' } as AIStation;
		} else {
			updated[index] = { ...updated[index], [field]: value } as AIStation;
		}
		setEditableStations(updated);
	};

	const removeStation = (index: number) => {
		const updated = editableStations.filter((_, i) => i !== index);
		setEditableStations(updated);
	};

	const addShift = () => {
		const newShift: AIShift = {
			name: 'Neue Schicht',
			start_time: '09:00',
			end_time: '12:00',
			start_date: festivalData.startDate
		};
		setEditableShifts([...editableShifts, newShift]);
	};

	const updateShift = (index: number, field: string, value: unknown) => {
		const updated = [...editableShifts];
		updated[index] = { ...updated[index], [field]: value } as AIShift;
		setEditableShifts(updated);
	};

	const removeShift = (index: number) => {
		const updated = editableShifts.filter((_, i) => i !== index);
		setEditableShifts(updated);
	};

	const handleCreateEmpty = async () => {
		if (!user) return;

		setCreating(true);
		try {
			// Create festival with empty plan
			const emptyData = { ...festivalData, type: undefined };
			const festivalId = await createFestival(emptyData, user.id);

			toast({
				title: 'Leeres Fest erstellt!',
				description: 'Sie können nun alle Daten manuell hinzufügen.'
			});

			navigate(`/festival-results?id=${festivalId}`);
		} catch (error: unknown) {
			toast({
				title: 'Fehler beim Erstellen des Festes',
				description:
					error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
		} finally {
			setCreating(false);
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'red':
				return 'destructive';
			case 'yellow':
				return 'default';
			case 'green':
				return 'secondary';
			default:
				return 'outline';
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
				<div className="flex items-center gap-3">
					<Lightbulb className="h-6 w-6 animate-pulse text-primary" />
					<p>Generiere Vorschläge mit KI...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold mb-2">Festplan-Vorschau</h1>
						<p className="text-muted-foreground">
							{festivalData.name} | {new Date(festivalData.startDate).toLocaleDateString('de-AT')}
							{festivalData.endDate &&
								festivalData.endDate !== festivalData.startDate &&
								` bis ${new Date(festivalData.endDate).toLocaleDateString('de-AT')}`}
						</p>
					</div>
					<Button variant="outline" onClick={onBack}>
						Zurück bearbeiten
					</Button>
				</div>

				{/* AI Insights */}
				{aiInsights.length > 0 && (
					<Card className="mb-6 border-primary/20 bg-primary/5">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-primary">
								<Brain className="h-5 w-5" />
								Mistral AI-Analyse Ihres Festes
							</CardTitle>
							<CardDescription>
								Unsere Mistral AI hat Ihr Fest analysiert und intelligente, spezifische Vorschläge
								erstellt
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{aiInsights.map((insight, index) => (
									<Alert
										key={index}
										className={
											insight.type === 'warning'
												? 'border-orange-200 bg-orange-50'
												: 'border-blue-200 bg-blue-50'
										}>
										<div className="flex items-start gap-3">
											{insight.icon === 'Users' && (
												<Users className="h-4 w-4 mt-0.5 text-orange-600" />
											)}
											{insight.icon === 'Shield' && (
												<Shield className="h-4 w-4 mt-0.5 text-blue-600" />
											)}
											{insight.icon === 'Music' && (
												<Music className="h-4 w-4 mt-0.5 text-blue-600" />
											)}
											{insight.icon === 'Heart' && (
												<Heart className="h-4 w-4 mt-0.5 text-blue-600" />
											)}
											{insight.icon === 'Wine' && <Wine className="h-4 w-4 mt-0.5 text-blue-600" />}
											{insight.icon === 'Snowflake' && (
												<Snowflake className="h-4 w-4 mt-0.5 text-blue-600" />
											)}
											{insight.icon === 'Crown' && (
												<Crown className="h-4 w-4 mt-0.5 text-blue-600" />
											)}
											{insight.icon === 'Sun' && <Sun className="h-4 w-4 mt-0.5 text-orange-600" />}
											<div>
												<div className="font-medium text-sm">{insight.title}</div>
												<AlertDescription className="text-sm mt-1">
													{insight.message}
												</AlertDescription>
											</div>
										</div>
									</Alert>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Settings Card */}
				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Sparkles className="h-5 w-5" />
							KI-Vorschläge & Einstellungen
						</CardTitle>
						<CardDescription>Entscheiden Sie, wie Ihr Fest erstellt werden soll</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="ai-suggestions">Mistral AI-Vorschläge verwenden</Label>
								<p className="text-sm text-muted-foreground">
									Unsere Mistral AI analysiert Ihren Festnamen und -typ, um passende Stationen und
									Schichten vorzuschlagen
								</p>
							</div>
							<Switch
								id="ai-suggestions"
								checked={useAISuggestions}
								onCheckedChange={setUseAISuggestions}
							/>
						</div>

						<Separator />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="shift-plan">Schichtplan automatisch befüllen</Label>
								<p className="text-sm text-muted-foreground">
									{members.length > 0
										? `${members.length} Mitglieder gefunden - automatisch einteilen?`
										: 'Keine Mitglieder vorhanden - Schichtplan bleibt leer'}
								</p>
							</div>
							<Switch
								id="shift-plan"
								checked={generateShiftPlan}
								onCheckedChange={setGenerateShiftPlan}
								disabled={members.length === 0}
							/>
						</div>

						<div className="flex gap-3 pt-4">
							<Button
								onClick={handleCreateFestival}
								disabled={creating}
								className="flex items-center gap-2 bg-primary hover:bg-primary/90">
								<Brain className="h-4 w-4" />
								{creating ? 'Erstelle...' : 'Mit Mistral AI-Vorschlägen erstellen'}
							</Button>
							<Button
								variant="outline"
								onClick={handleCreateEmpty}
								disabled={creating}
								className="flex items-center gap-2">
								<X className="h-4 w-4" />
								Leer starten
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Preview Tabs */}
				{useAISuggestions && (
					<Tabs defaultValue="stationen" className="space-y-6">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="stationen">Stationen ({editableStations.length})</TabsTrigger>
							<TabsTrigger value="schichten">Schichten ({editableShifts.length})</TabsTrigger>
						</TabsList>

						<TabsContent value="stationen">
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="flex items-center gap-2">
												<Brain className="h-5 w-5 text-primary" />
												Mistral AI-generierte Stationen
											</CardTitle>
											<CardDescription>
												Unsere Mistral AI hat {editableStations.length} passende Stationen für Ihr
												Fest vorgeschlagen. Bearbeiten Sie diese oder fügen Sie neue hinzu.
											</CardDescription>
										</div>
										<Button onClick={addStation} size="sm" className="flex items-center gap-2">
											<Plus className="h-4 w-4" />
											Neue Station
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{editableStations.map((station, index) => (
											<Card key={index} className="p-4">
												<div className="space-y-3">
													<div className="flex items-center justify-between">
														<Input
															value={station.name}
															onChange={(e) => updateStation(index, 'name', e.target.value)}
															placeholder="Stationsname"
															className="font-medium"
														/>
														<Button
															onClick={() => removeStation(index)}
															size="sm"
															variant="destructive"
															className="ml-2">
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
													<Textarea
														value={station.description || ''}
														onChange={(e) => updateStation(index, 'description', e.target.value)}
														placeholder="Beschreibung (optional)"
														className="text-sm"
													/>
													{station.aiReason && (
														<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
															<div className="flex items-start gap-2">
																<Brain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
																<div>
																	<div className="text-sm font-medium text-blue-900">
																		KI-Empfehlung:
																	</div>
																	<div className="text-sm text-blue-700 mt-1">
																		{station.aiReason}
																	</div>
																</div>
															</div>
														</div>
													)}
													<div className="flex items-center gap-2">
														<Label htmlFor={`people-${index}`} className="text-sm">
															Benötigte Personen:
														</Label>
														<Input
															id={`people-${index}`}
															type="number"
															min="1"
															value={station.required_people}
															onChange={(e) =>
																updateStation(
																	index,
																	'required_people',
																	parseInt(e.target.value) || 1
																)
															}
															className="w-20"
														/>
													</div>
												</div>
											</Card>
										))}
										{editableStations.length === 0 && (
											<p className="text-center text-muted-foreground py-8">
												Noch keine Stationen vorhanden. Fügen Sie eine neue Station hinzu.
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="schichten">
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="flex items-center gap-2">
												<Brain className="h-5 w-5 text-primary" />
												Mistral AI-generierte Schichten
											</CardTitle>
											<CardDescription>
												Unsere Mistral AI hat {editableShifts.length} passende Schichten basierend
												auf Ihrem Festdatum erstellt. Bearbeiten Sie diese oder fügen Sie neue
												hinzu.
											</CardDescription>
										</div>
										<Button onClick={addShift} size="sm" className="flex items-center gap-2">
											<Plus className="h-4 w-4" />
											Neue Schicht
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{editableShifts.map((shift, index) => (
											<Card key={index} className="p-4">
												<div className="space-y-3">
													<div className="flex items-center justify-between">
														<Input
															value={shift.name}
															onChange={(e) => updateShift(index, 'name', e.target.value)}
															placeholder="Schichtname"
															className="font-medium"
														/>
														<Button
															onClick={() => removeShift(index)}
															size="sm"
															variant="destructive"
															className="ml-2">
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
													<div className="grid grid-cols-3 gap-3">
														<div>
															<Label htmlFor={`date-${index}`} className="text-sm">
																Datum
															</Label>
															<Input
																id={`date-${index}`}
																type="date"
																value={shift.start_date || festivalData.startDate}
																onChange={(e) => updateShift(index, 'start_date', e.target.value)}
															/>
														</div>
														<div>
															<Label htmlFor={`start-${index}`} className="text-sm">
																Von
															</Label>
															<Input
																id={`start-${index}`}
																type="time"
																value={shift.start_time}
																onChange={(e) => updateShift(index, 'start_time', e.target.value)}
															/>
														</div>
														<div>
															<Label htmlFor={`end-${index}`} className="text-sm">
																Bis
															</Label>
															<Input
																id={`end-${index}`}
																type="time"
																value={shift.end_time}
																onChange={(e) => updateShift(index, 'end_time', e.target.value)}
															/>
														</div>
													</div>
												</div>
											</Card>
										))}
										{editableShifts.length === 0 && (
											<p className="text-center text-muted-foreground py-8">
												Noch keine Schichten vorhanden. Fügen Sie eine neue Schicht hinzu.
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				)}
			</div>
		</div>
	);
}
