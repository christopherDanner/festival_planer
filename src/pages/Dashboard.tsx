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
import { Trash2, Users, Calendar } from 'lucide-react';

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
						<div className="max-w-4xl">
							<h1 className="text-3xl font-bold mb-2">Willkommen zurück!</h1>
							<p className="text-muted-foreground mb-6">
								Planen und organisieren Sie Ihre Feste mit unserem intelligenten Fest-Planer
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Button
									onClick={() => setShowWizard(true)}
									variant="festival"
									size="lg"
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
						<h2 className="text-2xl font-bold text-gray-900 mb-6">Ihre Feste</h2>

						{loading ? (
							<div className="text-center py-12">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
								<p className="mt-4 text-gray-600">Lade Ihre Feste...</p>
							</div>
						) : festivals.length === 0 ? (
							<Card className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 border-dashed border-2 border-gray-300">
								<CardContent>
									<div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
										<Calendar className="h-8 w-8 text-gray-400" />
									</div>
									<h3 className="text-xl font-semibold text-gray-700 mb-2">
										Noch keine Feste erstellt
									</h3>
									<p className="text-gray-500 mb-6">
										Beginnen Sie mit der Planung Ihres ersten Festes
									</p>
									<Button
										onClick={() => setShowWizard(true)}
										variant="festival"
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
										className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white shadow-md hover:-translate-y-1"
										onClick={() => navigate(`/festival-results?id=${festival.id}`)}>
										<CardHeader className="pb-4">
											<div className="flex justify-between items-start">
												<div className="flex-1">
													<CardTitle className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
														{festival.name}
													</CardTitle>
													<Badge
														variant="outline"
														className="mt-2 bg-primary/10 text-primary border-primary/20">
														{getFestivalTypeDisplay(festival.type)}
													</Badge>
												</div>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
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
												<div className="flex items-center text-sm text-gray-600">
													<Calendar className="h-4 w-4 mr-2 text-primary" />
													<span>
														{new Date(festival.start_date).toLocaleDateString('de-AT')}
														{festival.end_date &&
															festival.end_date !== festival.start_date &&
															` - ${new Date(festival.end_date).toLocaleDateString('de-AT')}`}
													</span>
												</div>
												<div className="flex items-center text-sm text-gray-600">
													<Users className="h-4 w-4 mr-2 text-primary" />
													<span>
														Besucherzahl: {getVisitorCountDisplay(festival.visitor_count)}
													</span>
												</div>
											</div>
											<div className="mt-4 pt-4 border-t border-gray-100">
												<Button
													variant="ghost"
													className="w-full text-primary hover:bg-primary/10"
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

function getFestivalTypeDisplay(type: string): string {
	const types: { [key: string]: string } = {
		feuerwehr: 'Feuerwehrfest',
		musik: 'Musikfest',
		kirtag: 'Kirtag/Dorffest',
		wein: 'Weinfest',
		weihnachten: 'Weihnachtsmarkt'
	};
	return types[type] || type;
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
