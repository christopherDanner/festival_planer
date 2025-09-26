import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import ShiftMatrix from '@/components/ShiftMatrix';
import { FestivalMemberManagement } from '@/components/FestivalMemberManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
	Festival,
	ChecklistItem,
	StationAssignment,
	Resource,
	getFestival,
	getFestivalChecklist,
	getFestivalStations,
	getFestivalResources,
	updateChecklistItem,
	updateStationAssignment,
	updateResource
} from '@/lib/festivalService';

export default function FestivalResults() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();

	const [festival, setFestival] = useState<Festival | null>(null);
	const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
	const [stations, setStations] = useState<StationAssignment[]>([]);
	const [resources, setResources] = useState<Resource[]>([]);
	const [loading, setLoading] = useState(true);

	const festivalId = searchParams.get('id');

	useEffect(() => {
		if (!user) {
			navigate('/auth');
			return;
		}

		if (!festivalId) {
			navigate('/dashboard');
			return;
		}

		loadFestivalData();
	}, [user, festivalId, navigate]);

	const loadFestivalData = async () => {
		if (!festivalId) return;

		try {
			const [festivalData, checklistData, stationsData, resourcesData] = await Promise.all([
				getFestival(festivalId),
				getFestivalChecklist(festivalId),
				getFestivalStations(festivalId),
				getFestivalResources(festivalId)
			]);

			if (!festivalData) {
				navigate('/dashboard');
				return;
			}

			setFestival(festivalData);
			setChecklist(checklistData);
			setStations(stationsData);
			setResources(resourcesData);
		} catch (error: any) {
			toast({
				title: 'Fehler beim Laden der Daten',
				description: error.message,
				variant: 'destructive'
			});
			navigate('/dashboard');
		} finally {
			setLoading(false);
		}
	};

	const handleChecklistToggle = async (itemId: string, completed: boolean) => {
		try {
			await updateChecklistItem(itemId, completed);
			setChecklist((prev) =>
				prev.map((item) => (item.id === itemId ? { ...item, completed } : item))
			);
		} catch (error: any) {
			toast({
				title: 'Fehler beim Aktualisieren',
				description: error.message,
				variant: 'destructive'
			});
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

	if (!user) {
		return null; // Redirect handled in useEffect
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
				<p>Lade Festdaten...</p>
			</div>
		);
	}

	if (!festival) {
		return null; // Redirect handled in loadFestivalData
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
			<Navigation />
			<div className="pt-16">
				<div className="container mx-auto px-4 py-8">
					<div className="flex justify-between items-center mb-8">
						<div>
							<h1 className="text-3xl font-bold mb-2">{festival.name}</h1>
							<p className="text-muted-foreground">
								{new Date(festival.start_date).toLocaleDateString('de-AT')}
								{festival.end_date &&
									festival.end_date !== festival.start_date &&
									` bis ${new Date(festival.end_date).toLocaleDateString('de-AT')}`}{' '}
								| Besucher: {getVisitorCountDisplay(festival.visitor_count)}
							</p>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => navigate('/dashboard')}>
								Zum Dashboard
							</Button>
						</div>
					</div>

					<Tabs defaultValue="schichtplan" className="space-y-6">
						<TabsList className="grid w-full grid-cols-1">
							{/* Temporarily hidden: Checkliste and Ressourcen features */}
							{/* <TabsTrigger value="mitglieder">Mitglieder</TabsTrigger> */}
							<TabsTrigger value="schichtplan">Schichtplan</TabsTrigger>
						</TabsList>

						{/* Checkliste feature temporarily hidden
						<TabsContent value="checkliste">
							<Card>
								<CardHeader>
									<CardTitle>Aufgaben-Checkliste</CardTitle>
									<CardDescription>Alle wichtigen Aufgaben für Ihr Fest</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{checklist.map((item) => (
											<div
												key={item.id}
												className="flex items-start space-x-3 p-4 border rounded-lg bg-card">
												<Checkbox
													id={`task-${item.id}`}
													checked={item.completed}
													onCheckedChange={(checked) =>
														handleChecklistToggle(item.id, checked as boolean)
													}
													className="mt-1"
												/>
												<div className="flex-1 space-y-1">
													<div className="flex items-center justify-between">
														<label
															htmlFor={`task-${item.id}`}
															className={`text-sm font-medium cursor-pointer ${
																item.completed ? 'line-through text-muted-foreground' : ''
															}`}>
															{item.task}
														</label>
														<Badge variant={getPriorityColor(item.priority)}>
															{item.priority === 'red'
																? 'Wichtig'
																: item.priority === 'yellow'
																? 'Mittel'
																: 'Niedrig'}
														</Badge>
													</div>
													<div className="flex items-center text-xs text-muted-foreground space-x-4">
														<span>
															Fällig: {new Date(item.due_date).toLocaleDateString('de-AT')}
														</span>
														<span>Kategorie: {item.category}</span>
													</div>
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</TabsContent>
						*/}

						{/* <TabsContent value="mitglieder">
							<FestivalMemberManagement festivalId={festivalId} />
						</TabsContent> */}

						<TabsContent value="schichtplan">
							<ShiftMatrix festivalId={festivalId} />
						</TabsContent>

						{/* Ressourcen feature temporarily hidden
						<TabsContent value="ressourcen">
							<Card>
								<CardHeader>
									<CardTitle>Ressourcen & Bestellungen</CardTitle>
									<CardDescription>
										Übersicht aller benötigten Materialien und Bestellungen
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{resources.map((resource) => (
											<Card key={resource.id}>
												<CardContent className="p-4">
													<div className="flex items-center justify-between mb-3">
														<h4 className="font-medium">{resource.item}</h4>
														<div className="flex items-center space-x-2">
															<Badge
																variant={
																	resource.status === 'bestellt' ? 'secondary' : 'destructive'
																}>
																{resource.status === 'bestellt' ? 'Bestellt' : 'Offen'}
															</Badge>
															<Badge variant={getPriorityColor(resource.priority)}>
																{resource.priority === 'red'
																	? 'Wichtig'
																	: resource.priority === 'yellow'
																	? 'Mittel'
																	: 'Niedrig'}
															</Badge>
														</div>
													</div>
													<div className="grid grid-cols-2 gap-4 text-sm">
														<div>
															<p className="font-medium">Menge:</p>
															<p className="text-muted-foreground">
																{resource.menge} {resource.einheit}
															</p>
														</div>
														<div>
															<p className="font-medium">Lieferant:</p>
															<p className="text-muted-foreground">{resource.lieferant}</p>
														</div>
														<div className="col-span-2">
															<p className="font-medium">Kosten:</p>
															<p className="text-muted-foreground">{resource.kosten}</p>
														</div>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</CardContent>
							</Card>
						</TabsContent>
						*/}
					</Tabs>
				</div>
			</div>
		</div>
	);
}

function getVisitorCountDisplay(count: string): string {
	const counts: { [key: string]: string } = {
		small: 'unter 100',
		medium: '100-300',
		large: '300-800',
		xlarge: 'über 800'
	};
	return counts[count] || count;
}
