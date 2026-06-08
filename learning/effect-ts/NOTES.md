# NOTES — Lernpräferenzen & Arbeitsweise (Effect-Track)

## Präferenzen (User)
- **Knapp, Deutsch**, vgl. CLAUDE.md (extrem konzis).
- **Hands-on**, aber dieses Thema ist erstmal konzept-/verständnislastig
  ("nur verstehen, ob's sich lohnt") → Wissen + kurze Quizze, noch kein
  großes Code-Projekt.
- **Brücken-Didaktik:** immer an Bekanntes andocken — Promise, async/await,
  try/catch, Generics. User ist TS-stark, FP-neu.
- Lokal **Windows** → Lektion öffnen mit `start <datei>`.

## Didaktik-Entscheidungen
- Eine Lektion = ein Ding. Lektion 1 = NUR das mentale Modell
  (`Effect<A,E,R>` = lazy Beschreibung; Fehler & Deps im Typ). Kein pipe/gen/
  Layer-Overload.
- Kein Bauchwissen — Claims mit Zitaten/Links zu Quellen belegen.
- Jargon (Either, pipe, Fiber, Layer) erst einführen, wenn er gebraucht wird;
  ins GLOSSARY aufnehmen.

## Curriculum-Arc (geplant, anpassbar) — Ziel: "lohnt es sich?"
1. ⬜→ausgeliefert Was ist Effect? `Effect<A,E,R>` als lazy Beschreibung; vs Promise
2. ⬜ Typisierte Fehler — der erste echte Verkaufspunkt (vs throw/try-catch)
3. ⬜ Ausführen & Erzeugen — succeed/fail/tryPromise, runPromise/runSync
4. ⬜ Komposition — pipe & Effect.gen (das "async/await von Effect")
5. ⬜ Dependencies — R-Slot, Context/Service/Layer (DI im Typ)
6. ⬜ "Lohnt es sich?" — Trade-offs, Lernkurve, Ökosystem, wann ja/nein
7. ⬜ (falls ja) Sauberes Setup in einem TS-Projekt: Struktur, Fehlertypen, Layer

## Status
- Lektion 1 ausgeliefert. Noch keine Learning-Records (kein nachgewiesenes
  Können — erst nach Quiz/Demo anlegen).
