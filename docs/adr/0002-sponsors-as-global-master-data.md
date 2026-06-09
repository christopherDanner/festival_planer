# Sponsoren als globale Stammdaten

Ein *Sponsor* (Firma inkl. Kontaktdaten) wird als **globale, wiederverwendbare Entität** modelliert — wie ein *Mitglied* und bewusst **abweichend** von *Material-Positionen*, die pro Fest leben. Pro Fest verknüpft ein *Sponsoring* den globalen Sponsor mit dem Fest (Kategorien + Freibetrag); der Sponsor selbst wird nicht kopiert.

Grund: Sponsoren sind langlebige Kontakte, die über Jahre erneut angefragt werden (*Wiederkontaktierung*). Globale Stammdaten vermeiden Duplikate und Pflege-Drift bei Kontaktdaten und machen die *Sponsor-Übernahme* zu einer reinen Verknüpfung statt eines Kopiervorgangs. Material dagegen ist je Fest unterschiedlich (Mengen, Lieferanten) und hat keine fest-übergreifende Identität — daher pro Fest.

Konsequenz: Nur das *Sponsoring* (die Verknüpfung) und die *Sponsoring-Kategorien* sind fest-gebunden und werden mit dem Fest gelöscht; der Sponsor-Stammsatz bleibt bestehen. RLS folgt ADR 0001 (alle authentifizierten Benutzer dürfen lesen/anlegen/ändern; DELETE nur Ersteller).
