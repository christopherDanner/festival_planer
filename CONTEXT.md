# Domain Context — Festmeister Österreich

Begriffsglossar des Projekts. Wird gepflegt wenn neue fachliche Begriffe auftauchen oder bestehende geschärft werden.

---

## Fest / Festival

Eine zeitlich begrenzte Veranstaltung, für die geplant, eingeteilt, eingekauft und abgerechnet wird. Im Code: `festivals`. Mehrere Feste existieren nebeneinander, oft ein neues pro Jahr (z.B. "Stadlfest 2024", "Stadlfest 2026"). Alle Feste liegen in **einem gemeinsamen Arbeitsbereich** — sie sind nicht pro Benutzer getrennt (siehe *Gemeinsamer Arbeitsbereich* und ADR 0001).

## Gemeinsamer Arbeitsbereich

Festmeister hat **einen einzigen, geteilten Datenbestand** — keine Mandanten- oder Pro-Benutzer-Trennung. Jeder angemeldete Benutzer sieht und bearbeitet dieselben Feste, Stationen, Materiallisten usw. Begründung: kleine, vertraute Gruppe, die gemeinsam an denselben Festen plant. Zugangskontrolle passiert allein über *wer ein Konto bekommt* (siehe *Benutzer*), nicht über Datensichtbarkeit. Entscheidung dokumentiert in ADR 0001.

Konsequenz für die DB (RLS): SELECT/INSERT/UPDATE für jeden authentifizierten Benutzer. **DELETE** richtet sich nach der Tragweite (Blast-Radius, siehe ADR 0002) — mit genau einer geschützten Grenze:

- **Ganzes Fest** (`festivals`) — Löschen ist katastrophal (Cascade über alle Kinddaten) und bleibt auf den Ersteller (`user_id = auth.uid()`) beschränkt.
- **Alles innerhalb eines Fests** (Stationen, Schichten, Helfer, Material-Positionen, Ablauf-Einträge usw.) — routinemäßiges Löschen; jeder authentifizierte Benutzer darf löschen, dasselbe Prädikat wie SELECT/UPDATE.

`user_id` auf einem Fest ist daher kein Besitz-/Sichtbarkeits-Marker mehr, sondern nur noch Ersteller-Nachweis fürs Löschen des Fests selbst.

## Benutzer

Login-Konto eines Organisators (Supabase Auth, E-Mail + Passwort). Benutzer planen Feste im *gemeinsamen Arbeitsbereich*. **Selbstregistrierung ist deaktiviert** — Konten werden manuell im Supabase-Dashboard angelegt. Das gatekeept den Zugang ("nur bestimmte Leute").

Nicht zu verwechseln mit *Helfer*: Ein Benutzer hat ein Login und Vollzugriff; ein Helfer hat kein Login.

## Helfer

Freiwilliger, der bei einem Fest eingeteilt wird (`festival_helpers`). Ein Helfer ist **kein** Login-Benutzer. Klar abgrenzen: *Benutzer* = Organisator mit Login, *Helfer* = einzuteilende Person ohne Login.

Ein Helfer **gehört dem Fest**, in dem er steht — es gibt keinen festübergreifenden Personenbestand und keine Helfer-Stammdatenseite. Dieselbe Person bei zwei Festen sind zwei Helfer. Angelegt und entfernt wird er in der *Helferliste* des Schichtplans; entfernt heißt vollständig weg, samt seiner Zuteilungen. Entscheidung in ADR 0005 (bewusst anders als beim *Sponsor*, der global bleibt).

Seine *Wünsche* (bevorzugte Stationen und Schichten) hängen direkt an ihm, weil er ohnehin pro Fest lebt.
_Avoid_: Mitglied (heißt in einem Verein etwas anderes), Member.

## Helferliste

Die Helfer eines Fests, geführt im Schichtplan. Zugleich der einzige Ort, an dem Helfer entstehen und verschwinden — und, weil es keinen Bestand gibt, ist die *Fest-Kopie* der einzige Weg, die Helfer eines vergangenen Fests in ein neues zu holen.

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

## Bestellwert & Verbrauchswert

Die zwei Geldsummen einer Materialliste. **Beide rechnen brutto** — der Verein zahlt brutto, eine Kostenzahl ohne Mehrwertsteuer ist für die Kassa wertlos.

