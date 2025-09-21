import { useState, useEffect } from 'react';
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
import { Trash2 } from 'lucide-react';

export default function Dashboard() {
	const [showWizard, setShowWizard] = useState(false);
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [loading, setLoading] = useState(true);
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	useEffect(() => {
		if (!user) {
			navigate('/auth');
			return;
		}
		loadFestivals();
	}, [user, navigate]);

	const loadFestivals = async () => {
		try {
			const data = await getUserFestivals();
			setFestivals(data);
		} catch (error: any) {
			toast({
				title: 'Fehler',
				description: error.message,
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	};

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
		} catch (error: any) {
			toast({
				title: 'Fehler',
				description: error.message,
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
		<div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
			<Navigation />
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-3xl font-bold">Fest-Planer Dashboard Test</h1>
					<Button variant="outline" onClick={handleSignOut}>
						Abmelden
					</Button>
				</div>

				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{/* New Festival Card */}
					<Card className="border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
						<CardHeader className="text-center">
							<CardTitle className="text-xl">Neues Fest planen</CardTitle>
							<CardDescription>
								Erstellen Sie in wenigen Schritten einen vollständigen Festplan
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button onClick={() => setShowWizard(true)} className="w-full text-lg py-6" size="lg">
								+ Neues Fest
							</Button>
						</CardContent>
					</Card>

					{/* Existing Festivals */}
					{loading ? (
						<div className="col-span-2 text-center py-8">
							<p>Lade Ihre Feste...</p>
						</div>
					) : festivals.length === 0 ? (
						<div className="col-span-2 text-center py-8">
							<p className="text-muted-foreground">
								Noch keine Feste erstellt. Klicken Sie auf "Neues Fest" um zu beginnen.
							</p>
						</div>
					) : (
						festivals.map((festival) => (
							<Card
								key={festival.id}
								className="hover:shadow-md transition-shadow cursor-pointer relative group"
								onClick={() => navigate(`/festival-results?id=${festival.id}`)}>
								<CardHeader>
									<div className="flex justify-between items-start">
										<CardTitle className="text-lg">{festival.name}</CardTitle>
										<div className="flex items-center gap-2">
											<Badge variant="outline">{getFestivalTypeDisplay(festival.type)}</Badge>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
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
									</div>
									<CardDescription>
										{new Date(festival.start_date).toLocaleDateString('de-AT')}
										{festival.end_date &&
											festival.end_date !== festival.start_date &&
											` - ${new Date(festival.end_date).toLocaleDateString('de-AT')}`}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground">
										Besucherzahl: {getVisitorCountDisplay(festival.visitor_count)}
									</p>
								</CardContent>
							</Card>
						))
					)}
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
