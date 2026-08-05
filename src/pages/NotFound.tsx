import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stamp } from '@/components/toolkit/Stamp';
import { Button } from '@/components/ui/button';

/**
 * Unbekannte Route als Leerzustand nach dem Rezept aus DESIGN-VISION §4
 * (Variante N2, Entscheid #101): gestrichelter Rahmen, roter Stempelton,
 * ein Satz, gelber Knopf zurück. Keine Zahl 404 — sie sagt ehrenamtlichen
 * Fest-Organisatoren nichts. Kein Mast: die Seite kann ohne jeden Kontext
 * auftreten.
 */
const NotFound = () => {
	const location = useLocation();

	useEffect(() => {
		// Einzige Spur, wenn jemand einen kaputten Link meldet.
		console.error('404 Error: User attempted to access non-existent route:', location.pathname);
	}, [location.pathname]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-papier px-5 py-10">
			<div className="w-full max-w-[400px] border-2.5 border-dashed border-tinte-soft px-5 py-8 text-center">
				<Stamp tone="red" size="lg" tilt="left">
					DIESE SEITE GIBT ES NICHT
				</Stamp>
				<p className="mx-auto mt-4 max-w-[42ch] text-[12.5px] leading-relaxed text-tinte-soft">
					Der Link führt ins Leere. Zurück zur Festliste, dort steht alles.
				</p>
				<Button asChild className="mt-4 h-10 text-[12.5px]">
					<Link to="/dashboard">ZU MEINEN FESTEN</Link>
				</Button>
			</div>
		</div>
	);
};

export default NotFound;
