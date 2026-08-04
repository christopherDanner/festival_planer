# Sponsoring wird per Zellklick bedient, nicht im Zeilenmodus

Der Material-Bereich hat für das Bearbeiten in einer Tabelle den **Zeilenmodus ✎** beschlossen (Wayfinder-Ticket #66): die Tabelle ist strikt lesend, ✎ macht die Felder *einer Zeile* zu Eingaben, mehrere Zeilen dürfen gleichzeitig offen sein, gespeichert wird gesammelt. Der Sponsoring-Bereich weicht davon ab: dort öffnet ein **Klick auf eine Zelle einen Zettel** (Popover) mit dem Wert, „Übernehmen" und „Entfernen". Dieselbe Bedienung gilt für Kategorie-Zellen, Freibetrag, Sachleistung und — als einzige Stelle, die keine Zelle ist — den Kategorie-Spaltenkopf.

Die Abweichung ist **gemessen, nicht geschmacklich**. In einem Entscheid-Prototyp (`design-vision/entscheid-sponsoring-bearbeiten.html`) wurden vier Fassungen an denselben 14 Firmen durchgespielt:

- Für den **komplizierten** Vorgang (abweichender Wert + Freibetrag + Sachleistung) sind alle vier praktisch gleich teuer: 6–7 Klicks, 31 Tastenanschläge. Der Aufwand trennt die Varianten nicht.
- Für den **häufigen** Vorgang — eine Kategorie *zum Standardwert* zuweisen — trennt er sie deutlich: 1 Klick beim Klick-Zuweisen, 2 mit Zettel, 3 im Dialog, und 3 Klicks **plus 3 Tastenanschläge** im Zeilenmodus, weil man dort den Betrag abtippt, den das System längst kennt.
- Und dieser Fall ist der Normalfall: in realistischen Beispieldaten sind **16 von 17 Zuweisungen zum Standardwert**, genau eine weicht ab (94 %).

Der Grund für den Unterschied liegt im Datenmodell, nicht in der Optik: eine *Sponsoring-Kategorie* trägt einen **Standardwert**, den die Zuweisung erbt (`sponsoring_category_assignments.value IS NULL`). Eine Material-Position hat keinen solchen Vorgabewert — dort *muss* getippt werden, hier ist Tippen die Ausnahme.

## Considered Options

- **Zeilenmodus ✎ wie beim Material** — verworfen. Einheitlich, aber verlangt für den 94-%-Fall Tastatureingabe eines bekannten Werts. Das war zunächst die Empfehlung und wurde durch die Messung widerlegt.
- **Zeilenmodus + Klick-Zuweisen nur in leeren Zellen** — verworfen. Hätte 1 Klick im Normalfall geschafft und den Zerstörungsfall baulich ausgeschlossen, aber zwei Bearbeitungs-Idiomatiken in einer Tabelle gehabt.
- **Dialog je Sponsoring** (heutiger Code) — verworfen. Doppelt die Matrix als Häkchenliste und ist im Normalfall dreimal so teuer.
- **Vision wörtlich** („Klick auf eine volle Zelle entfernt sie") — verworfen. Ein Fehlklick hätte eine Zusage über € 300 ohne Rückfrage gelöscht. Der Zettel ist die Härtung dieser Interaktion, nicht ihre Ablehnung.

## Consequences

**Die App hat bewusst zwei Bearbeitungs-Idiomatiken in Tabellen.** Wer sie später vereinheitlichen will, muss die Messung oben widerlegen, nicht die Uneinheitlichkeit beklagen. Die Regel, wann welche gilt: **hat das Feld einen Standardwert, den das System kennt → Zellklick; muss der Wert getippt werden → Zeilenmodus.**

**Der Schutz gegen versehentliches Löschen wandert.** Beim Material trägt ihn die strikt lesende Tabelle. Hier trägt ihn der Zettel: Entfernen ist ein eigener, benannter Knopf, nie ein Nebeneffekt des Klicks. Zwei bewusste Klicks statt einem — ohne Rückfrage, aber auch ohne Weg, es versehentlich zu tun.

**Der Kategorie-Spaltenkopf wird bedienbar** und ersetzt die bisherige zweite Tabelle „Sponsoring-Kategorien" samt eigenem Dialog; der Bereich hat danach genau eine Tabelle. Zwei Dinge muss der Zettel dort beziffern, weil das Datenmodell sie so vorgibt:

- Den Standardwert zu ändern wirkt **rückwirkend** auf jede Zuweisung ohne eigenen Wert („gilt für 4 Firmen ohne eigenen Wert"). Ohne diese Zahl verschiebt ein Tastendruck die Fest-Gesamtsumme um Hunderte Euro, ohne dass eine Firma gefragt wurde — dieselbe Falle, gegen die ADR 0008 beim Kopieren entschieden hat.
- Eine Kategorie zu löschen reißt ihre Zuweisungen mit (`ON DELETE CASCADE`). Rückfrage mit Zahl: „ist 6 Firmen zugewiesen".

**Am Handy gilt die Idiomatik weiter, in anderer Form.** Die Karte je Firma zeigt nur, was die Firma *hat*; ein „+" je Sponsor öffnet *eine* Liste mit allem Hinzufügbaren (offene Kategorien, Freibetrag, Sachleistung), und der Zettel kommt als Blatt von unten. Die Karten-Form ist dieselbe Antwort wie beim Material (#66) — keine Abweichung.

**Bei den Summen gibt es keine Abweichung.** ADR 0006 gilt unverändert: alle Summen rechnen **gefiltert** und sagen es in der Beschriftung. Das betrifft hier den Tabellenfuß samt der Zeile *Σ je Kategorie*, sobald das Suchfeld filtert. Die Fest-Kennzahl im Maßband und im Dashboard-Kasten rechnet dagegen über alle — genau die Aufteilung, die ADR 0006 für Bereichskopf und Tabelle beschreibt.
