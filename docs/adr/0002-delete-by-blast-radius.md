# 0002 — DELETE nach Blast-Radius statt durchgängig creator-only

Status: Accepted
Datum: 2026-06-10
Supersedes: ADR 0001, Entscheidung 1 (DELETE nur Ersteller) — für Line-Item-Tabellen

## Kontext

ADR 0001 beschränkte **DELETE** auf allen Tabellen auf den Ersteller (`user_id = auth.uid()`) und verwarf "DELETE für alle" als zu destruktiv. In der Praxis behindert das die gemeinsame Planung: Eine Material-Position oder ein Ablauf-Eintrag, den Benutzer A angelegt hat, kann Benutzer B nicht entfernen — obwohl beide am selben Fest arbeiten und alles andere gemeinsam bearbeiten dürfen. Das widerspricht dem *Gemeinsamen Arbeitsbereich*.

## Entscheidung

DELETE wird nach **Tragweite** gegated, nicht pauschal auf den Ersteller:

- **Line-Items** — `festival_materials`, `schedule_days`, `schedule_phases`, `schedule_entries`: DELETE für jeden authentifizierten Benutzer, dasselbe Prädikat wie SELECT/UPDATE (Sichtbarkeit des Fests). Keine Sonderbehandlung fürs Löschen mehr.
- **Container** — `festivals`, `stations`, `members`: DELETE bleibt creator-only wie in ADR 0001. Ein ganzes Fest zu löschen ist katastrophal (Cascade über alle Kinddaten), das soll bewusst nur der Ersteller können.

Begründung der Grenze: Ein einzelnes Line-Item ist schnell wiederhergestellt, ein gelöschter Container reißt große Datenmengen mit. Routine vs. katastrophal.

## Konsequenzen

- Umsetzung rein in RLS (Migration). Kein Client-Code betroffen — die UI zeigte die Löschen-Buttons ohnehin immer; bisher scheiterte das Löschen still an RLS.
- Etwaige Ersteller-Spalten auf den Line-Item-Tabellen bleiben erhalten (Audit), werden fürs DELETE-Gating aber nicht mehr ausgewertet.
- Asymmetrie ist gewollt und dokumentiert: gemeinsamer Bestand, aber Container-Löschung bleibt geschützt.

## Verworfene Alternativen

- **DELETE überall für alle öffnen** — konsequenter, aber gibt den Schutz für katastrophale Fest-Löschungen ohne Not auf.
- **Bei creator-only bleiben (ADR 0001 unverändert)** — verworfen, weil es die gemeinsame Planung an der Stelle blockiert, an der sie am häufigsten gebraucht wird.
