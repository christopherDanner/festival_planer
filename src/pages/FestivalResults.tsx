import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import ShiftPlanningView from '@/components/shift-planning/ShiftPlanningView';
import MaterialListView from '@/components/material-list/MaterialListView';
import ScheduleView from '@/components/schedule/ScheduleView';
import SponsoringView from '@/components/sponsoring/SponsoringView';
import FestivalOverviewView from '@/components/festival-overview/FestivalOverviewView';
import FestivalEditDialog from '@/components/festival/FestivalEditDialog';
import FestivalTabBar, { isFestivalTab, type FestivalTab } from '@/components/festival/FestivalTabBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Package, CalendarClock, Pencil, LayoutDashboard, HandCoins, LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { Festival, getFestival, updateFestival } from '@/lib/festivalService';

export default function FestivalResults() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { toast } = useToast();
	const isMobile = useIsMobile();
	const { signOut } = useAuth();

	const handleSignOut = async () => {
		await signOut();
		navigate('/');
	};

	const [festival, setFestival] = useState<Festival | null>(null);
	const [loading, setLoading] = useState(true);
	const [editDialogOpen, setEditDialogOpen] = useState(false);

	const festivalId = searchParams.get('id') || location.state?.festivalId;

	const tabParam = searchParams.get('tab');
	const activeTab: FestivalTab = isFestivalTab(tabParam) ? tabParam : 'overview';
	const handleTabChange = (tab: FestivalTab) => {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set('tab', tab);
				return next;
			},
			{ replace: true }
		);
	};

	useEffect(() => {
		if (!festivalId) {
			navigate('/dashboard');
			return;
		}

		loadFestivalData();
	}, [festivalId, navigate]);

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

	const handleSaveFestival = async (updates: { name: string; start_date: string; end_date: string | null; location: string | null }) => {
		if (!festivalId) return;
		try {
			await updateFestival(festivalId, {
				name: updates.name,
				start_date: updates.start_date,
				end_date: updates.end_date ?? undefined,
				location: updates.location ?? undefined
			});
			await loadFestivalData();
			toast({ title: 'Fest aktualisiert' });
		} catch (error: unknown) {
			toast({
				title: 'Fehler beim Speichern',
				description: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
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

	const subtitleParts = [dateString];
	if (festival.location) subtitleParts.push(festival.location);
	const subtitleString = subtitleParts.join(' \u00b7 ');

	return (
		<div className="min-h-screen">
			<PageHeader
				title={festival.name || 'Fest'}
				subtitle={subtitleString}
				onBack={() => navigate('/dashboard')}
				actions={
					<>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							aria-label="Fest bearbeiten"
							onClick={() => setEditDialogOpen(true)}>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="sm" onClick={handleSignOut}>
							Abmelden
						</Button>
					</>
				}
				menuItems={[
					{
						label: 'Fest bearbeiten',
						icon: <Pencil className="h-4 w-4" />,
						onClick: () => setEditDialogOpen(true)
					},
					{
						label: 'Dashboard',
						icon: <LayoutDashboard className="h-4 w-4" />,
						onClick: () => navigate('/dashboard')
					},
					{
						label: 'Abmelden',
						icon: <LogOut className="h-4 w-4" />,
						onClick: handleSignOut
					}
				]}
			/>
			<div>
				<Tabs
					value={activeTab}
					onValueChange={(v) => handleTabChange(v as FestivalTab)}
					className="w-full flex flex-col">
					{/* Desktop: tabs at top */}
					<div className="px-3 sm:px-6 pt-3 sm:pt-4">
						{!isMobile && (
							<TabsList className="w-auto mb-4">
								<TabsTrigger value="overview" className="gap-2">
									<LayoutDashboard className="h-4 w-4" />
									Übersicht
								</TabsTrigger>
								<TabsTrigger value="shifts" className="gap-2">
									<CalendarDays className="h-4 w-4" />
									Schichtplan
								</TabsTrigger>
								<TabsTrigger value="materials" className="gap-2">
									<Package className="h-4 w-4" />
									Materialliste
								</TabsTrigger>
								<TabsTrigger value="schedule" className="gap-2">
									<CalendarClock className="h-4 w-4" />
									Ablaufplan
								</TabsTrigger>
								<TabsTrigger value="sponsoring" className="gap-2">
									<HandCoins className="h-4 w-4" />
									Sponsoring
								</TabsTrigger>
							</TabsList>
						)}
					</div>

					{/* Content */}
					<div className={isMobile ? 'px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : 'px-6'}>
						<TabsContent value="overview" className={isMobile ? 'mt-0' : 'mt-0'}>
							<FestivalOverviewView
								festivalId={festivalId}
								festival={festival}
								onEditFestival={() => setEditDialogOpen(true)}
							/>
						</TabsContent>
						<TabsContent value="shifts" className={isMobile ? 'mt-0' : 'mt-0'}>
							<ShiftPlanningView
								festivalId={festivalId}
								festivalName={festival.name}
								festivalDate={dateString}
							/>
						</TabsContent>
						<TabsContent value="materials" className={isMobile ? 'mt-0' : 'mt-0'}>
							<MaterialListView festivalId={festivalId} festivalName={festival.name} />
						</TabsContent>
						<TabsContent value="schedule" className={isMobile ? 'mt-0' : 'mt-0'}>
							<ScheduleView
								festivalId={festivalId}
								festivalName={festival.name}
								festivalStartDate={festival.start_date}
								festivalEndDate={festival.end_date}
							/>
						</TabsContent>
						<TabsContent value="sponsoring" className={isMobile ? 'mt-0' : 'mt-0'}>
							<SponsoringView festivalId={festivalId} festivalName={festival.name} />
						</TabsContent>
					</div>

				</Tabs>

				{/* Mobile: bottom tab bar — immer sichtbar innerhalb des Festes */}
				{isMobile && <FestivalTabBar active={activeTab} onSelect={handleTabChange} />}
			</div>

			<FestivalEditDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				festival={festival}
				onSave={handleSaveFestival}
			/>
		</div>
	);
}
