# Notes

## User-Präferenzen
- Sprache: Deutsch. Chat-Antworten extrem knapp (CLAUDE.md-Vorgabe).
- Region: Bezirk Scheibbs, NÖ — österreichische Produkte/Händler bevorzugen (Lagerhaus, Hornbach/OBI, Adler).
- Zeitdruck: < 2 Monate bis Einzug. Lektionen kurz, sofort umsetzbar.
- Erfahrung: hat schon Zimmer ausgemalt, Technik unsicher → Grundlagen nicht überspringen, aber zügig.

## Geplante Lektions-Reihenfolge (= Arbeitsreihenfolge am Haus)
1. ✅ 0001 Tapeten entfernen
2. ✅ 0002 Untergrund prüfen + grundieren (Adler sandend/saugend) + reference/glossar.html angelegt
3. Wände streichen (Kanten, Nass-in-nass, Reihenfolge)
4. Parkett: Untergrund-Check (Restfeuchte, Ebenheit) — VOR Kleberkauf
5. Parkett vollflächig kleben
6. Fliesen streichen (vorher Gap in RESOURCES.md schließen)

## Arbeitsnotizen
- Workspace liegt in renovierung/ im festival_planer-Repo (User-Entscheidung).
- WICHTIG: Env setzt lokales Working-Dir JEDEN Turn zurück. Remote-Branch ist Source of Truth. Bei Sessionstart immer: `git fetch && git reset --hard origin/claude/installed-skills-inventory-Wlz4d`, dann arbeiten, dann committen+pushen. Sonst gehen Dateien verloren.
- Commit/Push nur auf explizite Ansage des Users.
- Lektionen als HTML via SendUserFile direkt schicken (User arbeitet remote, Repo-Push nicht nötig zum Anschauen).
