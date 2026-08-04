# Sponsoren als globale Stammdaten

Ein *Sponsor* (Firma inkl. Kontaktdaten) wird als **globale, wiederverwendbare Entität** modelliert — bewusst **abweichend** von *Material-Positionen* und *Helfern*, die pro Fest leben. Pro Fest verknüpft ein *Sponsoring* den globalen Sponsor mit dem Fest (Kategorien + Freibetrag); der Sponsor selbst wird nicht kopiert.

Grund: Sponsoren sind langlebige Kontakte, die über Jahre erneut angefragt werden (*Wiederkontaktierung*). Globale Stammdaten vermeiden Duplikate und Pflege-Drift bei Kontaktdaten und machen die *Sponsor-Übernahme* zu einer reinen Verknüpfung statt eines Kopiervorgangs. Material dagegen ist je Fest unterschiedlich (Mengen, Lieferanten) und hat keine fest-übergreifende Identität — daher pro Fest.

Konsequenz: Nur das *Sponsoring* (die Verknüpfung) und die *Sponsoring-Kategorien* sind fest-gebunden und werden mit dem Fest gelöscht; der Sponsor-Stammsatz bleibt bestehen. RLS folgt ADR 0001 (alle authentifizierten Benutzer dürfen lesen/anlegen/ändern; DELETE nur Ersteller).

Nachtrag: Die ursprüngliche Fassung begründete das global gehaltene Modell mit der Analogie „wie ein *Mitglied*". Diese Analogie ist hinfällig — **ADR 0005** hat den globalen Personenbestand abgeschafft, der *Helfer* gehört jetzt dem Fest. Die beiden Fälle stehen damit in Gegenrichtung, und der Unterschied ist die *Wiederkontaktierung*: beim Sponsor ist die Historie über Feste hinweg der fachliche Zweck, ein Helfer wird pro Fest neu eingeteilt. Zwei weitere Nachträge, die diese ADR nicht mehr selbst nennt: der Löschschutz des Stammsatzes ist seit **ADR 0010** `ON DELETE RESTRICT` (statt „DELETE nur Ersteller"), und ein Sponsoring trägt seit **ADR 0008** neben Kategorien und Freibetrag auch eine *Sachleistung*.
