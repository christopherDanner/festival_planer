# Mission: Effect (Effect-TS) verstehen & einschätzen

## Why
Christopher will **verstehen, was Effect (Effect-TS) eigentlich ist** und ob
sich der Einsatz lohnt. Noch kein konkretes Projekt-Commitment — erst das
mentale Modell, dann eine fundierte Bauchgefühl-freie Entscheidung
"einsetzen: ja/nein". Sekundärziel (später, falls Entscheidung = ja): wissen,
wie man Effect **sauber** in ein TypeScript-Projekt einbaut.

## Success looks like
- Kann den Typ `Effect<A, E, R>` lesen und in einem Satz erklären, was jeder
  der drei Slots bedeutet.
- Kann benennen, was Effect gegenüber `Promise` + `try/catch` löst (sichtbare
  & typisierte Fehler, Dependencies im Typ, lazy/komponierbar).
- Kann die zentrale Eigenschaft "Effect ist eine *Beschreibung*, kein
  laufendes Programm" erklären und weiß, dass man es explizit ausführen muss
  (`runPromise`/`runSync`).
- Kann am Ende begründet sagen: "Für Projekt X lohnt sich Effect, weil… / lohnt
  sich nicht, weil…" — inkl. Lernkurve & Ökosystem-Trade-offs.
- (Stretch) Kann ein kleines Effect-Programm sauber strukturiert aufsetzen
  (Setup, Fehler-Typen, Service/Layer-Grundgerüst).

## Constraints
- Vorwissen: **TypeScript stark** (async/Promise/Generics sitzen), aber
  **funktionale Effect-Systeme / Either / pipe sind neu**.
- Lernstil: hands-on, knapp, Deutsch. Kontrast zu bereits Bekanntem (Promise,
  try/catch) als Brücke nutzen.
- Arbeitet lokal auf **Windows** → Lektion-Öffnen-Befehle Windows-tauglich
  (`start ...`).

## Out of scope (vorerst)
- Tiefe FP-Theorie (Monaden-Gesetze, Kategorientheorie) — nur so viel wie nötig.
- Komplette Bibliotheks-Tour (Schema, SQL, Platform, RPC) — erst Kern.
- Migration eines bestehenden Codebase auf Effect — erst "lohnt es sich?".
