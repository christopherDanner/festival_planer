import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SponsoringHinweisstreifenProps {
	/** Fett vorangestellt: **was schon steht** („Preisliste steht."). */
	lead: string;
	/** Was daraus folgt — der nächste Schritt in einem Satz. */
	text: string;
	actionLabel: string;
	onAction: () => void;
	/**
	 * Die Kante, an der ihn der Aufrufer an die Tabelle schweißt
	 * (`border-t-0` darunter, `border-b-0` darüber) — wo er steht, entscheidet
	 * der Bereich, nicht der Streifen.
	 */
	className?: string;
}

/**
 * Der Hinweisstreifen der Leerzustände **L2** und **L3** (#152): ein gelber
 * Streifen an der Tabelle, der sagt, was schon steht, und einen Griff auf den
 * nächsten Schritt trägt.
 *
 * Er ersetzt die Tabelle nicht — in beiden Fällen ist die eine Achse ja richtig
 * gefüllt, und was dort steht, ist schon nützlich (die Vorjahreszahlen zum
 * Telefonieren, die Preisliste als Jahresgedächtnis). Der Streifen steht darum
 * **neben** den Daten, nicht an ihrer Stelle.
 */
const SponsoringHinweisstreifen: React.FC<SponsoringHinweisstreifenProps> = ({
	lead,
	text,
	actionLabel,
	onAction,
	className
}) => (
	<div
		className={cn(
			'flex flex-wrap items-center gap-x-3 gap-y-2 border-2.5 border-tinte bg-gelb px-3 py-2.5 text-[12.5px] leading-snug text-tinte',
			className
		)}>
		{/* Mindestbreite, damit der Satz am Handy nicht auf eine Spalte neben dem
		Knopf zusammengequetscht wird — enger als 15rem rutscht der Knopf unter ihn. */}
		<p className="min-w-[15rem] flex-1">
			<b className="font-extrabold">{lead}</b> {text}
		</p>
		<Button size="sm" variant="outline" onClick={onAction} className="tracking-[.04em]">
			{actionLabel}
		</Button>
	</div>
);

export default SponsoringHinweisstreifen;
