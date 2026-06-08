# Resources — Effect (Effect-TS)

Qualität > Menge. Offizielle Docs sind die Primärquelle (Wahrheit), Blogs nur
als Brücke/Zweitmeinung.

## Primär (offiziell)
- **Effect Docs — Why Effect** — Begründung & Kernfeatures.
  https://effect.website/docs/getting-started/why-effect/
  *Status: Pflichtlektüre. (Direkter Fetch 403 — im Browser öffnen.)*
- **Effect Docs — The Effect Type** — `Effect<Success, Error, Requirements>`.
  https://effect.website/docs/getting-started/the-effect-type/
  *Status: Pflichtlektüre. Grundlage für Lektion 1.*
- **Effect Docs — Creating Effects** — `succeed`, `fail`, `sync`, `promise`,
  `tryPromise`.
  https://effect.website/docs/getting-started/creating-effects/
- **Effect Docs — Expected Errors** — typisierte Fehler, `catchTag`.
  https://effect.website/docs/error-management/expected-errors/
- **API-Referenz `Effect.ts`** — vollständige API.
  https://effect-ts.github.io/effect/effect/Effect.ts.html

## Brücken / Tutorials (Zweitmeinung, neutral)
- **Tweag — Exploring Effect in TypeScript** — Async & Error-Handling, guter
  Promise-Kontrast. https://www.tweag.io/blog/2024-11-07-typescript-effect/
- **typeonce.dev — Effect Beginners: Complete Getting Started** — Kurs,
  `tryPromise` & typsichere Fehler.
  https://www.typeonce.dev/course/effect-beginners-complete-getting-started/
- **noqta.tn (2026) — Type-Safe Error Handling, Services, Pipelines** —
  produktionsnah. https://noqta.tn/en/tutorials/effect-ts-typescript-error-handling-pipelines-2026

## Community / Wisdom (real-world testen)
- **Effect Discord** — offizielle Community, sehr aktiv (Link via effect.website).
- **r/typescript** & GitHub `Effect-TS/effect` Discussions.

## Status
- Lektion 1 stützt sich auf "The Effect Type" + Tweag/Suche-Konsens.
- TODO: "Why Effect" + "Creating Effects" verbatim gegenlesen vor Lektion 2.
