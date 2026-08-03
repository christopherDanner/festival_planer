# Heizsystem-Optionen für teilsanierten Altbau (EFH vor 1980, NÖ)

Research zu Issue #140. Stand: 2026-08. Ausstieg aus Öl/Gas — realistische Optionen: Luft-Wasser-Wärmepumpe (LWP), Sole-Wasser-Wärmepumpe (SWP/Erdsonde), Pelletskessel, Fernwärme (falls verfügbar).

## TL;DR

- **Erster Schritt ist immer**: Heizlast klären + 55-Grad-Test (WP-Tauglichkeit mit bestehenden Heizkörpern) + geförderte Energieberatung NÖ.
- Besteht das Haus den Test bei ≤ 50–55 °C Vorlauf: **Wärmepumpe realistisch**, auch mit Heizkörpern.
- Fällt es durch und keine große Hüllensanierung geplant: **Pellets** (oder Fernwärme, falls Anschluss möglich) — beide vertragen hohe Vorlauftemperaturen problemlos.
- Ist eine Hüllensanierung ohnehin geplant/nötig: **erst dämmen, dann WP kleiner dimensionieren** (siehe unten).

## Entscheidungsbaum (vereinfacht)

```
Fernwärmeanschluss am Grundstück verfügbar/geplant?
├─ Ja → Fernwärme prüfen (Anschlusskosten, Arbeitspreis, Vertragsbindung) — oft einfachste Lösung
└─ Nein
   └─ 55-Grad-Test bestanden (Räume warm bei ≤50–55 °C Vorlauf an kaltem Tag)?
      ├─ Ja → Wärmepumpe
      │      ├─ Platz für Erdsonde/Kollektor + Budget → Sole-WP (beste JAZ, leise)
      │      └─ sonst → Luft-WP (Standard, günstigste WP-Variante)
      ├─ Knapp daneben (einzelne Räume kalt) → einzelne Heizkörper vergrößern /
      │      Niedertemperatur-HK, dann WP; oder erst Teildämmung (oberste Geschoßdecke,
      │      Kellerdecke, Fenster), dann WP
      └─ Nein, und keine Dämmung geplant → Pellets (Lagerraum ~5–7 m² nötig)
```

## Kriterien je System

### Luft-Wasser-Wärmepumpe
- **Passt wenn**: Vorlauf ≤ 55 °C (besser ≤ 45–50 °C), Heizwärmebedarf grob < 150 kWh/m²a, Heizlast eher < 12–15 kW, Aufstellplatz außen (Schall! Abstand zum Nachbarn), 400-V-Anschluss.
- **JAZ Altbau-Praxis**: ~3,0–3,5 (Median Feldmessungen ~3,4).
- **Invest**: günstigste WP-Option; **Betrieb**: strompreisabhängig, jedes Grad weniger Vorlauf spart ~2,5 % Strom.
- **Risiko**: bei hohem Vorlauf + schlechter Hülle frisst der Heizstab die Ersparnis.

### Sole-Wasser-Wärmepumpe (Erdsonde/Flachkollektor)
- **Passt wenn**: wie LWP, plus Grundstück bohr-/grabbar (Bewilligung Wasserrecht NÖ), Budget für Erschließung (Sonde typ. +8–15 k€ vs. LWP).
- **JAZ Altbau-Praxis**: ~4,0–4,5 (Median ~4,3) → 25–35 % weniger Strom als LWP; verzeiht damit etwas höhere Vorlauftemperaturen.
- **Invest hoch, Betrieb am günstigsten**; Sonde hält Jahrzehnte, kein Außengerät/Schall. Lohnt v. a. bei hohem verbleibendem Wärmebedarf (großes Haus, Teilsanierung bleibt Teilsanierung).

### Pelletskessel
- **Passt wenn**: hohe Vorlauftemperatur nötig (unsanierte/teilsanierte Hülle, kleine Radiatoren), Lager-/Kesselraum vorhanden (alter Öltankraum ideal), Zufahrt für Silo-LKW.
- **1:1-Ersatz für Ölkessel** ohne Umbau des Wärmeverteilsystems; CO₂-Einsparung vs. Öl ~90 %.
- **Invest** ähnlich WP (Kessel + Lager + Austragung); **Betrieb**: Pelletspreis volatil, aber langfristig ≈ WP-Niveau; Wartung/Kaminkehrer laufend; kein Nutzen aus PV-Strom.

### Fernwärme
- **Passt wenn**: Netz in der Straße (in NÖ v. a. Ortszentren, Biomasse-Nahwärme) — verfügbarkeitsgetrieben, keine echte "Wahl".
- **Invest am niedrigsten** (Übergabestation), kein Kessel/Lager/Wartung; hohe Vorlauftemperaturen kein Problem.
- **Nachteile**: Arbeitspreis + Grundgebühr nicht verhandelbar, Anbieterbindung; Preis- und Anschlusskonditionen vor Zusage genau prüfen.

## Faustregeln / Schnelltests

