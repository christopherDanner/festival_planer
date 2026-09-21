import { type FormEvent } from 'react';

import { Poster } from '@/components/toolkit/Poster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AnmeldezettelProps {
	email: string;
	password: string;
	/** Läuft die Anmeldung gerade? Dann ist der Knopf gesperrt. */
	loading: boolean;
	/** Meldung an den leeren Feldern; `null` heißt: alles in Ordnung. */
	fieldError: string | null;
	onEmailChange: (value: string) => void;
	onPasswordChange: (value: string) => void;
	onSubmit: () => void;
}

/** Verankerung der Feldmeldung — nur beanstandete Felder zeigen darauf. */
const FEHLER_ID = 'anmeldung-fehler';

/**
 * Anmeldezettel — Variante A1 aus `design-vision/entscheid-anmeldung-notfound.html`
 * (Entscheid #101): Zettel auf Papier mit hartem Versatz-Schatten, grüner
 * Halftone-Kopf als kleines Zitat des Masts, Formular in der
 * Formular-Handschrift (DESIGN-VISION §4).
 *
 * Der Kopf ist absichtlich nicht der `<Mast>`, sondern die nackte
 * Halftone-Fläche: A1 setzt den Wordmark größer als „ANMELDEN", der Mast
 * dreht das Verhältnis um. Klickbar ist der Wordmark hier nicht — vor der
 * Anmeldung gibt es kein Davor.
 *
 * Die Fußnote nennt nur Wege, die der `AuthProvider` hat — kein
 * Passwort-Zurücksetzen, keine Registrierung (CONTEXT.md „Benutzer").
 */
export default function Anmeldezettel({
	email,
	password,
	loading,
	fieldError,
	onEmailChange,
	onPasswordChange,
	onSubmit
}: AnmeldezettelProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		// Enter im Feld landet hier — der Knopf ist nur der sichtbare Weg.
		event.preventDefault();
		onSubmit();
	};

	/* Die Meldung gilt der fehlenden Eingabe: beanstandet wird, was leer ist.
	Ein gefülltes Feld bliebe sonst „ungültig", obwohl an ihm nichts fehlt. */
	const feldZustand = (wert: string) =>
		fieldError && wert.trim() === ''
			? { 'aria-invalid': true as const, 'aria-describedby': FEHLER_ID }
			: {};

	return (
		<form
			onSubmit={handleSubmit}
			className="w-full max-w-[340px] border-2.5 border-tinte bg-white shadow-versatz">
			<Poster className="flex items-center gap-2.5 border-x-0 border-t-0 px-3.5 py-2.5">
				<span className="font-display font-semibold tracking-[.04em] text-gelb text-[15px]">
					FESTMEISTER
				</span>
				<h1 className="font-display text-[13px] font-semibold uppercase tracking-[.02em]">
					Anmelden
				</h1>
			</Poster>
			<div className="px-4 pb-4 pt-[15px]">
				<div className="mb-[11px]">
					<Label htmlFor="anmeldung-email" className="mb-1 block">
						Email
					</Label>
					<Input
						id="anmeldung-email"
						type="email"
						autoComplete="username"
						value={email}
						onChange={(e) => onEmailChange(e.target.value)}
						className="text-[13.5px] focus-visible:ring-offset-white"
						{...feldZustand(email)}
					/>
				</div>
				<div className="mb-[11px]">
					<Label htmlFor="anmeldung-passwort" className="mb-1 block">
						Passwort
					</Label>
					<Input
						id="anmeldung-passwort"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={(e) => onPasswordChange(e.target.value)}
						className="text-[13.5px] focus-visible:ring-offset-white"
						{...feldZustand(password)}
					/>
				</div>
				{fieldError && (
					<p id={FEHLER_ID} className="mb-[11px] text-[11.5px] font-semibold text-rot">
						{fieldError}
					</p>
				)}
				<Button
					type="submit"
					disabled={loading}
					className="w-full text-[13px] font-extrabold uppercase tracking-[.05em] focus-visible:ring-offset-white">
					{loading ? 'Anmelden …' : 'Anmelden'}
				</Button>
				<p className="mt-2.5 text-[11.5px] leading-[1.5] text-tinte-soft">
					Zugänge legt die Festleitung an. Passwort vergessen? Bei der Festleitung melden.
				</p>
			</div>
		</form>
	);
}
