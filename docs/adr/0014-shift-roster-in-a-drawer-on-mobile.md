# Die Helferliste liegt am Handy in einer Schublade, nicht unter dem Fokus-Kasten

DESIGN-VISION §6 legt fürs Handy fest: „Sidebars werden zu Blöcken (**Helferliste unter den Fokus**, Programmzettel unter die Werkliste, Plakat im Dashboard nach oben)." Für den Schichtplan (#105) gilt das **nicht** — dort steht die Helferliste in einer Schublade hinter einem FAB.

Grund ist die Länge des Fokus-Kastens. Mit den Tages-Zwischentiteln aus #102 trägt eine Station bis zu 13 Schicht-Zeilen plus vier Tagesköpfe; am Handy steht jeder Platz zudem einzeln untereinander. Läge die Liste darunter, kostete **jede einzelne Zuteilung zwei lange Scroll-Wege** — hinunter zur Marke, hinauf zum Platz —, und die freien Plätze, auf die es ankommt, sähe man erst wieder, nachdem man schon hochgescrollt ist. Die Schublade legt sich über den Kasten, schiebt sich bei der Wahl selbst zu und lässt das Ziel stehen, wo es war. Gemessen am Prototyp `design-vision/entscheid-schichtplan-mobil.html`, der beide Fassungen bedienbar nebeneinanderstellt und die Scroll-Wege mitzählt; abgenommen wurde Variante **B**.

§6 kennt die Ausnahme dem Muster nach bereits: für die Navigation erlaubt es ausdrücklich eine abweichende Implementierung (#56, Bottom-Tab-Bar statt scrollender Reiter).

## Considered Options

- **Block unter dem Fokus (§6 wörtlich)** — verworfen, Variante A des Prototyps. Ein Code-Pfad, kein FAB, kein Drawer; aber Marke und Platz liegen fast nie gleichzeitig im Bild.
- **Helferliste über den Fokus-Kasten** — verworfen. Dann läge die Arbeit unter der Liste statt umgekehrt; das Scroll-Paar bleibt, nur die Richtung dreht sich.
- **Dropdown statt Schublade** — verworfen. Suche, Segment-Filter mit Zählern und die Gruppierung nach Wunsch-Passung sind der halbe Nutzen der Liste; ein Auswahlfeld wirft sie weg.

## Consequences

- Der Bereich hat am Handy **zwei zusätzliche Bauteile**, die es am Desktop nicht gibt: den FAB samt Schublade (`HelperDrawer`) und den Auswahl-Streifen (`HelperSelectionBar`). Die Liste selbst bleibt **eine** (`HelperRosterBody`) — beide Gestalten nehmen denselben Satz Props.
- Weil die gewählte Marke in der zugeschobenen Schublade liegt, braucht die Auswahl eine eigene Anzeige: der Streifen klebt oben und nennt den Namen. Damit darf **kein Vorfahr des Bereichs `overflow` oder `transform` setzen** — beides nähme `position: sticky` die Wirkung.
- Damit auch das *Ziel* sichtbar ist, stehen freie Plätze bei getroffener Wahl **scharf** (`OpenSlot armed`): Tinte statt Rot, durchgezogen statt gestrichelt, gelber Innenring. Das gilt an beiden Breiten — die Geste ist dieselbe.
- Dieselbe Geste trägt die Materialliste bereits (#116, Gruppen-Schublade): zwei Bereiche, ein Idiom, eine `ui/drawer`-Hülle (ADR 0003).
- Für die anderen Bereiche bleibt §6 unangetastet — Ablaufplan (#125) und Dashboard fallen weiter auf Blöcke.
