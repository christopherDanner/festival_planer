/* Das Aussehen des Zettels. Zwei tragen ihn inzwischen — der an einer Zelle der
Matrix (#148) und der am Kategorie-Spaltenkopf (#149) —, also steht das Rezept
einmal hier statt zweimal nebeneinander (ADR 0003 §2). */

export const ZETTEL_SHEET = 'w-[205px] border-2.5 border-tinte bg-papier p-2.5 shadow-versatz';

export const ZETTEL_TITLE =
	'mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft';

/* Ein Platzhalter darf nicht wie ein Wert aussehen: blass und in normaler
Stärke. Im Entscheid-Prototyp stand der Standardwert als Platzhalter in
Wertschrift — eine nicht zugewiesene Kategorie sah aus wie eine zugewiesene
(ADR 0009, ausdrücklich kein Kosmetikpunkt). */
export const ZETTEL_FIELD =
	'w-full border-1.5 border-tinte bg-white px-2 py-1 text-[13px] outline-none placeholder:font-normal placeholder:text-tinte-soft focus:border-gruen';

export const ZETTEL_AMOUNT_FIELD = `${ZETTEL_FIELD} text-right font-display font-semibold tabular-nums`;

/** Die Zeile unter den Feldern: woher der Wert kommt und was er anrichtet. */
export const ZETTEL_HINT = 'mt-1.5 text-[11px] text-tinte-soft';

export const ZETTEL_BUTTON =
	'border-1.5 border-tinte px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.05em]';
