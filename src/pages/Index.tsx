import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-festival.jpg';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Calendar,
	Users,
	ClipboardList,
	Smartphone,
	CheckCircle,
	ArrowRight,
	Tent,
	Music,
	Beer
} from 'lucide-react';

export default function Index() {
	const navigate = useNavigate();
	const { user } = useAuth();

	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section */}
			<section className="relative overflow-hidden">
				<div
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{ backgroundImage: `url(${heroImage})` }}>
					<div className="absolute inset-0 bg-black/50" />
				</div>

				<div className="relative container mx-auto px-4 py-24 lg:py-32">
					<div className="max-w-4xl mx-auto text-center text-white">
						<Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
							<Tent className="h-4 w-4 mr-2" />
							Für österreichische Vereine
						</Badge>

						<h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
							Fest-Planer
							<span className="block text-accent">Österreich</span>
						</h1>

						<p className="text-xl lg:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
							<strong>3 Schritte. 5 Minuten. Fertig.</strong>
							<br />
							Erstelle automatisch Checklisten, Schichtpläne und Bestelllisten für dein Vereinsfest.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							{!user && (
								<Button
									size="lg"
									onClick={() => navigate(user ? '/dashboard' : '/auth')}
									className="text-lg px-8 py-6">
									Jetzt kostenlos starten
								</Button>
							)}
							{user && (
								<Button
									size="lg"
									onClick={() => navigate('/dashboard')}
									className="text-lg px-8 py-6 bg-accent text-accent-foreground border border-white/20 hover:bg-accent/90">
									Zum Dashboard
								</Button>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-20 bg-muted/30">
				<div className="container mx-auto px-4">
					<div className="text-center mb-16">
						<h2 className="text-3xl lg:text-4xl font-bold mb-4">
							Alles was du für dein Fest brauchst
						</h2>
						<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
							Von der Planung bis zur Nachbereitung – speziell für österreichische Vereine
							entwickelt
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						<Card className="shadow-card hover:shadow-lg transition-shadow">
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<ClipboardList className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>Smart Planning</CardTitle>
								<CardDescription>
									Automatische Checklisten und Ressourcen-Vorschläge basierend auf deinem Festtyp
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2 text-sm">
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										Feuerwehr-, Musik- & Dorffest Templates
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										Zeitgesteuerte Erinnerungen
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										KI-basierte Mengenplanung
									</li>
								</ul>
							</CardContent>
						</Card>

						<Card className="shadow-card hover:shadow-lg transition-shadow">
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Users className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>Personen-Einteilung</CardTitle>
								<CardDescription>
									Drag & Drop Schichtplanung mit Ampel-System für optimale Übersicht
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2 text-sm">
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										Excel/CSV Import
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										Automatische Fairness-Verteilung
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										PDF-Export für Aushang
									</li>
								</ul>
							</CardContent>
						</Card>

						<Card className="shadow-card hover:shadow-lg transition-shadow">
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Smartphone className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>Mobile Kassa</CardTitle>
								<CardDescription>
									Kellner-App und Stationen-Übersicht für reibungslosen Ablauf während dem Fest
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2 text-sm">
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										Touch-optimierte Bedienung
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										Echtzeit Bestellweiterleitung
									</li>
									<li className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										Automatische Bon-Erstellung
									</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Testimonials */}
			<section className="py-20">
				<div className="container mx-auto px-4">
					<div className="text-center mb-16">
						<h2 className="text-3xl lg:text-4xl font-bold mb-4">Das sagen unsere Vereine</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<Card className="shadow-card">
							<CardContent className="p-6">
								<div className="flex items-center gap-4 mb-4">
									<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
										<Music className="h-6 w-6 text-primary" />
									</div>
									<div>
										<p className="font-semibold">Musikverein Stainz</p>
										<p className="text-sm text-muted-foreground">Steiermark</p>
									</div>
								</div>
								<p className="text-muted-foreground">
									"Früher haben wir Tage mit Excel-Listen verbracht. Jetzt haben wir unseren
									Schichtplan in einer Stunde fertig!"
								</p>
							</CardContent>
						</Card>

						<Card className="shadow-card">
							<CardContent className="p-6">
								<div className="flex items-center gap-4 mb-4">
									<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
										<Tent className="h-6 w-6 text-primary" />
									</div>
									<div>
										<p className="font-semibold">FF Wöllersdorf</p>
										<p className="text-sm text-muted-foreground">Niederösterreich</p>
									</div>
								</div>
								<p className="text-muted-foreground">
									"Die Kellner-App funktioniert perfekt auf unseren alten Tablets. Endlich kein
									Papier-Chaos mehr!"
								</p>
							</CardContent>
						</Card>

						<Card className="shadow-card">
							<CardContent className="p-6">
								<div className="flex items-center gap-4 mb-4">
									<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
										<Beer className="h-6 w-6 text-primary" />
									</div>
									<div>
										<p className="font-semibold">Gemeinde Hallein</p>
										<p className="text-sm text-muted-foreground">Salzburg</p>
									</div>
								</div>
								<p className="text-muted-foreground">
									"Unser Stadtfest war noch nie so gut organisiert. Die automatischen KI-Vorschläge
									waren sehr hilfreich."
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-gradient-to-br from-primary/10 to-secondary/10">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl lg:text-4xl font-bold mb-4">Bereit für dein nächstes Fest?</h2>
					<p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
						Starte jetzt und erstelle deinen ersten Festplan in unter einer Minute.
					</p>
					<Button
						size="lg"
						onClick={() => navigate(user ? '/dashboard' : '/auth')}
						className="text-lg px-8 py-4">
						Jetzt kostenlos starten
						<ArrowRight className="h-5 w-5" />
					</Button>
				</div>
			</section>
		</div>
	);
}
