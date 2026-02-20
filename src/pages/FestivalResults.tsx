import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import ShiftPlanningView from '@/components/shift-planning/ShiftPlanningView';
import MaterialListView from '@/components/material-list/MaterialListView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Festival, getFestival } from '@/lib/festivalService';

export default function FestivalResults() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { user } = useAuth();
	const { toast } = useToast();

	const [festival, setFestival] = useState<Festival | null>(null);
	const [loading, setLoading] = useState(true);

	// Get festivalId from URL params or location state
	const festivalId = searchParams.get('id') || location.state?.festivalId;

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
			const festivalData = await getFestival(festivalId);

			if (!festivalData) {
				navigate('/dashboard');
				return;
			}

			setFestival(festivalData);
		} catch (error: unknown) {
			toast({
				title: 'Fehler beim Laden der Daten',
				description:
					error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
			navigate('/dashboard');
		} finally {
			setLoading(false);
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
									` bis ${new Date(festival.end_date).toLocaleDateString('de-AT')}`}
							</p>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => navigate('/dashboard')}>
								Zum Dashboard
							</Button>
						</div>
					</div>

					<Tabs defaultValue="shifts" className="w-full">
						<TabsList>
							<TabsTrigger value="shifts" className="gap-2">
								<CalendarDays className="h-4 w-4" />
								Schichtplan
							</TabsTrigger>
							<TabsTrigger value="materials" className="gap-2">
								<Package className="h-4 w-4" />
								Materialliste
							</TabsTrigger>
						</TabsList>
						<TabsContent value="shifts" className="mt-4">
							<ShiftPlanningView
								festivalId={festivalId}
								festivalName={festival.name}
								festivalDate={
									new Date(festival.start_date).toLocaleDateString('de-AT') +
									(festival.end_date && festival.end_date !== festival.start_date
										? ` bis ${new Date(festival.end_date).toLocaleDateString('de-AT')}`
										: '')
								}
							/>
						</TabsContent>
						<TabsContent value="materials" className="mt-4">
							<MaterialListView festivalId={festivalId} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
