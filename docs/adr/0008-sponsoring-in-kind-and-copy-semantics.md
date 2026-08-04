# Sachleistung als zweite Zahl, und die Fest-Kopie überträgt keine Zusagen

Zwei Lücken der Design-Vision (§9 „Offen für die Tech-Session") in einem Entscheid: das Sponsoring kannte keine **Sachleistung**, und die Fest-Kopie nahm Sponsorings nicht mit. Beides hängt an derselben Stelle im Modell — dem `sponsorings`-Datensatz, der **bewusst keinen Status trägt** („ein Sponsor ist bei einem Fest entweder erfasst oder nicht", PRD #34).

Genau diese Statuslosigkeit macht das Kopieren gefährlich: ohne Status ist jedes erfasste Sponsoring implizit eine **Zusage** und zählt voll in die Geldsumme. Überträgt die Fest-Kopie die Vorjahresbeträge, zeigt ein Fest am Tag seiner Anlage mehrere Tausend Euro eingeworbenes Sponsoring, bei dem noch keine Firma gefragt wurde — Dashboard-Kasten, Maßband und Lücken-Spalte melden Erfolg, der nicht existiert. Der bereits ausgelieferte `SponsorUebernahmeDialog` tat das schon.

Entschieden (Wayfinder-Ticket #63):

- Die **Sachleistung** sind zwei nullable Spalten an `sponsorings` (`in_kind_description`, `in_kind_value`) — höchstens eine je Sponsoring, dieselbe Körnung wie der Freibetrag. Kein eigener Typ, keine Kategorie-Variante.
- Der **Sachwert** ist eine **zweite Zahl neben dem Geld** und wird nie hineingerechnet. `sponsoringTotal()` bleibt für immer geld-only; `festivalInKindTotal()` steht daneben, im selben Modul `src/lib/sponsoringTotals.ts`.
- **Werte werden kopiert, wo sie unsere Entscheidung sind, nicht wo sie das Versprechen eines anderen wären.** Das Kopierwerk überträgt die Preisliste (*Sponsoring-Kategorien*) vollständig mit Werten, die Sponsoren aber als **nackte Verknüpfung** ohne Beträge. Zwei unabhängige Schalter.
- Der **Einzel-Dialog darf Werte mitnehmen** — dort entscheidet ein Mensch pro Firma, und „wie letztes Jahr" ist am Telefon eine echte Zusage. Die Semantik der zwei Wege divergiert also bewusst.
- Das Jahresgedächtnis der Beträge lebt nicht im Zielfest, sondern in der Ansicht: der **Vorjahresbeitrag** wird aus dem Quellfest gelesen, über `sponsorings.copied_from_festival_id`.
- Das Maßband des Bereichs vergleicht gegen die **Geld-Gesamtsumme des vorigen Fests**. Kein Zielbetrag-Feld.

## Considered Options

- **Sachleistung als eigene Kindtabelle** (n je Sponsoring) — verworfen. Für ein Dorffest ist es der eine Tombolapreis; die Vision zeigt eine Matrixspalte mit einer Zelle je Zeile. Bewusst in Kauf genommen: gibt eine Firma zwei Dinge, muss man sie in einen Text schreiben und die Schätzwerte selbst addieren. Nachrüsten bleibt möglich.
- **Sachleistung als *Sponsoring-Kategorie* mit `is_in_kind`-Flag** — verworfen. Eine Kategorie ist eine Leistung, die der Verein **anbietet**, pro Fest definiert und mit wiederverwendbarem Standardwert; eine Sachleistung ist, was die Firma **gibt**. Gegenrichtung, und ein Geschenkkorb hat keinen Standardwert.
- **Sachwert in die Geldsumme addieren** — verworfen (Vision §5). Geld und geschätzter Sachwert sind nicht dieselbe Einheit. Die Analogie zu *Bestellwert/Verbrauchswert* (ADR 0006) trägt hier nur halb: jene zwei Zahlen sind gleichartig, diese nicht.
- **Die Fest-Kopie überträgt die Beträge** (bisheriges Verhalten des Dialogs) — verworfen für den Massenvorgang. Erfundenes Einkommen, das nach unten korrigiert werden müsste, was nie passiert.
- **Einen Zustand einführen** (`copied` / „noch nicht bestätigt"), um kopierte von echten Beträgen zu unterscheiden — verworfen. Erkauft Ehrlichkeit mit genau dem Lebenszyklus, den PRD #34 herausgeworfen hat.
- **Vorjahresbeitrag als Schnappschuss mitkopieren** (`previous_total`) — verworfen. Ein denormalisiertes Duplikat einer errechenbaren Zahl, das lügt, sobald das Vorjahresfest nachträglich korrigiert wird — dasselbe Muster wie `sort_order` neben der Uhrzeit in ADR 0007.
- **Vorjahresbeitrag aus dem jüngsten früheren Fest ableiten** statt aus dem Quellfest — als Empfehlung vorgetragen und **verworfen** (Nutzer-Entscheid). Es hätte ohne neue Spalte funktioniert und auch für handeingetragene Sponsoren gewirkt; kopiert man aber 2027 aus 2025, obwohl es ein Fest 2026 gab, zeigte es die 2026er Zahl statt der übernommenen. Gewollt ist strikt das Quellfest.
- **Zielbetrag-Feld an `festivals`** fürs Maßband — verworfen. Ein neuer Domänenbegriff, den CONTEXT.md nirgends kennt, einmal gesetzt und drei Jahre später falsch. Der Vorjahresvergleich kann nicht veralten; beim allerersten Fest bleibt das Maßband eben leer.
- **Den Einzel-Dialog auf nackte Verknüpfung vereinheitlichen** — als Empfehlung vorgetragen und verworfen: der Einzelentscheid pro Firma ist der Schutz, den der Massenvorgang nicht hat.

## Consequences

- `sponsorings` bekommt drei Spalten: `in_kind_description TEXT`, `in_kind_value NUMERIC`, `copied_from_festival_id UUID REFERENCES festivals(id) **ON DELETE SET NULL**`. Nicht CASCADE — das Löschen des Vorjahresfests darf die diesjährigen Sponsorings nicht mitreißen.
- Der globale **Sponsor-Stammsatz bleibt unangetastet** (ADR 0002): die Sachleistung ist eine Jahresentscheidung und gehört ans Sponsoring.
- Ein neuer, festübergreifender **Leseweg** entsteht (`getPreviousSponsorings`) — bisher gab es nur `getSponsorings(festivalId)`. Er trägt auch den fest-weiten Vorjahres-Gesamtbetrag fürs Maßband.
- Der **Dashboard-Kasten** zeigt den Sachwert als Unterzeile („+ € 270 Sachwert"), nur wenn er > 0 ist — sonst widerspräche er dem Tabellenfuß des Bereichs, und die Trennung sähe wie ein Rechenfehler aus.
- `CopyFestivalOptions` bekommt `copySponsoringCategories` und `copySponsorings`; das Kopierwerk erhält sie als **Schritt 5** (Ablaufplan ist Schritt 4, ADR 0007 / #127).
- **Der Doppelweg ist Absicht, nicht Versehen.** Wer die Übernahme anfasst, muss beide Wege kennen; die divergierende Semantik gehört an beiden Stellen kommentiert.
- Nebenbefund, hier mitgezogen: `sponsors`, `sponsorings` und `sponsoring_categories` fehlen in der Tabellenliste von `20260610000001_open_delete_within_festival.sql` und tragen noch Ersteller-gegatete DELETE-Policies — ein Widerspruch zu **ADR 0002 (Blast-Radius)**, dessen Text „ALLE übrigen Tabellen" sagt. Wird in derselben Migration nachgezogen; kein neuer Entscheid.
