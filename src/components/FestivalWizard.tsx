import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createFestival } from '@/lib/festivalService';
import { Calendar } from 'lucide-react';

interface FestivalWizardProps {
	onClose: () => void;
	onComplete: () => void;
}

export default function FestivalWizard({ onClose, onComplete }: FestivalWizardProps) {
	const [festivalName, setFestivalName] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();

	const handleBasicInfoSubmit = () => {
		if (festivalName && startDate) {
			handleComplete();
		}
	};

	const handleComplete = async () => {
		if (!user) {
			navigate('/auth');
			return;
		}

		if (festivalName && startDate) {
			setLoading(true);

			try {
				// Create festival directly with minimal data
				const festivalId = await createFestival({
					name: festivalName,
					location: '',
					startDate,
					endDate: endDate !== startDate ? endDate : undefined,
					type: 'kirtag', // Default type
					visitorCount: 'medium' // Default visitor count
				});

				toast({
					title: 'Fest erstellt',
					description:
						'Ihr Fest wurde erfolgreich erstellt. Sie können jetzt Schichten und Stationen hinzufügen.'
				});

				// Navigate directly to the shift plan with festival ID
				navigate('/scheduling', { state: { festivalId } });
			} catch (error) {
				toast({
					title: 'Fehler',
					description: 'Fest konnte nicht erstellt werden.',
					variant: 'destructive'
				});
			} finally {
				setLoading(false);
			}
		}
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
										placeholder="z.B. Sommerfest 2024"
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
							</div>

							<div className="flex gap-3">
								<Button variant="outline" onClick={onClose} className="flex-1">
									Abbrechen
								</Button>
								<Button
									onClick={handleBasicInfoSubmit}
									className="flex-1"
									disabled={!festivalName || !startDate || loading}>
									{loading ? 'Erstelle Fest...' : 'Fest erstellen'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
