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

## Ablaufplan

Der Zeitplan eines Fests: was wann passiert und wer sich darum kümmert. Er besteht aus zwei Papieren mit verschiedenem Publikum — der *Aufgaben-Werkliste* (intern) und dem *Programmzettel* (Aushang). Beide speisen sich aus denselben *Ablauf-Einträgen*.
_Avoid_: Zeitplan, Regieplan.

## Ablauf-Tag

Ein Tag im Ablaufplan (`schedule_days`) mit Datum und freiem Label („Aufbau", „Nachbereitung"). Die eigentlichen Festtage (`start_date` bis `end_date`) entstehen automatisch beim ersten Öffnen; jeder weitere Tag davor oder danach wird von Hand angelegt. Ändert sich später das Fest-Datum, ziehen bestehende Tage **nicht** nach.

## Phase

Optionale Untergruppe innerhalb eines *Ablauf-Tags* (`schedule_phases`), z.B. „Anlieferung", „Frühschoppen", „Abendprogramm". Sie ordnet die Arbeit eines Tages in Blöcke und ist **nur in der Aufgaben-Werkliste sichtbar** — auf dem Programmzettel nicht, weil sie ein Planungsbegriff ist. Eine Phase löschen nimmt ihre Einträge mit. Entscheidung in ADR 0007.
_Avoid_: Schicht (das ist der Zeitblock einer *Station* im Schichtplan), Abschnitt.

## Ablauf-Eintrag

Eine Zeile des Ablaufplans (`schedule_entries`). Sie **gehört einem Ablauf-Tag** und liegt optional in einer *Phase* (ADR 0007). Gereiht wird nach Startzeit, nicht von Hand. Zwei Arten, die sich auf zwei Papiere verteilen:

- **Aufgabe** — etwas, das jemand erledigen muss. Trägt Status (offen/erledigt) und einen *Helfer* als Verantwortlichen. Steht in der *Aufgaben-Werkliste*.
- **Programmpunkt** — etwas, das dem Publikum passiert („Fassanstich", „Frühschoppen"). Trägt **weder Status noch Verantwortlichen**. Steht auf dem *Programmzettel*.

## Aufgaben-Werkliste

Das linke, interne Papier des Ablaufplans: alle *Aufgaben* eines Fests, gegliedert nach *Ablauf-Tag* → *Phase*, je Zeile Haken, Uhrzeit, Titel und Verantwortlicher. Filterbar nach offen/erledigt und nach Verantwortlichem. Exportiert genau das, was gerade gefiltert am Bildschirm steht.

## Programmzettel

Das rechte Papier des Ablaufplans und zugleich der **Aushang**: nur *Programmpunkte*, nach *Ablauf-Tag* gruppiert, je Zeile Uhrzeit und Titel. Er wird direkt bearbeitet, zeigt aber keine Haken, keine Phasen und keine Verantwortlichen — er geht ans Publikum. Als PDF in Plakat-Optik druckbar.
_Avoid_: Programmliste, Aushangplan.

## Sponsor

Firma/Person, die ein Fest finanziell oder als Sachleistung unterstützt. **Globale, wiederverwendbare Stammdaten** (anders als der *Helfer*, der pro Fest lebt) — eine Firma wird einmal angelegt und über Feste hinweg verknüpft. Felder: Firmenname, Ansprechpartner, Email, Telefon, Adresse, Website, Notizen. Dass ein Sponsor global lebt, ermöglicht die *Wiederkontaktierung* ohne Kopieren.
_Avoid_: Firma (als eigener Begriff — Firma und Sponsor sind hier dasselbe), Gönner.

## Sponsoring-Kategorie

Eine benannte Sponsoring-Leistung mit einem Wert, z.B. "Werbeplakat", "Social-Media-Beitrag", "Logo in Speisekarte". **Pro Fest definiert** (Name + Wert), weil der Wert je Jahr variieren kann.

Der Wert einer Kategorie ist ein **Standardwert**: eine Zuweisung ohne eigenen Wert erbt ihn. Den Standardwert zu ändern wirkt daher **rückwirkend** auf alle Zuweisungen, die ihn nicht überschrieben haben — die Oberfläche muss das beziffern, bevor sie es tut.
_Avoid_: Paket, Leistung, Sponsoring-Stufe.

## Preisliste

Die *Sponsoring-Kategorien* eines Fests als Ganzes — was der Verein heuer anbietet und zu welchen Standardwerten. Der Begriff bezeichnet die Menge, nicht die einzelne Kategorie, und wird gebraucht, wo genau diese Menge das Objekt ist: die *Sponsor-Übernahme* im Kopierwerk übernimmt sie vollständig mit Werten (ADR 0008), und ein Fest ohne sie kann keinem Sponsor etwas zuweisen — sie ist der erste Schritt im Bereich, vor den Firmen.

Sie ist das eigentliche Jahresgedächtnis des Bereichs: Firmen wechseln, die Preisliste wird fortgeschrieben.
_Avoid_: Katalog, Leistungskatalog, Kategorienliste.

## Sponsoring

