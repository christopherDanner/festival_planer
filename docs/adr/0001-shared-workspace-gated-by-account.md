# 0001 — Gemeinsamer Arbeitsbereich, gegated über Kontovergabe

Status: Accepted (DELETE-Regeln aus Entscheidung 1 + 1a superseded durch ADR 0002 — nur `festivals` bleibt creator-only)
Datum: 2026-06-07

## Kontext

Die App lief bisher mit einem hartkodierten Auto-Login (`AuthProvider.tsx`): bestand keine Session, wurde automatisch ein fixer Account eingeloggt. Effektiv gab es keinen Zugangsschutz, und die Zugangsdaten lagen im Git-Verlauf. RLS war pro Eigentümer modelliert (`festivals.user_id = auth.uid()`, Kindtabellen über den Fest-Eigentümer).

Gewünscht: echter Login-Gate, Zugang nur für bestimmte Leute. Beim Durchsprechen kristallisierte sich heraus, dass die Gruppe gemeinsam an denselben Festen plant — die Pro-Eigentümer-Trennung war nie gewollt, sondern Nebenwirkung des Standard-Templates.

## Entscheidung

1. **Gemeinsamer Arbeitsbereich.** Ein geteilter Datenbestand, keine Pro-Benutzer-Trennung. RLS über alle Tabellen:
   - SELECT / INSERT / UPDATE: jeder authentifizierte Benutzer.
   - DELETE: nur Ersteller (`user_id = auth.uid()`).
   - INSERT setzt `user_id = auth.uid()` (nur noch Ersteller-Nachweis fürs Löschen, kein Sichtbarkeits-Marker).
1a. **Kind-Tabellen-DELETE — Variante (a) (Issue #21).** Kindtabellen haben kein eigenes `user_id`, sie hängen über `festival_id` am Fest. DELETE auf einer Kindtabelle ist nur erlaubt, wenn der aktuelle Benutzer **Ersteller des zugehörigen Fests** ist: `festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid())`. Bewusst in Kauf genommene Inkonsistenz: ein Kollaborator darf eine Kind-Position *bearbeiten*, aber nicht *löschen*. Begründung: Löschen ist durchgängig — Fest wie Kind — eine Ersteller-Operation; der Löschschutz soll überall beim Ersteller liegen. Variante (b) (Kind-DELETE für alle Eingeloggten) wäre konsistenter mit UPDATE, schwächt aber genau diesen Schutz auf und wurde daher verworfen. **(Superseded durch ADR 0002: Variante (b) wurde später doch gewählt — DELETE ist für alle Tabellen außer `festivals` offen.)**

   Betroffene Kindtabellen (festival_id-basiert, von der Migration abgedeckt): `stations`, `station_shifts`, `station_members`, `shift_assignments`, `station_shift_assignments`, `festival_member_preferences`, `festival_materials`, `schedule_days`, `schedule_phases`, `schedule_entries`, `magic_links`, `member_preferences`. `members` trägt ein eigenes `user_id` und wird wie `festivals` behandelt (DELETE = Ersteller).
2. **Auth per E-Mail + Passwort** (Supabase Auth).
3. **Selbstregistrierung deaktiviert.** Konten werden manuell im Supabase-Dashboard angelegt. Das ist der Gatekeeper für "nur bestimmte Leute".
4. **Auto-Login-Backdoor entfernt.** Hartkodierte Zugangsdaten raus; `signUp`/„Registrieren"-Tab entfernt; Routen außer `/auth` erfordern Authentifizierung. **(Ergänzt durch ADR 0004: ein dev-only Auto-Login über gitignored `.env.local` ist wieder erlaubt — ohne hartkodierte Creds und ohne Schwächung des Prod-Gates.)**

## Konsequenzen

- RLS muss auf **allen** Tabellen umgeschrieben werden, nicht nur `festivals` — Kindtabellen (materials, stations, magic_links, member_preferences, …) prüften bisher den Fest-Eigentümer und würden sonst geteilte Daten verbergen.
- Kein Pro-Benutzer-Datenschutz: jeder eingeloggte Benutzer sieht alles. Akzeptabel für kleine, vertraute Gruppe; bei Wachstum neu bewerten.
- Magic-Link-Flow für *Mitglieder* (tokenbasiert, ohne Login) bleibt öffentlich und unberührt — er hängt nicht an Benutzer-Auth.
- **Offen / Sicherheit (Issue #22, manuell):** Die im Git-Verlauf offengelegten Zugangsdaten des Alt-Accounts `chr.danner1994@gmail.com` müssen im Supabase-Dashboard rotiert werden (Passwort ändern). Das Entfernen aus dem Code (siehe Punkt 4) un-leakt den Git-Verlauf **nicht**. Diese Aktion ist nicht automatisierbar und bleibt offen, bis sie im Dashboard erledigt ist.
- Begriffe *Benutzer* vs. *Mitglied* sind in CONTEXT.md geschärft.

## Verworfene Alternativen

- **Pro-Benutzer-Daten beibehalten** — widerspricht der gemeinsamen Planung; jeder müsste Feste duplizieren.
- **Allowlist-/Einladungs-Registrierung** — mehr Code (Allowlist-Tabelle bzw. Invite-Tokens/Mailversand) ohne Mehrwert bei einer kleinen, bekannten Gruppe. Manuelles Anlegen genügt.
- **DELETE für alle erlauben** — verworfen; Löschen ist destruktiv, daher auf den Ersteller beschränkt. (Revidiert durch ADR 0002: DELETE ist jetzt für alle offen, nur `festivals` bleibt creator-only.)
