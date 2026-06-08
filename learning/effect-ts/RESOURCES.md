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

## tRPC ↔ Effect (Lektion 2)
- **macwright — Effect notes: tRPC** — Effect in tRPC integrieren: Result/Exit
  → throw, Helfer via Middleware/Context; Schema-Validator-Reibung.
  https://macwright.com/2026/01/06/effect-trpc
- **titouancreach (DEV) — tRPC durch @effect/rpc ersetzt (Next.js)** —
  Erfahrungsbericht, Input/Output-Schema-Mismatch, Streaming (Teil 2).
  https://dev.to/titouancreach/how-i-replaced-trpc-with-effect-rpc-in-a-nextjs-app-router-application-4j8p
- **Effect-Community (answeroverflow) — ManagedRuntime + Effect.fn in tRPC** —
  `Effect.fn(...)().pipe(MyRuntime.runPromise)`, bessere Stacktraces.
  https://www.answeroverflow.com/m/1450782555644362894
- **Harbor — "Why we love FP but don't use Effect-TS" (2025-11)** — fundierte
  Gegenstimme; Kosten/Lernkurve. https://runharbor.com/blog/2025-11-24-why-we-dont-use-effect-ts
- **tRPC Docs — Procedures / Validators** — Primärquelle Transport-Achse.
  https://trpc.io/docs/server/procedures

*Hinweis: macwright & dev.to liefern bei direktem Fetch 403 — im Browser öffnen.*

## Community / Wisdom (real-world testen)
- **Effect Discord** — offizielle Community, sehr aktiv (Link via effect.website).
- **r/typescript** & GitHub `Effect-TS/effect` Discussions.

## Status
- Lektion 1 stützt sich auf "The Effect Type" + Tweag/Suche-Konsens.
- TODO: "Why Effect" + "Creating Effects" verbatim gegenlesen vor Lektion 2.
