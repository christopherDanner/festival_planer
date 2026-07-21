# 0004 — Dev-Auto-Login über gitignored `.env.local`

Status: Accepted (ergänzt ADR 0001 Punkt 4 — der dortige Auto-Login-Ausschluss gilt weiter für Prod und für hartkodierte Zugangsdaten)
Datum: 2026-07-21

## Kontext

ADR 0001 Punkt 4 hat die alte Auto-Login-Backdoor entfernt: Zuvor loggte `AuthProvider.tsx` ohne Session automatisch einen **hartkodierten** Account ein, dessen Zugangsdaten im Git-Verlauf lagen — effektiv kein Zugangsschutz. Zu Recht raus.

Nebenwirkung: Geschützte Routen (Dashboard/Festplakat, Schichtplan, …) sind lokal und headless nur nach manuellem Login sichtbar. Für Entwicklung und agentengetriebene visuelle Validierung (Screenshots von UI-Änderungen) ist das umständlich; ein Agent darf zudem kein Passwort in ein Formular tippen.

Gewünscht: lokal ohne manuellen Login arbeiten, **ohne** die Fehler der alten Backdoor zu wiederholen (keine Creds im Repo, kein geschwächtes Prod-Gate).

## Entscheidung

Dev-only Auto-Login in `AuthProvider.tsx`:

1. **Nur im Dev-Build.** Greift ausschließlich bei `import.meta.env.DEV && import.meta.env.MODE !== 'test'`. Im Prod-Build ist `DEV` false → der Zweig wird wegoptimiert (tree-shaking); in Vitest (`MODE === 'test'`) bleibt er aus, damit Tests deterministisch sind.
2. **Zugangsdaten nur lokal.** Gelesen aus `VITE_DEV_AUTH_EMAIL` / `VITE_DEV_AUTH_PASSWORD` in **`.env.local`** (via `*.local` in `.gitignore` ausgeschlossen — nie committet). Keine Creds im Code, kein Fallback-Account.
3. **Opt-in.** Sind die Variablen leer/ungesetzt, läuft der normale Login-Flow. Der Auto-Login ist ein Komfort, keine Voraussetzung.
4. **Echter Login-Flow.** Es wird `supabase.auth.signInWithPassword` mit einem echten Konto aufgerufen — dadurch entsteht eine echte Session und RLS greift wie im Normalbetrieb (kein Mock/Bypass).

Abgrenzung zur entfernten Backdoor: dev-only statt immer, Creds lokal-gitignored statt hartkodiert-im-Verlauf, Prod-Gate unverändert.

## Konsequenzen

- Eingeloggte Routen sind lokal und headless sicht-/screenshotbar (Dev-Server neu starten, da Vite Env nur beim Start liest).
- Prod-Sicherheit unverändert: der Login-Gate aus ADR 0001 bleibt in Produktion voll wirksam.
- Wer den Komfort nutzt, sollte ein **dediziertes (Test-)Konto** hinterlegen, nicht das Alt-Konto `chr.danner1994@gmail.com` aus ADR 0001 (Issue #22, Rotation offen). Passwort steht lokal im Klartext in `.env.local` — akzeptabel, weil gitignored und dev-only.
- `.env` wurde zudem aus dem Git-Tracking genommen (Secrets gehören nicht ins Repo); Alt-Secrets im Git-Verlauf bleiben davon unberührt (spätere Rotation + History-Rewrite offen).

## Verworfene Alternativen

- **Route-Bypass + Fake-User** (ProtectedRoute im Dev überspringen) — verworfen: RLS blockt ohne echte Session weiterhin, das Dashboard bliebe datenlos. Kein realistisches Abbild.
- **Backdoor wieder hartkodieren** — der genau von ADR 0001 verworfene Weg; Creds im Repo/Bundle.
- **Test-Login-Endpoint / Seed-Session im Code** — mehr Fläche, ohne Mehrwert gegenüber einer lokalen `.env.local`-Variable.
