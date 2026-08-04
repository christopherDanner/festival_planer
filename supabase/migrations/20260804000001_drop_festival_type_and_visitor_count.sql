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
-- IF EXISTS, weil festivals älter ist als dieser Ordner und hier keine
-- Create-Migration hat — in einer Kopie des Schemas können die Spalten
-- schon fehlen.

ALTER TABLE festivals DROP COLUMN IF EXISTS type;
ALTER TABLE festivals DROP COLUMN IF EXISTS visitor_count;
