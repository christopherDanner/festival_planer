import { Stamp } from '@/components/toolkit/Stamp';
import { Button } from '@/components/ui/button';

import CopySwitch from './CopySwitch';
import { plural } from './plural';

export interface SponsoringStepProps {
	/** Kategorien der *Preisliste* der Vorlage — beziffert den ersten Schalter. */
	categoryCount: number;
	/** Firmen, die bei der Vorlage erfasst waren — beziffert den zweiten. */
	sponsorCount: number;
	copySponsoringCategories: boolean;
	copySponsorings: boolean;
	/** Das Fest wird gerade angelegt. */
	saving: boolean;
	onCopyCategoriesChange: (value: boolean) => void;
	onCopySponsoringsChange: (value: boolean) => void;
	onBack: () => void;
	onSubmit: () => void;
}

/**
 * Werkbank des Sponsoring-Schritts (#146, ADR 0008): zwei Schalter, die **nicht**
 * aneinander hängen.
 *
 * Sie tragen bewusst verschiedene Versprechen, und das ist der ganze Entscheid
 * des Schritts: die *Preisliste* ist, was der Verein heuer anbietet — unsere
 * Entscheidung, also kommt sie vollständig mit Werten. Ein *Sponsoring* trägt
 * dagegen keinen Status; „erfasst" heißt „zugesagt". Kopierte Vorjahresbeträge
 * zeigten am Tag der Fest-Anlage eingeworbenes Geld, bei dem noch keine Firma
 * gefragt wurde — darum kommen die Firmen nackt, und der Hinweis am Schalter
 * sagt das, bevor die leere Summe wie ein Fehler aussieht.
 */
export default function SponsoringStep({
	categoryCount,
	sponsorCount,
	copySponsoringCategories,
	copySponsorings,
	saving,
	onCopyCategoriesChange,
	onCopySponsoringsChange,
	onBack,
	onSubmit
}: SponsoringStepProps) {
	const nothingToCopy = categoryCount === 0 && sponsorCount === 0;

	return (
		<div className="border-2.5 border-tinte bg-white">
			<div className="flex flex-wrap items-baseline gap-3 border-b-2.5 border-tinte px-4 py-3">
				<h3 className="text-sm font-bold uppercase tracking-[.08em]">Sponsoring</h3>
				<span className="text-xs text-tinte-soft">
					Die Preisliste kommt mit ihren Werten, die Firmen als reine Verknüpfung — zwei
					Schalter, einzeln zu haben.
				</span>
			</div>

			{nothingToCopy ? (
				<EmptySponsoring />
			) : (
				<div className="grid gap-2 border-b border-linie px-4 py-3">
					{/* Ein Schalter, der nichts zu holen hätte, ist kein Angebot — darum
					steht jeder nur da, wo die Vorlage etwas führt. */}
					{categoryCount > 0 && (
						<CopySwitch
							id="kategorien-uebernehmen"
							label="Sponsoring-Kategorien übernehmen"
							// „Die ganze" ist die Ansage gegen den Einzel-Dialog, der nur
							// anlegt, was eine gewählte Firma genommen hatte: was voriges Jahr
							// niemand gekauft hat, bietet der Verein heuer trotzdem an.
							hint={`Die ganze Preisliste: ${plural(categoryCount, 'Kategorie', 'Kategorien')} — auch die, die voriges Jahr niemand genommen hat.`}
							checked={copySponsoringCategories}
							onChange={onCopyCategoriesChange}
						/>
					)}
					{sponsorCount > 0 && (
						<CopySwitch
							id="sponsoren-uebernehmen"
							label="Sponsoren übernehmen"
							// Ohne diesen Satz liest sich die leere Summe wie ein Fehler.
							hint={`${plural(sponsorCount, 'Firma', 'Firmen')} als Verknüpfung, ohne Beträge — die trägst du beim Zusagen ein.`}
							checked={copySponsorings}
							onChange={onCopySponsoringsChange}
						/>
					)}
				</div>
			)}

			<div className="flex flex-wrap justify-between gap-3 border-t-2.5 border-tinte px-4 py-3">
				<Button variant="outline" onClick={onBack} className="h-10 px-4 text-[12.5px]">
					← Ablaufplan
				</Button>
				<Button onClick={onSubmit} disabled={saving} className="h-10 px-4 text-[12.5px]">
					{saving ? 'LEGE FEST AN …' : 'FEST ANLEGEN'}
				</Button>
			</div>
		</div>
	);
}

/** Leerzustand wie beim Material: der Schritt bleibt überspringbar, das Fest
entsteht auch ohne Sponsoring. */
function EmptySponsoring() {
	return (
		<div className="px-4 py-8">
			<div className="flex flex-col items-center border-2.5 border-dashed border-tinte-soft px-5 py-7 text-center">
				<Stamp tone="red" size="lg" tilt="right">
					KEIN SPONSORING
				</Stamp>
				<p className="mx-auto mt-4 max-w-[46ch] text-[12.5px] leading-snug text-tinte-soft">
					Die Vorlage führt weder Preisliste noch Firmen — hier gibt es nichts zu übernehmen. Das
					Sponsoring des neuen Fests legst du danach im Fest an.
				</p>
			</div>
		</div>
	);
}
