# Vorwissen: nutzt aktiv tRPC in einem anderen TS-Monorepo

Christopher setzt in einem separaten TS-Monorepo aktiv **tRPC** ein und denkt in
dessen Begriffen (Router, Procedures, end-to-end Typsicherheit). tRPC ist damit
der stärkste verfügbare Anker für die Effect-Brücken-Didaktik — künftige
Lektionen sollten Effect-Konzepte gegen tRPC/Promise kontrastieren, nicht nur
gegen abstrakte Beispiele.

Implikation: Die "lohnt es sich?"-Entscheidung wird sich an einem realen
tRPC-Projekt entscheiden → der inkrementelle Kombi-Weg (Effect im Handler,
tRPC als Transport) ist für ihn relevanter als ein Greenfield-@effect/rpc-Setup.
Noch **kein nachgewiesenes Können** zu diesem Thema (Quiz/Demo ausstehend).
