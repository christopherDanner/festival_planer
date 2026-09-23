# Material wird direkt in der Zelle bearbeitet, nicht im Zeilenmodus

Der Material-Bereich hatte in #66 den **Zeilenmodus ✎** beschlossen: die Tabelle strikt lesend, ✎ öffnet Mengen und Preise einer Zeile, gesammelt gespeichert. Für den **Rechnungsabgleich** nach dem Fest — je Position genau eine Zahl, die *Verbraucht-Menge*, abtippen — war das zu teuer: ✎ je Zeile, der Fokus startet in „Bestellt", Tab läuft durch fünf Felder je Zeile (bei 76 Positionen ~380 Stopps), und ✎ selbst war in der 5 %-Aktionsspalte abgeschnitten. Deshalb: **Klick in die Zelle macht genau diese Zelle zum Eingabefeld, sie speichert beim Verlassen sofort**, Enter springt in dieselbe Spalte der nächsten Zeile. Zeilenmodus, „Alle Zeilen" und Sammel-Fußleiste entfallen.

Das präzisiert die Regel aus ADR 0009, statt sie zu brechen: **beide Tabellen werden per Zellklick bedient.** Sponsoring öffnet dabei einen Zettel, weil dort ein Standardwert übernommen und eine Zuweisung *entfernt* werden kann; Material hat weder das eine noch das andere, also entfällt der Zettel und getippt wird in der Zelle.

## Considered Options

- **Zeilenmodus behalten, nur ✎ reparieren** — verworfen. Behebt das Abschneiden, nicht die fünf Tab-Stopps je Zeile.
- **Zellklick mit Zettel wie beim Sponsoring** — verworfen. Ein Klick mehr je Wert, und es gibt nichts zu *entfernen*, das den Zettel rechtfertigte.
- **Zellbearbeitung zusätzlich zum Zeilenmodus** — verworfen. Zwei Idiomatiken in einer Tabelle hat schon ADR 0009 abgelehnt.

## Consequences

- Der Schutz gegen versehentliches Ändern, den bisher die strikt lesende Tabelle trug, liegt jetzt bei **Esc** (verwirft die Zelle) und darin, dass nur fünf Zellen überhaupt tippbar sind. Ohne offene Entwürfe gibt es keine Rückfrage beim Sichtwechsel mehr.
- Ein Speicherfehler lässt die Zelle offen, samt getipptem Wert — nie ein stilles Verwerfen.
- Die Handy-Karten bleiben, wie sie sind.
