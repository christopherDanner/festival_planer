import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/components/AuthProvider';
import Anmeldezettel from '@/components/auth/Anmeldezettel';
import { useToast } from '@/hooks/use-toast';

/** Fehlende Eingabe wird am Feld beanstandet, nicht im Toast (#161). */
const UNVOLLSTAENDIG = 'Bitte Email und Passwort eingeben.';

/**
 * Anmeldung (`/auth`) — seit #90 das erste und einzige Bild vor dem Login.
 * Papier-Grund, mittig der Anmeldezettel (Variante A1, Entscheid #101); die
 * Seite hält nur die Eingaben und den Weg zum `AuthProvider`.
 *
 * Erfolg meldet sich nicht: der Toast erschien eine Zehntelsekunde vor dem
 * Seitenwechsel. Der Fehler-Toast bleibt — er erklärt etwas.
 */
export default function Auth() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [fieldError, setFieldError] = useState<string | null>(null);
	const { signIn, user } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	useEffect(() => {
		if (user) {
			navigate('/dashboard');
		}
	}, [user, navigate]);

	const handleSignIn = async () => {
		if (!email || !password) {
			setFieldError(UNVOLLSTAENDIG);
			return;
		}
		setFieldError(null);

		setLoading(true);
		const { error } = await signIn(email, password);
		setLoading(false);

		if (error) {
			toast({
				title: 'Anmeldung fehlgeschlagen',
				description: error.message,
				variant: 'destructive'
			});
			return;
		}
		navigate('/dashboard');
	};

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Anmeldezettel
				email={email}
				password={password}
				loading={loading}
				fieldError={fieldError}
				onEmailChange={setEmail}
				onPasswordChange={setPassword}
				onSubmit={handleSignIn}
			/>
		</div>
	);
}
