import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stamp } from '@/components/toolkit/Stamp';
import { Button } from '@/components/ui/button';
import { FESTIVAL_LIST_PATH } from '@/lib/festivalRoutes';

/**
 * Unbekannte Route als Leerzustand nach dem Rezept aus DESIGN-VISION §4
 * (Variante N2, Entscheid #101): gestrichelter Rahmen, roter Stempelton,
 * ein Satz, gelber Knopf zurück. Keine Zahl 404 — sie sagt ehrenamtlichen
 * Fest-Organisatoren nichts. Kein Mast: die Seite kann ohne jeden Kontext
 * auftreten.
 *
 * Rahmenfarbe und Stempelgröße folgen den Zwillingen desselben Rezepts —
 * „NOCH KEIN FEST" (#90) und „KEIN MATERIAL" (#95) — nicht dem etwas
 * helleren, kleineren Stempel des Prototyps: #162 will ausdrücklich ein
 * Rezept für „hier ist nichts", kein zweites.
 */
const NotFound = () => {
	const location = useLocation();

	useEffect(() => {
		// Einzige Spur, wenn jemand einen kaputten Link meldet.
		console.error('404 Error: User attempted to access non-existent route:', location.pathname);
	}, [location.pathname]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-papier px-5 py-10">
			<div className="w-full max-w-[400px] border-2.5 border-dashed border-tinte-soft px-5 py-7 text-center">
				<Stamp tone="red" size="lg" tilt="left">
					DIESE SEITE GIBT ES NICHT
				</Stamp>
				{/* Der Satz nimmt die Breite des Kastens — wie in N2, wo er auf dem
				Desktop in eine Zeile fällt und am Handy in zwei. */}
				<p className="mt-4 text-[12.5px] leading-snug text-tinte-soft">
					Der Link führt ins Leere. Zurück zur Festliste, dort steht alles.
				</p>
				<Button asChild className="mt-4 h-10 text-[12.5px]">
					<Link to={FESTIVAL_LIST_PATH}>ZU MEINEN FESTEN</Link>
				</Button>
			</div>
		</div>
	);
};

export default NotFound;
