import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createFestival, getUserFestivals } from '@/lib/festivalService';
import { getStations, getStationShifts } from '@/lib/shiftService';
import { getMaterials } from '@/lib/materialService';
import { copyFestivalData } from '@/lib/festivalCopyService';
import type { CopyFestivalOptions } from '@/lib/festivalCopyService';
import type { Festival } from '@/lib/festivalService';
import type { Station, StationShift } from '@/lib/shiftService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import TemplateSelectionStep from '@/components/festival-wizard/TemplateSelectionStep';
import { Calendar } from 'lucide-react';

interface FestivalWizardProps {
	onClose: () => void;
	onComplete: () => void;
}

export default function FestivalWizard({ onClose, onComplete }: FestivalWizardProps) {
	const [step, setStep] = useState(1);
	const [festivalName, setFestivalName] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [loading, setLoading] = useState(false);

	// Template state
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [templateId, setTemplateId] = useState<string>('');
	const [templateData, setTemplateData] = useState<{
		stations: Station[];
		shifts: StationShift[];
		materials: FestivalMaterialWithStation[];
	} | null>(null);
	const [loadingTemplate, setLoadingTemplate] = useState(false);

	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();

	// Load festivals for dropdown
	useEffect(() => {
		getUserFestivals().then(setFestivals).catch(() => {});
	}, []);

	// Load template data when template changes
	useEffect(() => {
		if (!templateId) {
			setTemplateData(null);
			return;
		}
		setLoadingTemplate(true);
		Promise.all([
			getStations(templateId),
			getStationShifts(templateId),
			getMaterials(templateId),
		]).then(([stations, shifts, materials]) => {
			setTemplateData({ stations, shifts, materials });
		}).catch(() => {
			toast({ title: 'Fehler beim Laden der Vorlagen-Daten', variant: 'destructive' });
			setTemplateId('');
		}).finally(() => setLoadingTemplate(false));
	}, [templateId, toast]);

	const selectedFestival = festivals.find(f => f.id === templateId);

	const handleStep1Submit = () => {
		if (!festivalName || !startDate) return;
		if (templateId && templateData) {
			setStep(2);
		} else {
			handleCreateFestival();
		}
	};

	const handleCreateFestival = async (copyOptions?: Omit<CopyFestivalOptions, 'sourceFestivalStartDate' | 'targetFestivalStartDate'>) => {
		if (!user || !festivalName || !startDate) return;
		setLoading(true);

		try {
			const festivalId = await createFestival({
				name: festivalName,
				location: '',
				startDate,
				endDate: endDate && endDate !== startDate ? endDate : undefined,
				visitorCount: 'medium',
			});

			if (copyOptions && templateId && selectedFestival) {
				await copyFestivalData(templateId, festivalId, {
					...copyOptions,
					sourceFestivalStartDate: selectedFestival.start_date,
					targetFestivalStartDate: startDate,
				});
			}

			toast({
				title: 'Fest erstellt',
				description: copyOptions
					? 'Fest wurde aus der Vorlage erstellt.'
					: 'Ihr Fest wurde erfolgreich erstellt.',
			});

			navigate('/festival-results', { state: { festivalId } });
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Fest konnte nicht erstellt werden.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const handleTemplateChange = (value: string) => {
		setTemplateId(value === 'none' ? '' : value);
		setStep(1);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-3xl font-bold">Neues Fest erstellen</h1>
					<Button variant="outline" onClick={onClose}>
						Abbrechen
					</Button>
				</div>

				<div className="max-w-lg mx-auto">
					{step === 1 && (
						<Card className="shadow-lg">
							<CardHeader className="text-center">
								<CardTitle className="text-2xl flex items-center justify-center gap-2">
									<Calendar className="h-6 w-6" />
									Neues Fest erstellen
								</CardTitle>
								<CardDescription>Geben Sie den Namen und das Datum Ihres Festes ein</CardDescription>
							</CardHeader>

							<CardContent className="space-y-6">
								<div className="space-y-4">
									<div>
										<Label htmlFor="festivalName">Name des Festes *</Label>
										<Input
											id="festivalName"
											type="text"
											placeholder="z.B. Sommerfest 2026"
											value={festivalName}
											onChange={(e) => setFestivalName(e.target.value)}
											className="mt-1"
										/>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<Label htmlFor="startDate">Startdatum *</Label>
											<Input
												id="startDate"
												type="date"
												value={startDate}
												onChange={(e) => setStartDate(e.target.value)}
												className="mt-1"
											/>
										</div>
										<div>
											<Label htmlFor="endDate">Enddatum (optional)</Label>
											<Input
												id="endDate"
												type="date"
												value={endDate}
												onChange={(e) => setEndDate(e.target.value)}
												className="mt-1"
											/>
										</div>
									</div>

									{/* Template dropdown */}
									{festivals.length > 0 && (
										<div>
											<Label>Bestehendes Fest als Vorlage (optional)</Label>
											<Select value={templateId || 'none'} onValueChange={handleTemplateChange}>
												<SelectTrigger className="mt-1">
													<SelectValue placeholder="Keine Vorlage" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">Keine Vorlage</SelectItem>
													{festivals.map(f => (
														<SelectItem key={f.id} value={f.id}>
															{f.name || 'Unbenanntes Fest'} ({new Date(f.start_date).toLocaleDateString('de-AT')})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>

								<div className="flex gap-3">
									<Button variant="outline" onClick={onClose} className="flex-1">
										Abbrechen
									</Button>
									<Button
										onClick={handleStep1Submit}
										className="flex-1"
										disabled={!festivalName || !startDate || loading || loadingTemplate}>
										{loadingTemplate
											? 'Lade Vorlage...'
											: templateId
												? 'Weiter'
												: loading
													? 'Erstelle Fest...'
													: 'Fest erstellen'}
									</Button>
								</div>
							</CardContent>
						</Card>
					)}

					{step === 2 && templateData && (
						<TemplateSelectionStep
							stations={templateData.stations}
							shifts={templateData.shifts}
							materials={templateData.materials}
							loading={loading}
							onBack={() => setStep(1)}
							onSubmit={(options) => handleCreateFestival(options)}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
