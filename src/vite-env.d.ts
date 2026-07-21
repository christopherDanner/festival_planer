/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Dev-Auto-Login: E-Mail eines (Test-)Kontos. Nur im Dev-Build ausgewertet. */
	readonly VITE_DEV_AUTH_EMAIL?: string;
	/** Dev-Auto-Login: Passwort zum Konto oben. Nur im Dev-Build ausgewertet. */
	readonly VITE_DEV_AUTH_PASSWORD?: string;
}
