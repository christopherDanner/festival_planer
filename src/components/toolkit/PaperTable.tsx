/** Die Zellen der Frachtbrief-Tabelle (DESIGN-VISION.md §4/§5): Versalien-Kopf
auf getönter Fläche mit Tinte-Strich darunter, ruhige Zeilen mit
tabellarischen Ziffern, Fuß in derselben Tönung mit Tinte-Strich darüber.
Drei Bereiche tragen sie inzwischen — die Sponsoring-Matrix (#147), die
Sponsoren-Stammdaten (#157) und die Positionstabelle (#114) —, darum stehen die
Rezepte hier und nicht dreimal nebeneinander (ADR 0003 §2). */

export const PAPER_TABLE_HEAD_CELL =
	'border-b-2 border-tinte bg-fusszeile px-2.5 py-2 text-left align-bottom text-[11px] font-bold uppercase tracking-[.05em]';

export const PAPER_TABLE_BODY_CELL = 'overflow-hidden px-2.5 align-middle tabular-nums';

export const PAPER_TABLE_FOOT_CELL =
	'border-t-2 border-tinte bg-fusszeile px-2.5 py-2 align-middle font-extrabold tabular-nums';

/** Fehlender Wert: grauer Strich statt leerer Zelle — eine leere Zelle liest
sich wie ein Fehler der Tabelle, ein Strich wie eine Angabe, die es nicht gibt. */
export const MissingValue = () => <span className="text-tinte-soft/60">–</span>;
