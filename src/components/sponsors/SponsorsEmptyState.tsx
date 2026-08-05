import { Stamp } from '@/components/toolkit/Stamp';
import { Button } from '@/components/ui/button';

export interface SponsorsEmptyStateProps {
	onAddSponsor: () => void;
}

/**
 * Leerzustand des Sponsorenbestands nach dem Rezept aus DESIGN-VISION §4:
 * gestrichelter Rahmen, roter Stempelton, ein Satz, gelber Knopf.
 */
export default function SponsorsEmptyState({ onAddSponsor }: SponsorsEmptyStateProps) {
	return (
		<div className="border-2.5 border-t-0 border-tinte bg-white p-4">
			<div className="border-2 border-dashed border-linie px-4 py-12 text-center">
				<Stamp tone="red" size="lg" tilt="left">
					NOCH KEINE FIRMA
				</Stamp>
				<p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-tinte-soft">
					Einmal angelegt, steht eine Firma jedem Fest zur Verfügung.
				</p>
				<Button variant="versatz" onClick={onAddSponsor} className="mt-5 tracking-[.04em]">
					+ ERSTE FIRMA ANLEGEN
				</Button>
			</div>
		</div>
	);
}