Die Verknüpfung *eines* Sponsors mit *einem* Fest — was diese Firma bei diesem Fest beiträgt. Besteht aus beliebig vielen zugewiesenen *Sponsoring-Kategorien* (der Wert je Zuweisung ist pro Sponsor überschreibbar, Default = Kategorie-Wert), optional **einem** freien Betrag und optional **einer** *Sachleistung*. Gesamtbeitrag = Summe der Kategorie-Werte + Freibetrag — die Sachleistung zählt **nicht** hinein (siehe *Sachwert*). **Kein Status/Lebenszyklus** — ein Sponsor ist bei einem Fest entweder erfasst oder nicht; erfasst heißt zugesagt.
_Avoid_: Sponsoren-Beitrag, Deal.

## Sachleistung

Was ein Sponsor **nicht in Geld** beiträgt: eine Sachspende mit geschätztem Wert, z.B. "Geschenkkorb Tombola (€ 80)". Gehört zum *Sponsoring*, nicht zum globalen *Sponsor* — der Tombolapreis ist eine Jahresentscheidung. Höchstens **eine** je Sponsoring, dieselbe Körnung wie der Freibetrag. Gegenrichtung zur *Sponsoring-Kategorie*: die Kategorie ist eine Leistung, die der Verein anbietet, die Sachleistung ist, was die Firma gibt — deshalb hat sie keinen wiederverwendbaren Standardwert.
_Avoid_: Sachspende, Naturalleistung, Sponsoring in Naturalien.

## Sachwert

Die Summe der geschätzten Werte aller *Sachleistungen* eines Fests. **Zweite, eigene Zahl neben dem Geld** — wird nie zum Gesamtbeitrag oder zur Sponsoring-Gesamtsumme addiert, weil Geld und geschätzter Sachwert nicht dieselbe Einheit sind. Wird überall separat ausgewiesen ("+ € 270 Sachwert").
_Avoid_: Sachleistungssumme (zu lang), Naturalwert.

## Vorjahresbeitrag

Der Gesamtbeitrag desselben *Sponsors* beim **Quellfest** einer *Sponsor-Übernahme* — die Verhandlungsbasis beim Anruf ("letztes Jahr € 500"). Rein informativ: zählt in keine Summe des aktuellen Fests. Nur sichtbar, wo ein Quellfest bekannt ist; ein von Hand eingetragenes Sponsoring hat keinen Vorjahresbeitrag.
_Avoid_: Vorjahreswert (heißt beim *Sponsoring-Kategorie*-Vorschlag schon etwas anderes), historischer Beitrag.

## Sponsor-Übernahme

Vorgang, Sponsoren eines vergangenen Fests (Quellfest) in ein neues Fest (Zielfest) zu übernehmen. Weil *Sponsoren* global sind, wird der Sponsor selbst nur verknüpft, nicht kopiert. Es gibt **zwei Wege mit bewusst verschiedener Semantik** (ADR 0008):

- **Einzeln, während der Planung** — pro Firma entschieden; Kategorie-Zuweisungen und Freibetrag dürfen mitwandern, weil in diesem Moment eine echte Zusage vorliegt. *Sponsoring-Kategorien* werden per Namen gemappt (gleichnamige Kategorie im Zielfest wird verknüpft, fehlende wird mit dem Vorjahreswert als Vorschlag neu angelegt) — analog zur *Material-Übernahme*.
- **Im Kopierwerk bei der Fest-Anlage** — Massenvorgang; die Sponsoren kommen als **nackte Verknüpfung** ohne Beträge, die Preisliste (*Sponsoring-Kategorien*) dagegen vollständig mit Werten. Getrennte Schalter.

_Avoid_: Reaktivierung.

## Wiederkontaktierung

Fachliches Ziel hinter der *Sponsor-Übernahme*: vergangene Sponsoren fürs neue Fest erneut anfragen. Der **automatisierte Email-Versand ist bewusst (noch) nicht Teil des Funktionsumfangs** — es gibt keine Versand-Infrastruktur (siehe AI_INTEGRATION.md: nur client-seitiges Mistral, keine Edge Functions). Aktuell deckt die *Sponsor-Übernahme* den Vorgang ab; Mailversand kann später andocken.
_Avoid_: Follow-up.

## Werkzeug-Bausteine (Toolkit)

Die wiederkehrenden UI-Bausteine der Werkzeug-Plakat-Handschrift (`design-vision/DESIGN-VISION.md` §4): Maßband-Ruler, Namens-Marke, Wertmarke, Stempel, Segment-Schalter, Ampel-Logik, Freier Platz. Im Code englisch benannt unter `src/components/toolkit/` (`<Ruler>`, `<NameChip>`, `<ValueTag>`, `<Stamp>`, `<SegmentedControl>`, `<ModeToggle>`, `<StatusBar>`, `<OpenSlot>`) — Mapping und Komponentenstrategie in ADR 0003. Abgrenzung: `src/components/ui/` = Radix-Verhalten (shadcn, nur restylt), `toolkit/` = Handschrift.

## Sponsoring-Übersicht

Auswertung pro Fest: alle erfassten *Sponsoren* mit ihren Kategorien/Freibeträgen/*Sachleistungen*, die Geld-Gesamtsumme und daneben der *Sachwert*. Verglichen wird gegen die Geld-Gesamtsumme des vorigen Fests, nicht gegen einen gesetzten Zielbetrag — ein Sponsoring-Ziel gibt es bewusst nicht.
_Avoid_: Sponsorenliste (mehrdeutig — kann auch die globalen Stammdaten meinen), Sponsoring-Ziel.
