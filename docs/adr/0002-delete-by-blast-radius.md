# 0002 — DELETE im geteilten Bestand öffnen, nur das Fest bleibt geschützt

Status: Accepted
Datum: 2026-06-10
Supersedes: ADR 0001, Entscheidung 1 + 1a (DELETE nur Ersteller / Fest-Ersteller) — für alle Tabellen außer `festivals`

## Kontext

ADR 0001 (Entscheidung 1 + 1a, umgesetzt in Migration `20260609000001_shared_workspace_rls.sql`) gatete DELETE durchgängig auf den Ersteller: `festivals`/`members` über `user_id = auth.uid()`, alle Kindtabellen über den **Ersteller des zugehörigen Fests** (`festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid())`, Variante a).

In der Praxis blockiert das die gemeinsame Planung: Eine Material-Position oder ein Ablauf-Eintrag, den Benutzer A angelegt hat, lässt sich von Benutzer B nicht löschen — obwohl beide am selben Fest arbeiten und alles andere gemeinsam bearbeiten dürfen. Das widerspricht dem *Gemeinsamen Arbeitsbereich*. Die Tabellen tragen ohnehin kein Pro-Zeile-`user_id`; der „Ersteller", an dem das Löschen scheiterte, war faktisch der **Fest-Ersteller**.

## Entscheidung

DELETE wird nach **Blast-Radius** gegated, mit genau einer geschützten Grenze:

- **`festivals`** — bleibt creator-only (`user_id = auth.uid()`). Ein ganzes Fest zu löschen reißt per Cascade alle Kinddaten mit; das soll bewusst nur der Ersteller können.
- **Alle übrigen Tabellen** — `members`, `stations`, `station_shifts`, `station_members`, `shift_assignments`, `station_shift_assignments`, `festival_member_preferences`, `festival_materials`, `schedule_days`, `schedule_phases`, `schedule_entries`, `magic_links`, `member_preferences`: DELETE für jeden authentifizierten Benutzer, dasselbe Prädikat wie SELECT/UPDATE (`USING (true)`).

Leitlinie: Alles *innerhalb* eines Fests ist routinemäßig und gemeinsam pflegbar — inklusive Löschen. Nur das Fest als Ganzes ist die katastrophale Operation, die geschützt bleibt.

## Konsequenzen

- Umsetzung rein in RLS (Migration `20260610000001_open_delete_within_festival.sql`). Kein Client-Code betroffen — die UI zeigte die Löschen-Buttons ohnehin immer; bisher scheiterte das Löschen still an RLS.
- Die Migration ersetzt **nur** die DELETE-Policies. Der öffentliche, tokenbasierte Magic-Link-Flow (anon-Policies auf `magic_links` / `member_preferences` für SELECT/INSERT/UPDATE) bleibt unangetastet.
- `user_id` auf `festivals` bleibt Ersteller-Nachweis fürs Löschen; auf `members` verliert es seine Löschschutz-Funktion (DELETE jetzt für alle), `user_id` bleibt aber als Ersteller-Audit erhalten.
- Kein Pro-Benutzer-Schutz mehr unterhalb des Fests: jeder Eingeloggte kann jede Position/Station/Schicht löschen. Akzeptabel für die kleine, vertraute Gruppe (vgl. ADR 0001); bei Wachstum neu bewerten.

## Verworfene Alternativen

- **Bei Ersteller-/Fest-Ersteller-Gating bleiben (ADR 0001, 1a)** — verworfen, weil es die gemeinsame Planung an der häufigsten Stelle blockiert.
- **Nur Material + Ablauf öffnen, Rest gegated lassen** — als Zwischenschritt erwogen, aber inkonsistent: Schicht- und Zuteilungstabellen sind genauso Line-Items. Eine einzige klare Grenze (nur das Fest) ist verständlicher.
- **DELETE komplett für alle, auch das Fest** — verworfen; die Fest-Cascade ist zu destruktiv, um sie ungeschützt zu lassen.
