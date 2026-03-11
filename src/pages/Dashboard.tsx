import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Trash2, Calendar } from 'lucide-react';

export default function Dashboard() {
	const [showWizard, setShowWizard] = useState(false);
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [loading, setLoading] = useState(true);
	const { user, signOut } = useAuth();
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

	const handleSignOut = async () => {
		await signOut();
		navigate('/');
	};

	const handleFestivalCreated = () => {
		setShowWizard(false);
		loadFestivals(); // Reload festivals
	};

	const handleDeleteFestival = async (
		festivalId: string,
		festivalName: string,
		e: React.MouseEvent
	) => {
		e.stopPropagation(); // Prevent card click
		try {
			await deleteFestival(festivalId);
			toast({
				title: 'Fest gelöscht',
				description: `${festivalName} wurde erfolgreich gelöscht.`
			});
			loadFestivals(); // Reload festivals
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
		return null; // Redirect handled in useEffect
	}

	return (
		<div className="min-h-screen bg-background">
			<Navigation />
			<div className="pt-16">
				{/* Header Section */}
				<div className="bg-background border-b">
					<div className="container mx-auto px-4 py-8">
						<div>
							<h1 className="text-2xl font-bold mb-2">Willkommen zurück!</h1>
							<p className="text-muted-foreground mb-6">
								Planen und organisieren Sie Ihre Feste mit unserem intelligenten Fest-Planer
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Button
									onClick={() => setShowWizard(true)}
									variant="default"
									size="default"
									className="px-6 py-3">
									+ Neues Fest erstellen
								</Button>
								<Button
									onClick={() => navigate('/members')}
									variant="outline"
									size="lg"
									className="px-6 py-3">
									Mitglieder verwalten
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="container mx-auto px-4 py-8">
					{/* Festivals Section */}
					<div className="mb-8">
						<h2 className="text-lg font-semibold text-foreground mb-6">Ihre Feste</h2>

						{loading ? (
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="rounded-lg border bg-card p-6 space-y-4 animate-pulse">
										<div className="h-5 bg-muted rounded w-2/3" />
										<div className="h-4 bg-muted rounded w-1/3" />
										<div className="h-px bg-border mt-4" />
										<div className="h-9 bg-muted rounded" />
									</div>
								))}
							</div>
						) : festivals.length === 0 ? (
							<Card className="text-center py-16 bg-card border border-border">
								<CardContent>
									<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
										<Calendar className="h-8 w-8 text-muted-foreground" />
									</div>
									<h3 className="text-xl font-semibold text-foreground/80 mb-2">
										Noch keine Feste erstellt
									</h3>
									<p className="text-muted-foreground mb-6">
										Beginnen Sie mit der Planung Ihres ersten Festes
									</p>
									<Button
										onClick={() => setShowWizard(true)}
										variant="default"
										size="lg"
										className="px-8">
										Erstes Fest erstellen
									</Button>
								</CardContent>
							</Card>
						) : (
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{festivals.map((festival) => (
									<Card
										key={festival.id}
										className="group hover:shadow-md transition-all duration-300 cursor-pointer border border-border bg-card shadow-sm hover:-translate-y-0.5"
										onClick={() => navigate(`/festival-results?id=${festival.id}`)}>
										<CardHeader className="pb-4">
											<div className="flex justify-between items-start">
												<div className="flex-1">
													<CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
														{festival.name}
													</CardTitle>
												</div>
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
																Sind Sie sicher, dass Sie "{festival.name}" löschen möchten? Diese
																Aktion kann nicht rückgängig gemacht werden und löscht alle
																zugehörigen Daten (Checkliste, Schichtpläne, Ressourcen).
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Abbrechen</AlertDialogCancel>
															<AlertDialogAction
																onClick={(e) =>
																	handleDeleteFestival(festival.id, festival.name || 'Fest', e)
																}
																className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
																Löschen
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										</CardHeader>
										<CardContent className="pt-0">
											<div className="space-y-3">
												<div className="flex items-center text-sm text-muted-foreground">
													<Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
													<span>
														{new Date(festival.start_date).toLocaleDateString('de-AT')}
														{festival.end_date &&
															festival.end_date !== festival.start_date &&
															` - ${new Date(festival.end_date).toLocaleDateString('de-AT')}`}
													</span>
												</div>
											</div>
											<div className="mt-4 pt-4 border-t border-border">
												<Button
													variant="ghost"
													className="w-full text-muted-foreground hover:text-foreground hover:bg-muted"
													onClick={(e) => {
														e.stopPropagation();
														navigate(`/festival-results?id=${festival.id}`);
													}}>
													Fest anzeigen →
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
