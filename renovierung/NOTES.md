# Notes

## User-Präferenzen
- Sprache: Deutsch. Chat-Antworten extrem knapp (CLAUDE.md-Vorgabe).
- Region: Bezirk Scheibbs, NÖ — österreichische Produkte/Händler bevorzugen (Lagerhaus, Hornbach/OBI, Adler).
- Zeitdruck: < 2 Monate bis Einzug. Lektionen kurz, sofort umsetzbar.
- Erfahrung: hat schon Zimmer ausgemalt, Technik unsicher → Grundlagen nicht überspringen, aber zügig.

## Geplante Lektions-Reihenfolge (= Arbeitsreihenfolge am Haus)
1. ✅ 0001 Tapeten entfernen
2. ✅ 0002 Untergrund prüfen + grundieren (Adler sandend/saugend) + reference/glossar.html angelegt
3. ✅ 0003 Wände weiß streichen (weiß auf weiß; Kreide-/Glanztest, Kanten, nass-in-nass)
4. ✅ 0004 Steckdosen & Schalter tauschen — Ö-Rechtslage, Sicherheit, als Auftraggeber planen (Elektriker!) + Glossar Elektro
5. Decke streichen über Kopf (Deckentapete runter zuerst) — ODER
6. Wand spachteln (für die 1–2 Spachtel-Räume) — Reihenfolge nach User-Wahl
7. Parkett: Untergrund-Check (Restfeuchte, Ebenheit) — VOR Kleberkauf
8. Parkett vollflächig kleben
9. Fliesen streichen (vorher Gap in RESOURCES.md schließen)

## Ist-Zustand (siehe LR-0002)
- Tapete NUR an Decken. Wände schon weiß. 1–2 Räume spachteln, Rest direkt überstreichen.

## Arbeitsnotizen
- Workspace liegt in renovierung/ im festival_planer-Repo (User-Entscheidung).
- WICHTIG: Env setzt lokales Working-Dir JEDEN Turn zurück. Remote-Branch ist Source of Truth. Bei Sessionstart immer: `git fetch && git reset --hard origin/claude/installed-skills-inventory-Wlz4d`, dann arbeiten, dann committen+pushen. Sonst gehen Dateien verloren.
- Commit/Push nur auf explizite Ansage des Users.
- Lektionen als HTML via SendUserFile direkt schicken (User arbeitet remote, Repo-Push nicht nötig zum Anschauen).
