import { type DeltaTone } from '@/lib/materialRow';

/** Die zwei Auszeichnungen, die die Positionstabelle (#114) und die Handy-Karte
(#116) teilen. Sie stehen hier und nicht zweimal nebeneinander — dieselbe Lücke
darf an beiden Orten nicht verschieden aussehen (ADR 0003 §2). */

/** Preislücke: rot gestrichelt statt still leer — die Position zählt in keine
Summe und das muss man an ihr sehen (#114).

Bewusst kein `<OpenSlot>`: der trägt dieselbe Grafik, ist aber ein Knopf zum
Besetzen. Lesend führt die Stelle nirgendwohin — erst der Zeilenmodus macht sie
zum Eingabefeld. */
export const PriceGap = () => (
	<span className="inline-block border-1.5 border-dashed border-rot px-1.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-rot">
		Fehlt
	</span>
);

/** Δ-Ton als Schrift: Mehrverbrauch ist rot — er hat das Fest mehr gekostet als
geplant, nicht umgekehrt (#114). */
export const DELTA_TONE: Record<DeltaTone, string> = {
	over: 'font-bold text-rot',
	under: 'font-bold text-gruen',
	zero: 'text-tinte-soft',
	none: 'text-tinte-soft/60'
};
