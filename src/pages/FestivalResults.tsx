import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import ShiftPlanningView from '@/components/shift-planning/ShiftPlanningView';
import MaterialListView from '@/components/material-list/MaterialListView';
import ScheduleView from '@/components/schedule/ScheduleView';
import SponsoringView from '@/components/sponsoring/SponsoringView';
import FestivalOverviewView from '@/components/festival-overview/FestivalOverviewView';
import FestivalEditDialog from '@/components/festival/FestivalEditDialog';
import FestivalShellHeader from '@/components/festival/FestivalShellHeader';
import FestivalTabBar, { isFestivalTab, type FestivalTab } from '@/components/festival/FestivalTabBar';
import { Button } from '@/components/ui/button';
import { Pencil, LayoutDashboard, LogOut } from 'lucide-react';
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

	return (
		<div className="min-h-screen">
			{/* Layout-Rahmen der Vision: max-width 1180px, zentriert */}
			<div
				className={
					isMobile
						? 'mx-auto max-w-[1180px] px-3 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]'
						: 'mx-auto max-w-[1180px] px-[22px] pt-[18px] pb-20'
				}>
			<FestivalShellHeader
				festivalName={festival.name || 'Fest'}
				startDate={festival.start_date}
				endDate={festival.end_date}
				activeTab={activeTab}
				onTabChange={handleTabChange}
				actions={
					<>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
							aria-label="Fest bearbeiten"
							onClick={() => setEditDialogOpen(true)}>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-white hover:bg-white/15 hover:text-white"
							onClick={handleSignOut}>
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
						label: 'Zur Festliste',
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
			{/* Content */}
			<div className="pt-4 sm:pt-5">
				{activeTab === 'overview' && (
					<FestivalOverviewView
						festivalId={festivalId}
						festival={festival}
						onEditFestival={() => setEditDialogOpen(true)}
					/>
				)}
				{activeTab === 'shifts' && (
					<ShiftPlanningView
						festivalId={festivalId}
						festivalName={festival.name}
						festivalDate={dateString}
					/>
				)}
				{activeTab === 'materials' && (
					<MaterialListView festivalId={festivalId} festivalName={festival.name} />
				)}
				{activeTab === 'schedule' && (
					<ScheduleView
						festivalId={festivalId}
						festivalName={festival.name}
						festivalStartDate={festival.start_date}
						festivalEndDate={festival.end_date}
					/>
				)}
				{activeTab === 'sponsoring' && (
					<SponsoringView festivalId={festivalId} festivalName={festival.name} />
				)}
			</div>
			</div>

			{/* Mobile: bottom tab bar — immer sichtbar innerhalb des Festes */}
			{isMobile && <FestivalTabBar active={activeTab} onSelect={handleTabChange} />}

			<FestivalEditDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				festival={festival}
				onSave={handleSaveFestival}
			/>
		</div>
	);
}
