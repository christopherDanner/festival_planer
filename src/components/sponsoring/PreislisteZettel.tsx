import React, { useEffect, useRef, useState } from 'react';
import {
	canApplyCategoryZettel,
	type CategoryZettel,
	type CategoryZettelInput
} from '@/lib/sponsoringPreisliste';
import {
	ZETTEL_AMOUNT_FIELD,
	ZETTEL_BUTTON,
	ZETTEL_FIELD,
	ZETTEL_HINT,
	ZETTEL_SHEET,
	ZETTEL_TITLE
} from '@/components/sponsoring/zettelLook';

export interface PreislisteZettelProps {
	zettel: CategoryZettel;
	/** „Übernehmen" — legt die Kategorie an oder schreibt Name und Standardwert. */
	onApply: (input: CategoryZettelInput) => void;
	/**
	 * „Kategorie löschen" — erst nach der bezifferten Rückfrage (ADR 0009).
	 * Entfällt beim Anlegen: dort gibt es nichts zu löschen, und dann zeigt der
	 * Zettel den Knopf auch nicht.
	 */
	onDelete?: () => void;
}

/**
 * Der Zettel der *Preisliste*: ein Klick auf den Kategorie-Spaltenkopf öffnet
 * ihn mit Name und Standardwert, „+ KATEGORIE" öffnet ihn leer (ADR 0009). Er
 * ersetzt die frühere zweite Tabelle „Sponsoring-Kategorien" samt eigenem
 * Dialog — der Bereich hat danach genau eine Tabelle.
 *
 * Rein darstellend bis auf die Rückfrage: *was* er zeigt und *was* der
 * Löschen-Satz beziffert, entscheidet `sponsoringPreisliste`. Platzierung,
 * Schließen und Fokus-Rückgabe besorgt der Popover des Aufrufers.
 */
const PreislisteZettel: React.FC<PreislisteZettelProps> = ({ zettel, onApply, onDelete }) => {
	const [name, setName] = useState(zettel.nameInput);
	const [value, setValue] = useState(zettel.valueInput);
	const nameRef = useRef<HTMLInputElement>(null);

	/* Der Fokus beginnt im Namen: umbenennen ist der Vorgang, der ohne Tippen
	nicht geht, und der vorbelegte Name ist selektiert, damit er sich ersetzen
	lässt. Nur beim Öffnen — je Kopf gibt es einen eigenen `key`. */
	useEffect(() => {
		nameRef.current?.focus();
		nameRef.current?.select();
	}, []);

	return (
		<form
			aria-label={`Zettel ${zettel.title}`}
			className={ZETTEL_SHEET}
			onSubmit={(e) => {
				e.preventDefault();
				onApply({ name, value });
			}}
		>
			<div className={ZETTEL_TITLE}>{zettel.title}</div>

			<input
				ref={nameRef}
				className={`${ZETTEL_FIELD} mb-1.5`}
				aria-label="Name"
				placeholder="Bezeichnung"
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>

			<input
				className={ZETTEL_AMOUNT_FIELD}
				aria-label="Standardwert"
				inputMode="decimal"
				placeholder="Standardwert €"
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>

			<div className={ZETTEL_HINT}>{zettel.hint}</div>

			<div className="mt-2 flex gap-1.5">
				<button
					type="submit"
					className={`${ZETTEL_BUTTON} bg-tinte text-papier disabled:opacity-40`}
					disabled={!canApplyCategoryZettel({ name, value })}
				>
					Übernehmen
				</button>
			</div>

			{/* Löschen ist der einzige destruktive Eintrag und steht darum abgesetzt
			unter einem Strich, nicht neben „Übernehmen" (#149). Die Rückfrage nennt
			die Zuweisungen, die die Cascade mitreißt — ohne Zahl wäre das eine
			unbezifferte Katastrophe (ADR 0009). */}
			{zettel.deleteMessage && onDelete && (
				<div className="mt-2 border-t border-linie pt-2">
					<button
						type="button"
						className="text-[11px] font-bold uppercase tracking-[.05em] text-rot"
						onClick={() => {
							if (!confirm(zettel.deleteMessage as string)) return;
							onDelete();
						}}
					>
						Kategorie löschen
					</button>
				</div>
			)}
		</form>
	);
};

export default PreislisteZettel;
