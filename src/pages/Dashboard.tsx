import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import FestivalWizard from '@/components/FestivalWizard';
import Navigation from '@/components/Navigation';
import { Festival, getUserFestivals, deleteFestival } from '@/lib/festivalService';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Trash2, Calendar, MapPin, Plus, Users, ArrowRight, PartyPopper } from 'lucide-react';

export default function Dashboard() {
	const [showWizard, setShowWizard] = useState(false);
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [loading, setLoading] = useState(true);
	const { user } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	const loadFestivals = useCallback(async () => {
		try {
			const data = await getUserFestivals();
			setFestivals(data);
		} catch (error: unknown) {
			toast({
				title: 'Fehler',
				description:
					error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		if (!user) {
			navigate('/auth');
			return;
		}
		loadFestivals();
	}, [user, navigate, loadFestivals]);

	const handleFestivalCreated = () => {
		setShowWizard(false);
		loadFestivals();
	};

	const handleDeleteFestival = async (
		festivalId: string,
		festivalName: string,
		e: React.MouseEvent
	) => {
		e.stopPropagation();
		try {
			await deleteFestival(festivalId);
			toast({
				title: 'Fest gelöscht',
				description: `${festivalName} wurde erfolgreich gelöscht.`
			});
			loadFestivals();
		} catch (error: unknown) {
			toast({
				title: 'Fehler',
				description:
					error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
		}
	};

	if (showWizard) {
		return (
			<FestivalWizard onClose={() => setShowWizard(false)} onComplete={handleFestivalCreated} />
		);
	}

	if (!user) {
		return null;
	}

	// Sort: upcoming first (by start_date), then past
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const upcoming = festivals
		.filter(f => new Date(f.start_date) >= now)
		.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
	const past = festivals
		.filter(f => new Date(f.start_date) < now)
		.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

	const nextFestival = upcoming[0];
	const otherUpcoming = upcoming.slice(1);

	const getDaysUntil = (dateStr: string) => {
		const date = new Date(dateStr);
		date.setHours(0, 0, 0, 0);
		const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		if (diff === 0) return 'Heute!';
		if (diff === 1) return 'Morgen';
		return `in ${diff} Tagen`;
	};

	const formatDate = (f: Festival) => {
		const start = new Date(f.start_date).toLocaleDateString('de-AT');
		if (f.end_date && f.end_date !== f.start_date) {
			return `${start} – ${new Date(f.end_date).toLocaleDateString('de-AT')}`;
		}
		return start;
	};

	const renderDeleteButton = (festival: Festival) => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
					onClick={(e) => e.stopPropagation()}>
					<Trash2 className="h-4 w-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Fest löschen</AlertDialogTitle>
					<AlertDialogDescription>
						Sind Sie sicher, dass Sie &quot;{festival.name}&quot; löschen möchten? Diese
						Aktion kann nicht rückgängig gemacht werden.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Abbrechen</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => handleDeleteFestival(festival.id, festival.name || 'Fest', e)}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
						Löschen
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	const renderFestivalCard = (festival: Festival, isUpcoming: boolean) => (
		<Card
			key={festival.id}
			className={`group hover:shadow-md transition-all duration-200 cursor-pointer border bg-card hover:-translate-y-0.5 ${!isUpcoming ? 'opacity-60 hover:opacity-80' : ''}`}
			onClick={() => navigate(`/festival-results?id=${festival.id}`)}>
			<CardHeader className="pb-3">
				<div className="flex justify-between items-start">
					<CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
						{festival.name}
					</CardTitle>
					{renderDeleteButton(festival)}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-1.5 text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						<Calendar className="h-3.5 w-3.5" />
						<span>{formatDate(festival)}</span>
						{isUpcoming && (
							<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
								{getDaysUntil(festival.start_date)}
							</span>
						)}
					</div>
					{festival.location && (
						<div className="flex items-center gap-2">
							<MapPin className="h-3.5 w-3.5" />
							<span>{festival.location}</span>
						</div>
					)}
					</div>
			</CardContent>
		</Card>
	);

	return (
		<div className="min-h-screen bg-background">
			<Navigation />
			<div className="pt-16">
				{/* Header */}
				<div className="bg-background border-b">
					<div className="px-4 sm:px-6 py-6 sm:py-8">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold">Meine Feste</h1>
								<p className="text-muted-foreground mt-1">
									{festivals.length === 0
										? 'Erstellen Sie Ihr erstes Fest'
										: `${festivals.length} ${festivals.length === 1 ? 'Fest' : 'Feste'} · ${upcoming.length} bevorstehend`}
								</p>
							</div>
							<div className="flex gap-3">
								<Button onClick={() => setShowWizard(true)} className="gap-2">
									<Plus className="h-4 w-4" />
									Neues Fest
								</Button>
								<Button onClick={() => navigate('/members')} variant="outline" className="gap-2">
									<Users className="h-4 w-4" />
									Mitglieder
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="px-4 sm:px-6 py-6 sm:py-8 space-y-8">
					{loading ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<div key={i} className="rounded-xl border bg-card p-6 space-y-4 animate-pulse">
									<div className="h-5 bg-muted rounded w-2/3" />
									<div className="h-4 bg-muted rounded w-1/3" />
									<div className="h-4 bg-muted rounded w-1/2" />
								</div>
							))}
						</div>
					) : festivals.length === 0 ? (
						/* Empty state */
						<div className="text-center py-20">
							<div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
								<PartyPopper className="h-10 w-10 text-primary" />
							</div>
							<h2 className="text-2xl font-bold mb-2">Willkommen beim Fest-Planer!</h2>
							<p className="text-muted-foreground mb-8 max-w-md mx-auto">
								Erstellen Sie Ihr erstes Fest und beginnen Sie mit der Planung —
								Schichtpläne, Materialien und Ablaufpläne an einem Ort.
							</p>
							<Button onClick={() => setShowWizard(true)} size="lg" className="gap-2 px-8">
								<Plus className="h-5 w-5" />
								Erstes Fest erstellen
							</Button>
						</div>
					) : (
						<>
							{/* Next Festival — Hero Card */}
							{nextFestival && (
								<div>
									<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Nächstes Fest</h2>
									<Card
										className="group cursor-pointer border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
										onClick={() => navigate(`/festival-results?id=${nextFestival.id}`)}>
										<div className="p-4 sm:p-8">
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
												<div className="flex-1">
													<h3 className="text-xl sm:text-3xl font-extrabold text-foreground group-hover:text-primary transition-colors">
														{nextFestival.name}
													</h3>
													<span className="inline-block bg-primary text-primary-foreground text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full mt-1.5 sm:mt-2">
														{getDaysUntil(nextFestival.start_date)}
													</span>
													<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
														<span className="flex items-center gap-1.5">
															<Calendar className="h-4 w-4" />
															{formatDate(nextFestival)}
														</span>
														{nextFestival.location && (
															<span className="flex items-center gap-1.5">
																<MapPin className="h-4 w-4" />
																{nextFestival.location}
															</span>
														)}
													</div>
												</div>
												<div className="w-full sm:w-auto flex items-center justify-end gap-2">
													{renderDeleteButton(nextFestival)}
													<Button variant="default" className="hidden sm:flex gap-2">
														Öffnen <ArrowRight className="h-4 w-4" />
													</Button>
												</div>
											</div>
										</div>
									</Card>
								</div>
							)}

							{/* Other Upcoming Festivals */}
							{otherUpcoming.length > 0 && (
								<div>
									<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Weitere bevorstehende Feste</h2>
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{otherUpcoming.map(f => renderFestivalCard(f, true))}
									</div>
								</div>
							)}

							{/* Past Festivals */}
							{past.length > 0 && (
								<div>
									<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vergangene Feste</h2>
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{past.map(f => renderFestivalCard(f, false))}
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