- **Bestellwert** — Σ (Bestellt-Menge × Bruttopreis) über alle bepreisten Positionen. Was das Fest an Material kosten soll.
- **Verbrauchswert** — Σ (Verbraucht-Menge × Bruttopreis), nur über Positionen mit erfasster Verbraucht-Menge. Was tatsächlich verbraucht wurde.
- **Kosten einer Position** — Bruttopreis × (Verbraucht-Menge, sonst Bestellt-Menge). Eine Zeile trägt *eine* Summe; solange nichts nachgetragen ist, gilt die Bestellmenge.

Der **Bruttopreis** einer Position leitet sich aus dem erfassten Preis (`unit_price`) und der Angabe ab, ob dieser netto oder brutto gemeint ist (`price_is_net`), zusammen mit dem Steuersatz (`tax_rate`). **Ohne Steuersatz sind Netto- und Bruttopreis gleich.** Positionen ohne Preis zählen in keine Summe, sondern als *Preislücke*.

Bestellwert und Verbrauchswert sind bereichsübergreifend dieselben Zahlen — die Materialliste und das Dashboard müssen für dasselbe Fest denselben Betrag zeigen. Entscheidung dokumentiert in ADR 0006.

## Station

Funktionale Einheit innerhalb eines Festes (`stations`), z.B. "Bar", "Küche", "Kassa". Stationen sind pro Fest definiert, werden aber bei der Material-Übernahme per Name zwischen Festen gemappt.

## Lieferant

Bezugsquelle einer Material-Position (`supplier`, Freitext pro Position, kann leer sein). Dient als Gruppierungsachse beim Erstellen von Bestelllisten — alle Positionen mit demselben Lieferanten ergeben eine Bestellung. Positionen ohne Lieferanten bilden die Gruppe "Kein Lieferant".

## Materialliste vs. Bestellliste

Zwei verschiedene Exporte mit unterschiedlichem Zweck:

- **Materialliste** — Planungs-/Referenzliste. Zeigt pro Position Bestellt- und Verbraucht-Menge plus eine leere "Neue Menge"-Spalte zum händischen Ausfüllen. Dient der Bestellplanung fürs kommende Fest.
- **Bestellliste** — die tatsächliche Bestellung. Gruppiert nach Lieferant oder Station, enthält nur Positionen mit Bestellmenge (`ordered_quantity`) > 0, reduziert auf Bezeichnung + Menge + Einheit. Dient als Bestellung, die an einen Lieferanten gegeben bzw. an einer Station gebraucht wird.

## Sponsor

Firma/Person, die ein Fest finanziell oder als Sachleistung unterstützt. **Globale, wiederverwendbare Stammdaten** (anders als der *Helfer*, der pro Fest lebt) — eine Firma wird einmal angelegt und über Feste hinweg verknüpft. Felder: Firmenname, Ansprechpartner, Email, Telefon, Adresse, Website, Notizen. Dass ein Sponsor global lebt, ermöglicht die *Wiederkontaktierung* ohne Kopieren.
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

## Werkzeug-Bausteine (Toolkit)

Die wiederkehrenden UI-Bausteine der Werkzeug-Plakat-Handschrift (`design-vision/DESIGN-VISION.md` §4): Maßband-Ruler, Namens-Marke, Wertmarke, Stempel, Segment-Schalter, Ampel-Logik, Freier Platz. Im Code englisch benannt unter `src/components/toolkit/` (`<Ruler>`, `<NameChip>`, `<ValueTag>`, `<Stamp>`, `<SegmentedControl>`, `<ModeToggle>`, `<StatusBar>`, `<OpenSlot>`) — Mapping und Komponentenstrategie in ADR 0003. Abgrenzung: `src/components/ui/` = Radix-Verhalten (shadcn, nur restylt), `toolkit/` = Handschrift.

## Sponsoring-Übersicht

Auswertung pro Fest: alle erfassten *Sponsoren* mit ihren Kategorien/Freibeträgen und die Gesamtsumme des Sponsorings für dieses Fest.
_Avoid_: Sponsorenliste (mehrdeutig — kann auch die globalen Stammdaten meinen).
