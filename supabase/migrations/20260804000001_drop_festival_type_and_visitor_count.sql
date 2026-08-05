-- type + visitor_count aus festivals entfernen (#91, Entscheid in #64)
--
-- Beide Spalten wurden nirgends gelesen: `type` schrieb createFestival fest
-- verdrahtet als 'kirtag', `visitor_count` der Kopierwerk-Wizard fest als
-- 'medium'. Weil sie NOT NULL ohne Default waren, hätte "einfach nicht mehr
-- schreiben" das Anlegen eines Fests gebrochen — die Migration braucht es also
-- ohnehin. Entschieden wurde löschen statt Default setzen oder sichtbar machen:
-- das Datenmodell soll keinen "Fest-Typ" und keine "Besucherzahl" mehr
-- behaupten, die es nicht gibt.
--
-- IF EXISTS macht die beiden Schritte wiederholbar (die Migration darf zweimal
-- laufen). Die Tabelle selbst ist nicht geguardet: festivals ist älter als
-- dieser Ordner und hat hier keine Create-Migration, dieser Ordner allein baut
-- das Schema also nicht auf — gleiche Annahme wie 20260513000001.
--
-- Zwei Reihenfolgen hängen daran:
--   * Deploy: der Frontend-Stand schreibt die Spalten nicht mehr, sie sind bis
--     hierher aber NOT NULL ohne Default. Diese Migration muss vor (oder mit)
--     dem Deploy laufen, sonst scheitert jedes Anlegen an 23502.
--   * Typen: `supabase gen types` erst NACH dieser Migration laufen lassen,
--     sonst kommen beide Spalten als verpflichtendes Insert-Feld zurück.

ALTER TABLE festivals DROP COLUMN IF EXISTS type;
ALTER TABLE festivals DROP COLUMN IF EXISTS visitor_count;
