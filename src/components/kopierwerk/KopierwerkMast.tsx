import { Mast } from '@/components/toolkit/Mast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface KopierwerkMastProps {
	/** Name der Vorlage; ohne Vorlage entfällt die Zeile. */
	templateName?: string;
	/** <900px: Kompakt-Mast. */
	compact: boolean;
	/** Klick auf die Wortmarke — zurück auf die Plakatwand. */
	onOpenFestivalList: () => void;
	/** „ABBRECHEN ×" — derselbe Weg, nur ausgesprochen. */
	onCancel: () => void;
}

/**
 * Mast des Kopierwerks (#93): eigener Kopf für die eigene Route, statt des
 * In-Page-Zustands der Festliste. Zwei Wege zurück auf die Wand — die Wortmarke
 * und das ausgesprochene „ABBRECHEN ×" (Master-Prototyp `mastKopier`).
 */
export default function KopierwerkMast({
	templateName,
	compact,
	onOpenFestivalList,
	onCancel
}: KopierwerkMastProps) {
	return (
		<Mast
			title="Neues Fest anlegen"
			compact={compact}
			onWordmarkClick={onOpenFestivalList}
			when={
				templateName ? (
					<>
						Vorlage: <b className="font-semibold text-white">{templateName}</b>
					</>
				) : undefined
			}
			end={
				<Button
					variant="ghost"
					size="sm"
					onClick={onCancel}
					// Trefferfläche am Handy ≥ 40px (DESIGN-VISION §6, WCAG 2.5.8)
					className={cn(
						'px-3 text-[12.5px] text-white hover:bg-white/15 hover:text-white',
						compact ? 'h-10' : 'h-8'
					)}>
					ABBRECHEN ×
				</Button>
			}
		/>
	);
}
