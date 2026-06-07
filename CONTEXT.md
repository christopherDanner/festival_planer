# Domain Context — Festmeister Österreich

Begriffsglossar des Projekts. Wird gepflegt wenn neue fachliche Begriffe auftauchen oder bestehende geschärft werden.

---

## Fest / Festival

Eine zeitlich begrenzte Veranstaltung, für die geplant, eingeteilt, eingekauft und abgerechnet wird. Im Code: `festivals`. Pro User können mehrere Feste existieren, oft ein neues pro Jahr (z.B. "Stadlfest 2024", "Stadlfest 2026").

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
