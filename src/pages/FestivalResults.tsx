import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import ShiftPlanningView from '@/components/shift-planning/ShiftPlanningView';
import MaterialListView from '@/components/material-list/MaterialListView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Package, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Festival, getFestival } from '@/lib/festivalService';

export default function FestivalResults() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { user } = useAuth();
	const { toast } = useToast();
	const isMobile = useIsMobile();

	const [festival, setFestival] = useState<Festival | null>(null);
	const [loading, setLoading] = useState(true);

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
		return null;
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
				<p>Lade Festdaten...</p>
			</div>
		);
	}

	if (!festival) {
		return null;
	}

	const dateString = new Date(festival.start_date).toLocaleDateString('de-AT') +
		(festival.end_date && festival.end_date !== festival.start_date
			? ` – ${new Date(festival.end_date).toLocaleDateString('de-AT')}`
			: '');

	return (
		<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
			<Navigation />
			<div className="pt-16">
				<Tabs defaultValue="shifts" className="w-full flex flex-col">
					{/* Header + desktop tabs */}
					<div className="container mx-auto px-3 sm:px-4 pt-3 sm:pt-8">
						<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 shrink-0"
								onClick={() => navigate('/dashboard')}>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<div className="min-w-0">
								<h1 className="text-base sm:text-3xl font-bold truncate">{festival.name}</h1>
								<p className="text-xs sm:text-sm text-muted-foreground">{dateString}</p>
							</div>
						</div>

						{/* Desktop: tabs at top */}
						{!isMobile && (
							<TabsList className="w-auto mb-4">
								<TabsTrigger value="shifts" className="gap-2">
									<CalendarDays className="h-4 w-4" />
									Schichtplan
								</TabsTrigger>
								<TabsTrigger value="materials" className="gap-2">
									<Package className="h-4 w-4" />
									Materialliste
								</TabsTrigger>
							</TabsList>
						)}
					</div>

					{/* Content */}
					<div className={isMobile ? 'px-3 pb-16' : 'container mx-auto px-4'}>
						<TabsContent value="shifts" className={isMobile ? 'mt-0' : 'mt-0'}>
							<ShiftPlanningView
								festivalId={festivalId}
								festivalName={festival.name}
								festivalDate={dateString}
							/>
						</TabsContent>
						<TabsContent value="materials" className={isMobile ? 'mt-0' : 'mt-0'}>
							<MaterialListView festivalId={festivalId} />
						</TabsContent>
					</div>

					{/* Mobile: bottom tab bar */}
					{isMobile && (
						<div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
							<TabsList className="w-full h-14 rounded-none bg-transparent p-0">
								<TabsTrigger
									value="shifts"
									className="flex-1 h-full rounded-none gap-1.5 flex-col text-[11px] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary">
									<CalendarDays className="h-5 w-5" />
									Schichtplan
								</TabsTrigger>
								<TabsTrigger
									value="materials"
									className="flex-1 h-full rounded-none gap-1.5 flex-col text-[11px] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary">
									<Package className="h-5 w-5" />
									Materialliste
								</TabsTrigger>
							</TabsList>
						</div>
					)}
				</Tabs>
			</div>
		</div>
	);
}
