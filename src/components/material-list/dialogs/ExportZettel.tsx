import React, { type ElementType, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Stamp } from '@/components/toolkit/Stamp';
import { Zettel, ZETTEL_FOCUS } from '@/components/toolkit/Zettel';
import { formatEuro } from '@/lib/money';

/** Die Zahlen der Auswahl. Sie kommen fertig gerechnet aus `materialCosts`
(ADR 0006) — dieser Zettel rechnet nicht, er setzt. */
export interface ExportSummary {
	positionCount: number;
	/** Dateien, die der Export erzeugt; ab 2 steht die Zahl in der Zeile. */
	fileCount: number;
	/** Bestellwert € der Auswahl. */
	ordered: number;
	/** Verbrauchswert € — nur wo das Papier ihn trägt (die Bestellliste nicht). */
	consumed?: number;
	/** Preislücke der Auswahl. */
	withoutPrice: number;
}

export interface ExportZettelProps {
	title: string;
	/** Die Feldzeilen der Auswahl — was das jeweilige Papier zu fragen hat. */
	children: ReactNode;
	summary: ExportSummary;
	onPdf: () => void;
	onExcel: () => void;
	onCancel: () => void;
	TitleTag?: ElementType;
}

/**
 * Der gemeinsame Zettel der beiden Export-Dialoge des Material-Bereichs
 * (#119): Plakat-Rahmen aus `<Zettel>` (Optik wie der Positions-Dialog #117),
 * darin die Auswahlfelder, darunter die Zahlen der Auswahl und die Fußleiste
 * mit **PDF als gelbem Primärknopf** und Excel daneben.
 *
 * Beide Papiere fragen unterschiedliche Dinge, zeigen aber dieselben Zahlen und
 * dieselben Knöpfe — die stehen darum hier und nicht zweimal.
 */
const ExportZettel: React.FC<ExportZettelProps> = ({
	title,
	children,
	summary,
	onPdf,
	onExcel,
	onCancel,
	TitleTag
}) => {
	const nothing = summary.positionCount === 0 || summary.fileCount === 0;

	return (
		<Zettel
			title={title}
			TitleTag={TitleTag}
			onClose={onCancel}
			footer={
				<>
					<Button variant="outline" className={ZETTEL_FOCUS} onClick={onCancel}>
						Abbrechen
					</Button>
					<Button
						data-export="excel"
						variant="outline"
						className={ZETTEL_FOCUS}
						disabled={nothing}
						onClick={onExcel}>
						Excel
					</Button>
					<Button
						data-export="pdf"
						className={ZETTEL_FOCUS}
						disabled={nothing}
						onClick={onPdf}>
						PDF drucken
					</Button>
				</>
			}>
			<div className="grid grid-cols-1 gap-3.5 px-4 py-4 min-[900px]:grid-cols-2">{children}</div>

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-tinte bg-white px-4 py-3">
				{nothing ? (
					<p className="text-xs text-tinte-soft">Nichts zu exportieren</p>
				) : (
					<>
						<p className="text-xs text-tinte-soft">
							{summary.positionCount}{' '}
							{summary.positionCount === 1 ? 'Position' : 'Positionen'}
							{summary.fileCount > 1 && ` · ${summary.fileCount} Dateien`}
						</p>
						<Figure label="Bestellt €">{formatEuro(summary.ordered)}</Figure>
						{summary.consumed != null && (
							<Figure label="Verbraucht €">{formatEuro(summary.consumed)}</Figure>
						)}
						{summary.withoutPrice > 0 && (
							<Stamp tone="red" size="sm" tilt="none">
								{summary.withoutPrice} ohne Preis
							</Stamp>
						)}
					</>
				)}
			</div>
		</Zettel>
	);
};

/** Eine Geldzahl der Auswahl — formgleich mit dem Bereichskopf (#113), damit
Bildschirm und Papier dieselbe Zahl unter derselben Beschriftung zeigen. */
const Figure: React.FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
	<div>
		<p className="text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
			{label}
		</p>
		<p className="font-display text-[17px] font-semibold leading-none tabular-nums text-gruen">
			{children}
		</p>
	</div>
);

export default ExportZettel;