1. **55-Grad-Test (WP-Tauglichkeit)**: An einem sehr kalten Tag Kessel-Vorlauf auf 50–55 °C begrenzen, Thermostate auf ~20 °C. Werden alle Räume warm → WP-tauglich. Bei ~0 °C außen sollte der Vorlauf ≤ 45 °C reichen. ([Zukunft Altbau](https://www.zukunftaltbau.de/presse/presseinformationen/test-ist-mein-haus-fit-fuer-eine-waermepumpe/))
2. **Verbrauchs-Check**: Heizwärmebedarf > ~150 kWh/m²a (bzw. Ölverbrauch grob > 15 l/m²a) → vor WP-Einbau Hülle verbessern oder Pellets/Fernwärme wählen.
3. **Heizlast nie nach Altkessel dimensionieren**: Alte Öl-/Gaskessel sind fast immer stark überdimensioniert. Raumweise Heizlastberechnung (ÖNORM/EN 12831) machen lassen.
4. **Vorlauf senken lohnt immer**: Hydraulischer Abgleich + größere Heizkörper in 1–2 kritischen Räumen sind oft billiger als jede andere Maßnahme und machen die WP erst effizient (−2,5 % Strom je Grad).
5. **PV + WP**: PV deckt real ~20–35 % des WP-Stroms (Winterlücke!). PV rechtfertigt keine WP-Entscheidung allein, verbessert sie aber: PV-Strom ~9–12 ct/kWh vs. Netz ~20–25 ct → SG-Ready/PV-Signal + Pufferspeicher nutzen. Pellets/Fernwärme profitieren von PV nicht.
6. **Förderlage prüfen (aktuell halten!)**: Bundes-"Sanierungsoffensive"/Kesseltausch + Landesförderung NÖ; Konditionen ändern sich laufend — vor Beauftragung [umweltfoerderung.at](https://www.umweltfoerderung.at) und Land NÖ checken. Geförderte Erstberatung: [Energieberatung NÖ](https://www.energieberatung-noe.at).

## Hülle vor Heizung vs. Heizung zuerst

Grundregel (klimaaktiv-Linie, Baujahr < ~1984): **Hülle zuerst**, weil die Heizung auf die Heizlast *nach* Dämmung dimensioniert wird. Eine auf den unsanierten Zustand ausgelegte WP ist nach späterer Dämmung überdimensioniert → Takten, schlechtere JAZ, kürzere Lebensdauer, 5–15 k€ unnötige Mehrkosten.

**"Erst Hülle, dann kleinere WP" wenn:**
- Dämmung (Fassade/oberste Geschoßdecke/Fenster) in den nächsten ~5 Jahren ohnehin geplant oder Bauteile am Lebensende sind,
- 55-Grad-Test *nicht* bestanden wird — Dämmung senkt die nötige Vorlauftemperatur und macht die WP erst tauglich,
- der Altkessel noch funktioniert (kein Zeitdruck) — dann Reihenfolge: oberste Geschoßdecke + Kellerdecke (billig, schnell) → Fenster/Fassade → Heizlast neu rechnen → WP klein dimensionieren.

**"Heizung zuerst" wenn:**
- der Kessel akut kaputt/am Ende ist (kein Warten möglich),
- keine Hüllensanierung in absehbarer Zeit leistbar/gewollt ist → System wählen, das zum Ist-Zustand passt (Pellets/Fernwärme, oder WP falls Test trotzdem bestanden),
- Fernwärmeanschluss nur jetzt (Bauphase des Netzes) günstig möglich ist,
- Förderfenster ausläuft und die Hülle sich nicht kurzfristig ändern lässt.

**Pragmatischer Mittelweg bei Kessel-Notfall + geplanter Dämmung**: WP auf Ziel-Heizlast (nach Dämmung) auslegen + Spitzenlast übergangsweise mit Heizstab/bestehendem Kessel bivalent abdecken; oder Sofortmaßnahmen (oberste Geschoßdecke dämmen, hydraulischer Abgleich) vorziehen — die kosten wenig und reduzieren die Dimensionierungslücke sofort.

## Quellen

- klimaaktiv: [Sanierung und Heizungsumstellung](https://www.klimaaktiv.at/publikationen/sanierung-und-heizungsumstellung) (Publikation, BMK)
- [Energieberatung NÖ](https://www.energieberatung-noe.at) — geförderte, firmenunabhängige Beratung (Erstanlaufstelle)
- Zukunft Altbau: [Test — Ist mein Haus fit für eine Wärmepumpe? (55-Grad-Test)](https://www.zukunftaltbau.de/presse/presseinformationen/test-ist-mein-haus-fit-fuer-eine-waermepumpe/)
- co2online: [Wärmepumpen-Arten im Vergleich (JAZ Luft vs. Sole)](https://www.co2online.de/modernisieren-und-bauen/waermepumpe/waermepumpe-arten-im-vergleich/)
- TGA: [Heizsysteme im CO₂-Vergleich — Pellets und Wärmepumpe](https://tga.at/errichten/co2-heizungstausch-pellets-waermepumpe)
- effizienzhaus-online: [Dämmung oder Heizung — die richtige Reihenfolge](https://www.effizienzhaus-online.de/daemmung-oder-heizung/)
- sanier.de: [Dämmung oder Heizung — Reihenfolge bei der Sanierung](https://www.sanier.de/altbausanierung/daemmung-oder-heizung-die-richtige-reihenfolge-bei-der-sanierung)
- ingenieur.de: [Altbau kann Wärmepumpe — wenn Planung und Details stimmen](https://www.ingenieur.de/technik/fachbereiche/energie/altbau-kann-waermepumpe-wenn-planung-und-details-stimmen/)
- [umweltfoerderung.at](https://www.umweltfoerderung.at) — aktuelle Bundesförderung Kesseltausch

*Hinweis: Kosten-/Förderangaben sind Momentaufnahmen (2026) und vor Entscheidung zu verifizieren. Einzelne Quellen sind deutsche Fachportale — physikalische Faustregeln übertragbar, Förderungen nicht.*
