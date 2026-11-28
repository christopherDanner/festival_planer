import React, { useEffect, useRef, useState } from 'react';
import { canApplyZettel, type Zettel, type ZettelInput } from '@/lib/sponsoringZettel';
import {
	ZETTEL_AMOUNT_FIELD,
	ZETTEL_BUTTON,
	ZETTEL_FIELD,
	ZETTEL_HINT,
	ZETTEL_SHEET,
	ZETTEL_TITLE
} from '@/components/sponsoring/zettelLook';

export interface SponsoringZettelProps {
	zettel: Zettel;
	/** „Übernehmen" — der einzige Weg, der einen Wert schreibt. */
	onApply: (input: ZettelInput) => void;
	/** „Entfernen" — der einzige Weg, der einen Wert löscht (ADR 0009). */
	onRemove: () => void;
	/**
	 * `popover` (Standard): der schwebende Zettel an der Matrix-Zelle.
	 * `sheet`: der Zettel im Blatt von unten am Handy (#155) — volle Breite,
	 * den Rahmen trägt das Blatt, und jedes Feld und jeder Knopf ist ≥ 40px
	 * hoch (Vision §6). Inhalt und Regeln sind dieselben.
	 */
	variant?: 'popover' | 'sheet';
}

/* Die Handy-Fassung: Felder und Knöpfe auf 40px, die Knöpfe teilen sich die
Breite — getroffen wird mit dem Daumen. */
const SHEET_FORM = 'w-full px-4 pb-5 pt-3';
const SHEET_FIELD = 'min-h-10 text-[15px]';
const SHEET_BUTTON = 'min-h-10 flex-1 text-[12.5px]';

/**
 * Der Zettel: ein Klick auf eine Zelle der Sponsoring-Matrix öffnet ihn mit
 * vorbelegtem, selektiertem Wertfeld (ADR 0009). Rein darstellend — was er
 * beim Öffnen zeigt und was er schreibt, entscheidet `sponsoringZettel`.
 *
 * Er schwebt frei über der Tabelle und verdeckt dabei die Folgezeile; das ist
 * ausdrücklich abgenommen. Platzierung, Schließen und Fokus-Rückgabe besorgt
 * der Popover der Matrix.
 */
const SponsoringZettel: React.FC<SponsoringZettelProps> = ({
	zettel,
	onApply,
	onRemove,
	variant = 'popover'
}) => {
	const sheet = variant === 'sheet';
	const field = sheet ? ` ${SHEET_FIELD}` : '';
	const button = sheet ? ` ${SHEET_BUTTON}` : '';
	const hasDescription = zettel.descriptionInput != null;
	const [value, setValue] = useState(zettel.valueInput);
	const [description, setDescription] = useState(zettel.descriptionInput ?? '');
	const amountRef = useRef<HTMLInputElement>(null);
	const descriptionRef = useRef<HTMLInputElement>(null);

	/* Vorbelegt *und* selektiert: Übernehmen ohne Tippen weist den Standardwert
	zu, Tippen ersetzt ihn ohne Löschen. Bei der Sachleistung beginnt der Fokus
	in der Bezeichnung — ohne sie gibt es nichts zu speichern. Nur beim Öffnen:
	die Matrix gibt dem Zettel je Zelle einen eigenen `key`. */
	useEffect(() => {
		const input = hasDescription ? descriptionRef.current : amountRef.current;
		input?.focus();
		input?.select();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<form
			aria-label={`Zettel ${zettel.title}`}
			className={sheet ? SHEET_FORM : ZETTEL_SHEET}
			onSubmit={(e) => {
				e.preventDefault();
				onApply({ value, description });
			}}
		>
			<div className={ZETTEL_TITLE}>
				{zettel.title}
				{/* Leere und belegte Zelle zeigen dasselbe Feld — den Unterschied
				macht diese Zeile, nicht nur der fehlende Entfernen-Knopf (ADR 0009). */}
				{zettel.stateLabel && (
					<span className="ml-1.5 font-bold normal-case tracking-normal">
						· {zettel.stateLabel}
					</span>
				)}
			</div>

			{hasDescription && (
				<input
					ref={descriptionRef}
					className={`${ZETTEL_FIELD} mb-1.5${field}`}
					aria-label="Bezeichnung"
					placeholder="Bezeichnung"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			)}

			<input
				ref={amountRef}
				className={`${ZETTEL_AMOUNT_FIELD}${field}`}
				aria-label={hasDescription ? 'Schätzwert' : 'Betrag'}
				inputMode="decimal"
				placeholder={hasDescription ? 'Schätzwert €' : 'Betrag'}
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>

			<div className={ZETTEL_HINT}>{zettel.hint}</div>

			<div className="mt-2 flex gap-1.5">
				<button
					type="submit"
					className={`${ZETTEL_BUTTON} bg-tinte text-papier disabled:opacity-40${button}`}
					disabled={!canApplyZettel(zettel, { value, description })}
				>
					Übernehmen
				</button>
				{/* Entfernen ist nie ein Nebeneffekt des Klicks — es hat einen eigenen,
				benannten Knopf und gibt es nur, wo etwas zu entfernen ist (ADR 0009). */}
				{zettel.recorded && (
					<button type="button" className={`${ZETTEL_BUTTON} bg-white text-rot${button}`} onClick={onRemove}>
						Entfernen
					</button>
				)}
			</div>
		</form>
	);
};

export default SponsoringZettel;
