# Ein Sponsor ist nur löschbar, solange er keine Historie hat

Ein *Sponsor* (globaler Firmen-Stammsatz, ADR 0011) darf **nur gelöscht werden, wenn kein einziges *Sponsoring* auf ihn zeigt** — also solange er bei keinem Fest erfasst war. Sobald er einmal gesponsert hat, ist er unlöschbar. Durchgesetzt wird das in der Datenbank: `sponsorings.sponsor_id` steht auf **`ON DELETE RESTRICT`** statt wie bisher auf `CASCADE` (Wayfinder-Ticket #101).

Der Grund ist die Reichweite des alten Cascades. Ein `DELETE` auf `sponsors` hat **jedes Sponsoring dieser Firma in jedem Fest** mitgerissen — auch in abgeschlossenen. Damit änderte sich die Sponsoring-Gesamtsumme eines vergangenen Fests rückwirkend, ohne dass dieses Fest überhaupt geöffnet worden wäre. Es gibt keinen Soft-Delete auf `sponsors` und kein Undo. Und die einzige Oberfläche, die dieses `DELETE` auslösen kann, ist die Sponsoren-Stammdaten-Seite, wo eine Firma als *Kontakt* gelöscht wird — niemand denkt dort an die Geldsumme von 2023.

Dass das lange harmlos aussah, lag an der RLS: `sponsors` trägt `creator_delete`, nur der Anleger darf löschen. #143 zieht die drei Sponsoring-Tabellen auf ADR 0002 (Blast-Radius) nach und öffnet DELETE für **alle** eingeloggten Benutzer. Die Zahl der Wege in diesen Cascade wächst also.

## Considered Options

- **Löschen mit Aufklärung** — verworfen. Die Rückfrage hätte konkret aufgezählt, was mitgeht („3 Sponsorings in 3 Festen über € 1.400"). Ehrlicher als heute, aber ein Fehlklick schreibt trotzdem Vergangenheit um, und es gibt kein Zurück.
- **Sperren mit Ausnahme-Weg** (Firmenname zur Bestätigung eintippen) — verworfen. Baut einen zweiten Löschweg für einen Fall, der in der Praxis nicht auftritt: gelöscht werden Duplikate und Testeinträge, und die haben keine Historie.
- **Nur eine Sperre in der Oberfläche, Schema unverändert** — verworfen. Die Regel ist eine Integritätsregel über Feste hinweg, kein Bedienkomfort; sie gehört an die Stelle, die niemand umgehen kann. Die Sperre in der Oberfläche bleibt zusätzlich, damit die Regel erklärt wird, statt in einen Fremdschlüsselfehler zu laufen.
- **Soft-Delete / Archivieren auf `sponsors`** — nicht jetzt. Löst ein anderes Problem (den Bestand ausdünnen) und braucht eine eigene Spalte samt Filterlogik überall, wo Firmen angeboten werden. Erst nötig, wenn der Bestand wirklich weh tut.

## Consequences

**Der Sponsorenbestand wächst praktisch monoton.** Wer einmal gesponsert hat, bleibt für immer in der Liste und in der Firmenauswahl von „+ SPONSOR" (#153). Das ist der bewusst gezahlte Preis. Was ihn erträglich hält, ist nicht Löschen, sondern **Suchen und Filtern**: Suchfeld, Segment-Schalter (`ALLE · SPONSERT {Jahr} · HEUER NOCH NICHT GEFRAGT`) und die *Sponsoren-Historie* in der Zeile. Wenn der Bestand später doch drückt, ist Archivieren die Antwort — nicht Löschen.

**Die Löschsperre und die Historie sind dieselbe Zahl.** `festivalCount` aus `src/lib/sponsorHistory.ts` speist die Spalte *Zuletzt*, den Segment-Filter und den gesperrten ⋮-Eintrag. Die rote Marke „NOCH NIE" in der Liste ist damit gleichzeitig die Anzeige „diese Firma ist löschbar" — die Regel ist sichtbar, bevor man sie auslöst.

**`RESTRICT` nimmt nichts anderes mit.** Ein Fest zu löschen entfernt seine Sponsorings weiterhin über `sponsorings.festival_id` (eigener Fremdschlüssel, bleibt `CASCADE`); `sponsoring_category_assignments` hängt am Sponsoring, nicht am Sponsor. Der einzige Weg, der auf dem alten Cascade beruhte, ist genau der hier abgeschaffte.

**Der Fremdschlüsselfehler muss übersetzt werden.** Läuft ein `DELETE` doch in `RESTRICT` — Nebenläufigkeit, jemand erfasst die Firma gerade in einem anderen Fest —, zeigt die Oberfläche den Satz der Regel, nie die Postgres-Meldung.

**Muster für den Rest des Systems:** wo ein `ON DELETE CASCADE` von einer *globalen* Entität in *fest-gebundene* Daten zeigt, ist er verdächtig. Cascade nach unten innerhalb eines Fests ist richtig (ADR 0002, Blast-Radius = das Fest); Cascade **quer über Feste** löscht Vergangenheit, die niemand angesehen hat. `copied_from_festival_id` (#143) ist aus demselben Grund `SET NULL`.
