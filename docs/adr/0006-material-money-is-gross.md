# Materialkosten rechnen brutto, aus einem gemeinsamen Rechenmodul

Die Geldsummen des Materials wurden an drei Stellen unterschiedlich gerechnet: die Dashboard-Zahlenspalte nahm `unit_price × Menge` und ignorierte dabei Mehrwertsteuer und die Angabe `price_is_net` vollständig, während die Material-Kopfzeile und der Tabellenfuß brutto rechneten — letzterer über die gefilterten, erstere über alle Positionen, bei fast gleicher Beschriftung. Für dasselbe Fest zeigten Dashboard und Material-Tab damit verschiedene Beträge.

Entschieden: **Brutto ist die Wahrheit** — der Verein zahlt brutto, eine Kostenzahl ohne Mehrwertsteuer ist für die Kassa wertlos. Ohne Steuersatz sind Netto- und Bruttopreis gleich. Die gesamte Geldrechnung lebt in `src/lib/materialCosts.ts`; Dashboard, Materialliste und Exporte importieren von dort und rechnen nicht selbst — dieselbe Trennung wie `src/lib/staffing.ts` für die Schichtplan-Zählungen.

## Considered Options

- **Netto als Basis** — verworfen. Netto ist die Rechnungsgröße des Lieferanten, nicht die Zahlungsgröße des Vereins.
- **Eine einzige Kostenzahl** — verworfen. Vor dem Fest gibt es keine Verbrauchsmengen, nach dem Fest interessiert der Vergleich Plan/Ist; eine gemischte Zahl allein beantwortet keine der beiden Fragen.

## Consequences

Es gibt **zwei Zählweisen nebeneinander**, beide richtig:

- **Bestellwert und Verbrauchswert** als getrennte Zahlen im Bereichskopf und im Dashboard — reine Größen, bereichsübergreifend identisch definiert.
- **Kosten je Position** als Kette Zeile → Gruppen-Zwischensumme → Bereichssumme, gerechnet mit `Bruttopreis × (Verbraucht ?? Bestellt)`, weil eine Tabellenzeile *eine* Summe tragen muss.

Die Zwischensummen einer Gruppe entsprechen daher keiner der zwei reinen Zahlen. Das ist beabsichtigt und dieselbe Entscheidung wie bei „Frei/Zugeteilt" im Schichtplan (Wayfinder-Ticket #68): zwei Zählungen, beide richtig, beide beschriftet.

Alle Summen rechnen **gefiltert** und sagen es in der Beschriftung. Die schon ausgelieferte Dashboard-Zahlenspalte bekommt eine Korrektur (Issue #112) — bestehende Tests, die die alte Formel festschreiben, sind Teil des Fehlers und werden mit angezogen.
