# Domain Context — Festmeister Österreich

Begriffsglossar des Projekts. Wird gepflegt wenn neue fachliche Begriffe auftauchen oder bestehende geschärft werden.

---

## Fest / Festival

Eine zeitlich begrenzte Veranstaltung, für die geplant, eingeteilt, eingekauft und abgerechnet wird. Im Code: `festivals`. Mehrere Feste existieren nebeneinander, oft ein neues pro Jahr (z.B. "Stadlfest 2024", "Stadlfest 2026"). Alle Feste liegen in **einem gemeinsamen Arbeitsbereich** — sie sind nicht pro Benutzer getrennt (siehe *Gemeinsamer Arbeitsbereich* und ADR 0001).

## Gemeinsamer Arbeitsbereich

Festmeister hat **einen einzigen, geteilten Datenbestand** — keine Mandanten- oder Pro-Benutzer-Trennung. Jeder angemeldete Benutzer sieht und bearbeitet dieselben Feste, Stationen, Materiallisten usw. Begründung: kleine, vertraute Gruppe, die gemeinsam an denselben Festen plant. Zugangskontrolle passiert allein über *wer ein Konto bekommt* (siehe *Benutzer*), nicht über Datensichtbarkeit. Entscheidung dokumentiert in ADR 0001.

Konsequenz für die DB (RLS): SELECT/INSERT/UPDATE für jeden authentifizierten Benutzer. **DELETE** richtet sich nach der Tragweite (Blast-Radius, siehe ADR 0002):

- **Container** (ganzes Fest, Station, Mitglied) — Löschen ist katastrophal und bleibt auf den Ersteller (`user_id = auth.uid()`) beschränkt.
- **Line-Items** (Material-Position, Ablauf-Tage/-Phasen/-Einträge) — routinemäßiges Löschen; jeder authentifizierte Benutzer darf löschen, dasselbe Prädikat wie SELECT/UPDATE.

`user_id` auf einem Fest ist daher kein Besitz-/Sichtbarkeits-Marker mehr, sondern nur noch Ersteller-Nachweis fürs Löschen von Containern.

## Benutzer

Login-Konto eines Organisators (Supabase Auth, E-Mail + Passwort). Benutzer planen Feste im *gemeinsamen Arbeitsbereich*. **Selbstregistrierung ist deaktiviert** — Konten werden manuell im Supabase-Dashboard angelegt. Das gatekeept den Zugang ("nur bestimmte Leute").

Nicht zu verwechseln mit *Mitglied*: Ein Benutzer hat ein Login und Vollzugriff; ein Mitglied hat kein Login.

## Mitglied

Helfer/Freiwilliger, der bei einem Fest eingeteilt wird (`members`). Ein Mitglied ist **kein** Login-Benutzer — es gibt Präferenzen (Stationen, Schichten) typischerweise über einen tokenbasierten Magic-Link ohne Anmeldung ab (`magic_links`, `member_preferences`). Klar abgrenzen: *Benutzer* = Organisator mit Login, *Mitglied* = einzuteilende Person ohne Login.

## Material-Übernahme

Vorgang, Material-Positionen und Bestellmengen aus einem vergangenen Fest als Referenz für ein neues Fest zu nutzen. Ziel: Aufwand bei der Bestellplanung sparen, weil Mengen aus dem Vorjahr bekannt sind.

Im Workflow stehen sich zwei Rollen gegenüber:

- **Quellfest** — vergangenes Fest, aus dem die Referenzwerte (bestellte und verbrauchte Mengen pro Position) gezogen werden.
- **Zielfest** — Fest, das gerade geplant wird; das aktuelle Fest in der Material-Liste. Hier werden neue Bestellmengen gesetzt.

Match zwischen Quell- und Zielfest-Positionen läuft per Name (case-insensitive, trimmed). Eine Position kann dadurch sein:

- **In beiden Festen** (Overlap) — Update der Bestellmenge im Zielfest.
- **Nur im Quellfest** — wird im Zielfest neu angelegt, wenn der User eine Wunschmenge einträgt.
- **Nur im Zielfest** — keine Quell-Referenz, Bestellmenge wird gesetzt wie bei jeder anderen Position.

## Material-Position

Ein einzelnes Material, das pro Fest geführt wird (`festival_materials`). Wesentliche Eigenschaften:

- **Bestellt-Menge** (`ordered_quantity`) — geplante/bestellte Menge fürs Fest. Wird vor dem Fest gesetzt.
- **Verbraucht-Menge** (`actual_quantity`) — tatsächlich verbrauchte Menge. Wird typisch nach dem Fest nachgepflegt.
- **Wunschmenge** — UI-Begriff aus der Material-Übernahme-Maske: gewünschte Bestellmenge fürs Zielfest. Beim Speichern wird sie zur `ordered_quantity` der Position im Zielfest.

