# 0005 — Helfer gehören dem Fest, nicht dem Bestand

Status: Accepted
Datum: 2026-07-31
Kontext: Wayfinder-Ticket #62 (Karte #51), DESIGN-VISION §2 + §5

## Kontext

Bis hierher war ein Helfer eine **globale** Person: `members` ohne `festival_id`, gepflegt in einem eigenen Mitglieder-Bereich, in jedem Fest sichtbar. Fest-Bezug entstand erst über `station_members`, `shift_assignments`, `stations.responsible_member_id` und die Wunsch-Tabelle `festival_member_preferences`.

Die Design-Vision streicht den Mitglieder-Bereich ersatzlos: Helfer werden direkt in der Helferliste des Schichtplans angelegt, das `×` an der Marke entfernt sie aus dem Fest (§2, §5). Ohne globale Verwaltungsseite bliebe ein globaler Personenbestand zurück, den niemand mehr sehen oder aufräumen kann.

## Entscheidung

Der Helfer-Datensatz **gehört dem Fest**. Neue Tabelle `festival_helpers` (`festival_id`, Vor-/Nachname, Email, Telefon, Notizen, Wünsche); dieselbe Person in zwei Festen sind zwei Zeilen. Ein festübergreifender Personenbestand existiert nicht mehr.

Folgeentscheidungen, die daran hängen:

- **`festival_member_preferences` entfällt.** Die Wunsch-Tabelle war nur nötig, weil die Person global war; sitzt der Helfer schon pro Fest, sind die Wünsche zwei Array-Spalten auf seiner Zeile (`station_preferences`, `shift_preferences` als `uuid[]`).
- **`is_active` entfällt.** „Heuer nicht dabei" war ein Marker, weil man die globale Person nicht löschen wollte. Pro Fest ist das Entfernen genau diese Geste — zwei Wege für dieselbe Sache wären Ballast.
- **`user_id` entfällt** auf der Helfer-Zeile: im *Gemeinsamen Arbeitsbereich* (ADR 0001) ohne Bedeutung, und der Löschschutz hing ohnehin nur am Fest (ADR 0002).
- **Der Begriff ist „Helfer"**, im Code `helper` — `member` verschwindet aus Schema und Code. „Mitglied" heißt in einem Verein etwas anderes als hier.
- **RLS** folgt ADR 0002 ohne Sonderregel: `festival_helpers` liegt innerhalb eines Fests, also SELECT/INSERT/UPDATE/DELETE für jeden authentifizierten Benutzer.
- **Das Kopierwerk wird zum einzigen Weg**, letztjährige Helfer in ein neues Fest zu holen. Es bekommt dafür einen eigenen Schalter „Helfer übernehmen" (kopiert die Helferliste inkl. auf die neuen Stationen/Schichten umgeschlüsselter Wünsche); „Zuteilungen übernehmen" setzt ihn voraus.

## Konsequenzen

- **Keine festübergreifende Identität.** „War Hans letztes Jahr an der Bar?" ist nicht mehr per Query beantwortbar, und ein Tippfehler erzeugt zwei Hansen. Bewusst in Kauf genommen: die Wiedererkennung leistet das Kopierwerk, und ein unsichtbarer Bestand voller Dubletten wäre schlechter als gar keiner.
- **Bewusste Abweichung von ADR 0002 (Sponsoren als globale Stammdaten).** Sponsoren bleiben global, Helfer nicht — die Analogie in CONTEXT.md ist damit hinfällig. Der Unterschied ist die *Wiederkontaktierung*: bei einem Sponsor ist die Historie über Feste hinweg der fachliche Zweck, ein Helfer wird pro Fest neu eingeteilt. Außerdem behalten Sponsoren ihre Stammdaten-Seite, Helfer verlieren ihre.
- **Wünsche haben keine Fremdschlüssel.** Wird eine Station gelöscht, bleibt ihre ID als Karteileiche im Array. Schaden ist kosmetisch — Gruppierung und Auto-Zuteilung ignorieren unbekannte IDs; sauber hält es ein Filtern beim Lesen.
- **`members` wird nicht gedroppt**, sondern bleibt nach der Migration als toter Rückweg stehen.

## Verworfene Alternativen

- **Person global + Zugehörigkeitstabelle** (`members` bleibt, neue `festival_members`) — die naheliegende Variante und analog zum Sponsor. Verworfen, weil der Wegfall des Mitglieder-Bereichs einen unverwaltbaren Bestand hinterlässt: verwaiste Personen und Dubletten sammeln sich unsichtbar an, und das Anlegen in der Helferliste bräuchte eine Dubletten-Erkennung, die es ohne Verwaltungsseite nicht geben kann.
- **Global lassen, nur die UI ändern** — billigste Variante, löst aber die Vision-Aussage nicht ein: jedes Fest sähe weiterhin die Helfer aller Feste.
- **Wünsche als Verknüpfungstabellen** mit `ON DELETE CASCADE` — integer, aber zwei Tabellen mehr, ein zweiter Query samt Gruppierung in jeder Helferliste und delete-then-insert statt einem Upsert. Der verhinderte Schaden ist nur kosmetisch.
