import React from 'react';
import { Button } from '@/components/ui/button';
import { Stamp } from '@/components/toolkit/Stamp';
import KategorieAnlegenKnopf from '@/components/sponsoring/KategorieAnlegenKnopf';
import type { CategoryZettelInput } from '@/lib/sponsoringPreisliste';

export interface SponsoringAnleitungProps {
	/** „+ ERSTE KATEGORIE" — derselbe Zettel wie „+ KATEGORIE" in der Werkzeugleiste. */
	onCategoryApply: (input: CategoryZettelInput) => void;
	/** „AUS EINEM FRÜHEREN FEST ÜBERNEHMEN" — der bestehende Übernahme-Dialog. */
	onTransfer: () => void;
}

/**
 * Leerzustand **L1** des Sponsoring-Bereichs: weder *Preisliste* noch Firmen,
 * also ein neues Fest ohne Kopierwerk (#152).
 *
 * Hier steht bewusst **keine** Tabelle. Ohne Kategorien hätte sie gar keine
 * Kategorie-Spalten mehr — ein Gerippe aus `Firma · Freibetrag · Sachleistung ·
 * Gesamt`, das nichts erklärt. Und „Noch keine Sponsorings erfasst" nennt das
 * falsche Problem: fehlen tut zuerst die *Preisliste* (CONTEXT.md: „ein Fest
 * ohne sie kann keinem Sponsor etwas zuweisen — sie ist der erste Schritt im
 * Bereich, vor den Firmen").
 *
 * Der Übernahme-Weg gehört ausdrücklich hierher: wer hier leer landet, hat ihn
 * im Kopierwerk bei der Fest-Anlage gerade verpasst.
 */
const SponsoringAnleitung: React.FC<SponsoringAnleitungProps> = ({
	onCategoryApply,
	onTransfer
}) => (
	<div className="border-2.5 border-tinte bg-white p-4">
		{/* Handschrift statt Illustration: Stempel und Anleitungstext, kein
		Bildmaterial (ADR 0003). Gestrichelter Rahmen und roter Stempel-Ton sind das
		Leerzustands-Rezept aus DESIGN-VISION §4, dasselbe wie im Leerzustand des
		Sponsorenbestands. Statt des einen Satzes stehen hier zwei Wege samt der
		Auskunft, welcher wann lohnt — so verlangt es #152. */}
		<div className="border-2 border-dashed border-linie px-4 py-10 text-center">
			<Stamp tone="red" size="lg">
				NICHTS ERFASST
			</Stamp>

			<h3 className="mt-4 font-display text-lg font-semibold uppercase tracking-[.02em]">
				Zuerst die Preisliste
			</h3>
			<p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-tinte-soft">
				Sponsoring-Kategorien sind die Leistungen, die der Verein anbietet — „Transparent € 300",
				„Plakat € 200". Sie werden die Spalten dieser Tabelle. Danach kommen die Firmen dazu.
			</p>

			<div className="mt-5 flex flex-wrap items-center justify-center gap-2">
				<KategorieAnlegenKnopf
					onCategoryApply={onCategoryApply}
					trigger={
						<Button variant="versatz" className="tracking-[.04em]">
							+ ERSTE KATEGORIE
						</Button>
					}
				/>
				<Button variant="outline" onClick={onTransfer} className="tracking-[.04em]">
					AUS EINEM FRÜHEREN FEST ÜBERNEHMEN
				</Button>
			</div>

			{/* Welcher Weg wann lohnt — ohne den Satz sehen zwei gleichrangige Knöpfe
			wie eine Entscheidung aus, die man nicht treffen kann. Beschrieben ist,
			was der Übernahme-Dialog wirklich tut: er geht über die Firmen und legt
			deren Kategorien im Zielfest an (ADR 0008), er holt nicht die Preisliste
			für sich. */}
			<p className="mx-auto mt-5 max-w-lg border-t border-dashed border-linie pt-3 text-xs leading-relaxed text-tinte-soft">
				Beide Wege führen zum Ziel: <b className="text-tinte">Übernehmen</b> holt die Firmen eines
				vergangenen Fests samt ihren Kategorien und Werten — meist schneller, weil die Werte
				stehen. <b className="text-tinte">Neu anlegen</b> lohnt beim ersten Fest überhaupt.
			</p>
		</div>
	</div>
);

export default SponsoringAnleitung;
