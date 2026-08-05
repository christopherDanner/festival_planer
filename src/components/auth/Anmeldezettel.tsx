import { type FormEvent } from 'react';

import { Mast } from '@/components/toolkit/Mast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AnmeldezettelProps {
	email: string;
	password: string;
	/** Läuft die Anmeldung gerade? Dann ist der Knopf gesperrt. */
	loading: boolean;
	/** Meldung an den Feldern (fehlende Eingabe); `null` heißt: alles in Ordnung. */
	fieldError: string | null;
	onEmailChange: (value: string) => void;
	onPasswordChange: (value: string) => void;
	onSubmit: () => void;
}

/** Verankerung der Feldmeldung — beide Felder zeigen auf denselben Satz. */
const FEHLER_ID = 'anmeldung-fehler';

/**
 * Anmeldezettel — Variante A1 aus `design-vision/entscheid-anmeldung-notfound.html`
 * (Entscheid #101): Zettel auf Papier mit hartem Versatz-Schatten, grüner
 * Halftone-Kopf als kleines Zitat des Masts, Formular in der
 * Formular-Handschrift (DESIGN-VISION §4).
 *
 * Der Wordmark im Kopf ist bewusst kein Klickweg: vor der Anmeldung gibt es
 * kein Davor. Die Fußnote nennt nur Wege, die der `AuthProvider` hat — kein
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

	const feldZustand = {
		'aria-invalid': fieldError ? (true as const) : undefined,
		'aria-describedby': fieldError ? FEHLER_ID : undefined
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="w-full max-w-[340px] border-2.5 border-tinte bg-white shadow-versatz">
			<Mast title="Anmelden" compact className="border-x-0 border-t-0" />
			<div className="px-4 pb-4 pt-4">
				<div className="mb-3">
					<Label htmlFor="anmeldung-email" className="mb-1 block">
						Email
					</Label>
					<Input
						id="anmeldung-email"
						type="email"
						autoComplete="username"
						value={email}
						onChange={(e) => onEmailChange(e.target.value)}
						className="text-[13.5px]"
						{...feldZustand}
					/>
				</div>
				<div className="mb-3">
					<Label htmlFor="anmeldung-passwort" className="mb-1 block">
						Passwort
					</Label>
					<Input
						id="anmeldung-passwort"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={(e) => onPasswordChange(e.target.value)}
						className="text-[13.5px]"
						{...feldZustand}
					/>
				</div>
				{fieldError && (
					<p id={FEHLER_ID} className="mb-3 text-[11.5px] font-semibold text-rot">
						{fieldError}
					</p>
				)}
				<Button type="submit" disabled={loading} className="w-full uppercase tracking-[.05em]">
					{loading ? 'Anmelden …' : 'Anmelden'}
				</Button>
				<p className="mt-2.5 text-[11.5px] leading-[1.5] text-tinte-soft">
					Zugänge legt die Festleitung an. Passwort vergessen? Bei der Festleitung melden.
				</p>
			</div>
		</form>
	);
}
