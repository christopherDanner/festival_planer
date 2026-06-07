# 0001 — Gemeinsamer Arbeitsbereich, gegated über Kontovergabe

Status: Accepted
Datum: 2026-06-07

## Kontext

Die App lief bisher mit einem hartkodierten Auto-Login (`AuthProvider.tsx`): bestand keine Session, wurde automatisch ein fixer Account eingeloggt. Effektiv gab es keinen Zugangsschutz, und die Zugangsdaten lagen im Git-Verlauf. RLS war pro Eigentümer modelliert (`festivals.user_id = auth.uid()`, Kindtabellen über den Fest-Eigentümer).

Gewünscht: echter Login-Gate, Zugang nur für bestimmte Leute. Beim Durchsprechen kristallisierte sich heraus, dass die Gruppe gemeinsam an denselben Festen plant — die Pro-Eigentümer-Trennung war nie gewollt, sondern Nebenwirkung des Standard-Templates.

## Entscheidung

1. **Gemeinsamer Arbeitsbereich.** Ein geteilter Datenbestand, keine Pro-Benutzer-Trennung. RLS über alle Tabellen:
   - SELECT / INSERT / UPDATE: jeder authentifizierte Benutzer.
   - DELETE: nur Ersteller (`user_id = auth.uid()`).
   - INSERT setzt `user_id = auth.uid()` (nur noch Ersteller-Nachweis fürs Löschen, kein Sichtbarkeits-Marker).
2. **Auth per E-Mail + Passwort** (Supabase Auth).
3. **Selbstregistrierung deaktiviert.** Konten werden manuell im Supabase-Dashboard angelegt. Das ist der Gatekeeper für "nur bestimmte Leute".
4. **Auto-Login-Backdoor entfernt.** Hartkodierte Zugangsdaten raus; `signUp`/„Registrieren"-Tab entfernt; Routen außer `/auth` erfordern Authentifizierung.

## Konsequenzen

- RLS muss auf **allen** Tabellen umgeschrieben werden, nicht nur `festivals` — Kindtabellen (materials, stations, magic_links, member_preferences, …) prüften bisher den Fest-Eigentümer und würden sonst geteilte Daten verbergen.
- Kein Pro-Benutzer-Datenschutz: jeder eingeloggte Benutzer sieht alles. Akzeptabel für kleine, vertraute Gruppe; bei Wachstum neu bewerten.
- Magic-Link-Flow für *Mitglieder* (tokenbasiert, ohne Login) bleibt öffentlich und unberührt — er hängt nicht an Benutzer-Auth.
- **Offen / Sicherheit:** Die im Git-Verlauf offengelegten Zugangsdaten des Alt-Accounts müssen rotiert werden (Passwort ändern), Entfernen aus dem Code genügt nicht.
- Begriffe *Benutzer* vs. *Mitglied* sind in CONTEXT.md geschärft.

## Verworfene Alternativen

- **Pro-Benutzer-Daten beibehalten** — widerspricht der gemeinsamen Planung; jeder müsste Feste duplizieren.
- **Allowlist-/Einladungs-Registrierung** — mehr Code (Allowlist-Tabelle bzw. Invite-Tokens/Mailversand) ohne Mehrwert bei einer kleinen, bekannten Gruppe. Manuelles Anlegen genügt.
- **DELETE für alle erlauben** — verworfen; Löschen ist destruktiv, daher auf den Ersteller beschränkt.