Eine Position ist einer Station zugeordnet (oder keiner). Stations-Mapping zwischen zwei Festen läuft per Stationsname.

## Station

Funktionale Einheit innerhalb eines Festes (`stations`), z.B. "Bar", "Küche", "Kassa". Stationen sind pro Fest definiert, werden aber bei der Material-Übernahme per Name zwischen Festen gemappt.

## Lieferant

Bezugsquelle einer Material-Position (`supplier`, Freitext pro Position, kann leer sein). Dient als Gruppierungsachse beim Erstellen von Bestelllisten — alle Positionen mit demselben Lieferanten ergeben eine Bestellung. Positionen ohne Lieferanten bilden die Gruppe "Kein Lieferant".

## Materialliste vs. Bestellliste

Zwei verschiedene Exporte mit unterschiedlichem Zweck:

- **Materialliste** — Planungs-/Referenzliste. Zeigt pro Position Bestellt- und Verbraucht-Menge plus eine leere "Neue Menge"-Spalte zum händischen Ausfüllen. Dient der Bestellplanung fürs kommende Fest.
- **Bestellliste** — die tatsächliche Bestellung. Gruppiert nach Lieferant oder Station, enthält nur Positionen mit Bestellmenge (`ordered_quantity`) > 0, reduziert auf Bezeichnung + Menge + Einheit. Dient als Bestellung, die an einen Lieferanten gegeben bzw. an einer Station gebraucht wird.

## Sponsor

Firma/Person, die ein Fest finanziell oder als Sachleistung unterstützt. **Globale, wiederverwendbare Stammdaten** (wie *Mitglied*, nicht pro Fest) — eine Firma wird einmal angelegt und über Feste hinweg verknüpft. Felder: Firmenname, Ansprechpartner, Email, Telefon, Adresse, Website, Notizen. Dass ein Sponsor global lebt, ermöglicht die *Wiederkontaktierung* ohne Kopieren.
_Avoid_: Firma (als eigener Begriff — Firma und Sponsor sind hier dasselbe), Gönner.

## Sponsoring-Kategorie

Eine benannte Sponsoring-Leistung mit einem Wert, z.B. "Werbeplakat", "Social-Media-Beitrag", "Logo in Speisekarte". **Pro Fest definiert** (Name + Wert), weil der Wert je Jahr variieren kann.
_Avoid_: Paket, Leistung, Sponsoring-Stufe.

## Sponsoring

Die Verknüpfung *eines* Sponsors mit *einem* Fest — was diese Firma bei diesem Fest beiträgt. Besteht aus beliebig vielen zugewiesenen *Sponsoring-Kategorien* (der Wert je Zuweisung ist pro Sponsor überschreibbar, Default = Kategorie-Wert) plus optional **einem** freien Betrag. Gesamtbeitrag = Summe der Kategorie-Werte + Freibetrag. **Kein Status/Lebenszyklus** — ein Sponsor ist bei einem Fest entweder erfasst oder nicht.
_Avoid_: Sponsoren-Beitrag, Deal.

## Sponsor-Übernahme

Vorgang, Sponsoren eines vergangenen Fests (Quellfest) in ein neues Fest (Zielfest) zu übernehmen. Weil *Sponsoren* global sind, wird der Sponsor selbst nur verknüpft, nicht kopiert. *Sponsoring-Kategorien* werden per Namen gemappt (gleichnamige Kategorie im Zielfest wird verknüpft, fehlende wird mit dem Vorjahreswert als Vorschlag neu angelegt) — analog zur *Material-Übernahme*. Freibetrag wird mitübernommen.
_Avoid_: Reaktivierung.

## Wiederkontaktierung

Fachliches Ziel hinter der *Sponsor-Übernahme*: vergangene Sponsoren fürs neue Fest erneut anfragen. Der **automatisierte Email-Versand ist bewusst (noch) nicht Teil des Funktionsumfangs** — es gibt keine Versand-Infrastruktur (siehe AI_INTEGRATION.md: nur client-seitiges Mistral, keine Edge Functions). Aktuell deckt die *Sponsor-Übernahme* den Vorgang ab; Mailversand kann später andocken.
_Avoid_: Follow-up.

## Sponsoring-Übersicht

Auswertung pro Fest: alle erfassten *Sponsoren* mit ihren Kategorien/Freibeträgen und die Gesamtsumme des Sponsorings für dieses Fest.
_Avoid_: Sponsorenliste (mehrdeutig — kann auch die globalen Stammdaten meinen).
