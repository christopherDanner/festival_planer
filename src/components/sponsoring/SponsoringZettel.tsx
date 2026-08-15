import React, { useEffect, useRef, useState } from 'react';
import type { Zettel, ZettelInput } from '@/lib/sponsoringZettel';

export interface SponsoringZettelProps {
	zettel: Zettel;
	/** „Übernehmen" — der einzige Weg, der einen Wert schreibt. */
	onApply: (input: ZettelInput) => void;
	/** „Entfernen" — der einzige Weg, der einen Wert löscht (ADR 0009). */
	onRemove: () => void;
	/** Escape und Klick außerhalb: schließen, ohne zu speichern. */
	onClose: () => void;
}

/* Ein Platzhalter darf nicht wie ein Wert aussehen: blass und in normaler
Stärke. Im Entscheid-Prototyp stand der Standardwert als Platzhalter in
Wertschrift — eine nicht zugewiesene Kategorie sah aus wie eine zugewiesene
(ADR 0009, ausdrücklich kein Kosmetikpunkt). */
const FIELD =
	'w-full border-1.5 border-tinte bg-white px-2 py-1 text-[13px] outline-none placeholder:font-normal placeholder:text-tinte-soft focus:border-gruen';
const AMOUNT_FIELD = `${FIELD} text-right font-display font-semibold tabular-nums`;
const BUTTON =
	'border-1.5 border-tinte px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.05em]';

/**
 * Der Zettel: ein Klick auf eine Zelle der Sponsoring-Matrix öffnet ihn mit
 * vorbelegtem, selektiertem Wertfeld (ADR 0009). Rein darstellend — was er
 * beim Öffnen zeigt und was er schreibt, entscheidet `sponsoringZettel`.
 *
 * Er schwebt frei über der Tabelle und verdeckt dabei die Folgezeile; das ist
 * ausdrücklich abgenommen. Die Platzierung besorgt die Matrix.
 */
const SponsoringZettel: React.FC<SponsoringZettelProps> = ({
	zettel,
	onApply,
	onRemove,
	onClose
}) => {
	const hasDescription = zettel.descriptionInput != null;
	const [value, setValue] = useState(zettel.valueInput);
	const [description, setDescription] = useState(zettel.descriptionInput ?? '');
	const amountRef = useRef<HTMLInputElement>(null);
	const descriptionRef = useRef<HTMLInputElement>(null);

	/* Vorbelegt *und* selektiert: Übernehmen ohne Tippen weist den Standardwert
	zu, Tippen ersetzt ihn ohne Löschen. Nur beim Öffnen — die Matrix gibt dem
	Zettel je Zelle einen eigenen `key`. */
	useEffect(() => {
		const field = hasDescription ? descriptionRef.current : amountRef.current;
		field?.focus();
		field?.select();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<form
			aria-label={`Zettel ${zettel.title}`}
			className="w-[205px] border-2.5 border-tinte bg-papier p-2.5 shadow-versatz"
			onSubmit={(e) => {
				e.preventDefault();
				onApply({ value, description });
			}}
			onKeyDown={(e) => {
				if (e.key === 'Escape') onClose();
			}}
		>
			<div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
				{zettel.title}
			</div>

			{hasDescription && (
				<input
					ref={descriptionRef}
					className={`${FIELD} mb-1.5`}
					aria-label="Bezeichnung"
					placeholder="Bezeichnung"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			)}

			<input
				ref={amountRef}
				className={AMOUNT_FIELD}
				aria-label={hasDescription ? 'Schätzwert' : 'Betrag'}
				inputMode="decimal"
				placeholder={hasDescription ? 'Schätzwert €' : 'Betrag'}
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>

			<div className="mt-1.5 text-[11px] text-tinte-soft">{zettel.hint}</div>

			<div className="mt-2 flex gap-1.5">
				<button type="submit" className={`${BUTTON} bg-tinte text-papier`}>
					Übernehmen
				</button>
				{/* Entfernen ist nie ein Nebeneffekt des Klicks — es hat einen eigenen,
				benannten Knopf und gibt es nur, wo etwas zu entfernen ist (ADR 0009). */}
				{zettel.recorded && (
					<button type="button" className={`${BUTTON} bg-white text-rot`} onClick={onRemove}>
						Entfernen
					</button>
				)}
			</div>
		</form>
	);
};

export default SponsoringZettel;
