# Material-Übernahme & Export-Anpassung

**Datum:** 2026-03-30
**Ziel:** Materialien von einem vergangenen Fest kontrolliert ins neue Fest übernehmen. Exports so anpassen, dass Stationsführende Bestellt/Ist-Mengen vergleichen und Wunschmengen eintragen können.

---

## 1. Feature: "Material übernehmen"-Dialog

### Auslöser
Neuer Button **"Übernehmen"** in der `MaterialListHeader` (neben Export, Abgleich, Import, Neu). Icon: `ClipboardCopy` oder `ArrowDownToLine`.

### Workflow

**Schritt 1 — Quellfest wählen:**
- Dropdown mit allen eigenen Festivals (via `getUserFestivals()`), **ohne** das aktuelle Festival
- Sortiert nach `start_date` absteigend (neuestes zuerst)
- Anzeige: Festname + Datum

**Schritt 2 — Positionen prüfen & Wunschmenge eintragen:**
- Tabelle mit allen Materialien des Quellfests (via `getMaterials(sourceFestivalId)`)
- **Spalten:**
  - Checkbox (Auswahl)
  - Name
  - Station (aus dem Quellfest)
  - Lieferant
  - Einheit
  - VE (Verpackungseinheit)
  - Menge/VE
  - Bestellt (ordered_quantity des Quellfests)
  - Ist-Menge (actual_quantity des Quellfests)
  - **Wunschmenge** (editierbares Input-Feld, standardmäßig leer)

- **Name-Match gegen Zielfest:** Für jede Position wird geprüft, ob im aktuellen (Ziel-)Festival bereits ein Material mit gleichem Namen existiert (case-insensitive, trimmed).
  - **Bereits vorhanden:** Zeile wird visuell gedämpft dargestellt + Badge "bereits vorhanden". Checkbox ist standardmäßig **abgewählt**. User kann sie trotzdem aktivieren — dann wird beim Bestätigen die `ordered_quantity` des bestehenden Materials im Zielfest überschrieben.
  - **Neu:** Checkbox standardmäßig **aktiviert**, sobald eine Wunschmenge eingetragen wird. Ohne Wunschmenge bleibt die Checkbox deaktiviert.

**Schritt 3 — Bestätigen:**
- Zusammenfassung: "X neue Positionen übernehmen, Y bestehende aktualisieren"
- Button "Übernehmen" führt die Aktion aus:
  - **Neue Positionen:** `createMaterialsBulk()` mit:
    - `festival_id` = Zielfest
    - `name`, `supplier`, `unit`, `packaging_unit`, `amount_per_packaging`, `notes` → vom Quellfest übernommen
    - `station_id` → Wird über den Stationsnamen gemappt: Wenn im Zielfest eine Station mit gleichem Namen existiert, wird deren ID verwendet. Sonst `null`.
    - `ordered_quantity` = eingetragene Wunschmenge
    - `actual_quantity` = `null`
    - `unit_price` = `null`, `tax_rate` = `null` (Preis wird nicht übernommen)
    - `price_is_net` = `true` (Default), `price_per` = `'unit'` (Default)
    - `category` → vom Quellfest übernommen
  - **Bestehende Positionen** (bewusst aktiviert): `updateMaterial()` — nur `ordered_quantity` wird mit der Wunschmenge überschrieben.

### Komponenten-Struktur

- `src/components/material-list/dialogs/MaterialTransferDialog.tsx` — Der Dialog
- Nutzt bestehende Services: `getMaterials`, `getUserFestivals`, `createMaterialsBulk`, `updateMaterial`
- Neuer Eintrag in `DialogState`: `{ type: 'transfer' }`

---

## 2. Export-Anpassung (PDF & Excel)

Die bestehenden Export-Funktionen in `materialExportService.ts` werden umgebaut.

### Neue Spalten

**Standard (alle Stationen):**
Name, Lieferant, Station, Einheit, VE, Menge/VE, Bestellt, Ist-Menge, Neue Menge (leer)

**Gefiltert auf eine Station:**
Name, Lieferant, Einheit, VE, Menge/VE, Bestellt, Ist-Menge, Neue Menge (leer)
→ Station-Spalte entfällt, Station steht bereits im Untertitel.

### Entfernte Spalten
- Kategorie
- Netto, Brutto, MwSt %, Gesamt (alle Preisspalten)
- Notizen (im Excel)

### Erklärungstext

Zwischen Überschrift/Untertitel und Tabelle wird folgender Text eingefügt:

> „Diese Liste zeigt die bestellten und tatsächlich verbrauchten Mengen des Festes [Festname]. Bitte tragen Sie in der Spalte ‚Neue Menge' die gewünschte Bestellmenge für das kommende Fest ein und geben Sie die ausgefüllte Liste an den Festverantwortlichen zurück."

### PDF-spezifisch
- Format bleibt A4 portrait
- "Neue Menge"-Spalte bekommt einen leichten Hintergrund (z.B. helles Gelb), damit klar ist, dass dort eingetragen werden soll
- Ist-Menge-Highlight (hellblau) bleibt
- Keine Kostensumme mehr im Footer, nur noch Anzahl Positionen
- Erklärungstext in Schriftgröße 9, kursiv

### Excel-spezifisch
- "Neue Menge"-Spalte ist die letzte Spalte, leer
- Erklärungstext als zusammengeführte Zelle oberhalb der Tabelle (Zeilen 3-4, nach der Überschrift in Zeile 1 und Untertitel in Zeile 2)
- Keine Summary-Row mit Kosten mehr, nur Anzahl Positionen

### Export-Optionen Interface
Das bestehende `MaterialExportOptions`-Interface bekommt ein neues Feld:
```ts
export interface MaterialExportOptions {
  festivalName: string;
  materials: FestivalMaterialWithStation[];
  filterLabel?: string;
  isStationFiltered?: boolean; // true wenn nach einer einzelnen Station gefiltert
}
```

Der `MaterialExportDialog` übergibt `isStationFiltered: true`, wenn `filterMode === 'station'` und eine Station ausgewählt ist. Die Export-Funktionen nutzen das, um die Station-Spalte auszublenden.

---

## 3. Service-Erweiterung

### materialService.ts
`updateMaterialsBulk` wird erweitert, damit auch `ordered_quantity` aktualisiert werden kann:

```ts
export const updateMaterialsBulk = async (
  updates: { id: string; actual_quantity?: number; unit_price?: number | null; ordered_quantity?: number }[]
): Promise<void> => {
  for (const u of updates) {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (u.actual_quantity !== undefined) updateData.actual_quantity = u.actual_quantity;
    if (u.unit_price !== undefined) updateData.unit_price = u.unit_price;
    if (u.ordered_quantity !== undefined) updateData.ordered_quantity = u.ordered_quantity;
    const { error } = await (supabase as any)
      .from('festival_materials')
      .update(updateData)
      .eq('id', u.id);
    if (error) throw error;
  }
};
```

---

## 4. Nicht im Scope

- Keine neue Route oder Seite
- Keine Berechtigungen/RLS-Änderungen (User sieht ohnehin nur eigene Daten)
- Keine neuen DB-Migrationen nötig
- Kein Re-Import von ausgefüllten Excel-Listen (kann später ergänzt werden)
- Preise werden bewusst nicht exportiert und nicht übernommen
