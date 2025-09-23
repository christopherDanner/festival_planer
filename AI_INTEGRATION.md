# Mistral AI Integration

## Übersicht

Die Anwendung verwendet jetzt echte Mistral AI-Integration für die Generierung von intelligenten Stationen und Schichten für Feste. Die manuelle if-else-Logik wurde komplett entfernt und durch echte AI-Aufrufe ersetzt.

## Installation

### 1. Mistral AI Package installieren

```bash
npm install @mistralai/mistralai
```

## Konfiguration

### 1. Mistral API Key

Erstellen Sie eine `.env` Datei im Projektroot und fügen Sie Ihren Mistral API Key hinzu:

```env
VITE_MISTRAL_API_KEY=your_mistral_api_key_here
```

### 2. Mistral API Key erhalten

1. Besuchen Sie [Mistral AI](https://console.mistral.ai/)
2. Erstellen Sie ein Konto
3. Generieren Sie einen API Key
4. Fügen Sie den Key zur `.env` Datei hinzu

## Funktionalität

### AI-Service (`src/lib/aiService.ts`)

Der AI-Service bietet drei Hauptfunktionen:

1. **`generateFestivalStations(context)`** - Generiert passende Stationen basierend auf:

   - Festname und -typ
   - Besucherzahl
   - Österreichische Festtraditionen
   - Praktische Erfordernisse

2. **`generateFestivalShifts(context)`** - Generiert passende Schichten basierend auf:

   - Festdauer (ein- oder mehrtägig)
   - Typische österreichische Festzeiten
   - Besucherzahl und Personalbedarf
   - Praktische Arbeitszeiten

3. **`generateFestivalInsights(context)`** - Generiert hilfreiche Tipps und Warnungen:
   - Besondere Anforderungen für den Festtyp
   - Warnungen bei der Besucherzahl
   - Österreichische Besonderheiten
   - Praktische Tipps

### Fallback-Verhalten

Wenn kein Mistral API Key konfiguriert ist oder die API nicht erreichbar ist, verwendet die Anwendung automatisch Fallback-Vorschläge, damit die Funktionalität weiterhin verfügbar bleibt.

## Beispiel-Prompts

### Stationen-Prompt

```
Analysiere das folgende Fest und schlage passende Stationen vor:

**Fest-Informationen:**
- Name: "Sommerfest 2024"
- Typ: feuerwehr
- Ort: Gemeindezentrum
- Datum: am 15.06.2024
- Erwartete Besucher: 300-800 Besucher

**Aufgabe:**
Erstelle eine Liste von 3-8 Stationen, die für dieses spezifische Fest sinnvoll sind...
```

### Schichten-Prompt

```
Analysiere das folgende Fest und schlage passende Schichten vor:

**Fest-Informationen:**
- Name: "Weihnachtsmarkt"
- Typ: weihnachten
- Ort: Marktplatz
- Datum: vom 01.12.2024 bis 24.12.2024
- Erwartete Besucher: 100-300 Besucher

**Aufgabe:**
Erstelle eine Liste von Schichten für dieses Fest...
```

## Vorteile der AI-Integration

1. **Flexibilität**: Keine starren Regeln, sondern echte KI-basierte Analyse
2. **Spezifität**: Jede Station wird für das spezifische Fest generiert
3. **Skalierbarkeit**: Funktioniert mit jedem Festtyp und jeder Besucherzahl
4. **Lokalisierung**: Berücksichtigt österreichische Besonderheiten
5. **Erklärbarkeit**: Jede Station hat eine Erklärung, warum sie vorgeschlagen wird

## Technische Details

- **Package**: `@mistralai/mistralai` (offizielles Mistral AI SDK)
- **Model**: `mistral-small-latest`
- **Temperature**: 0.7 (für kreative Vorschläge)
- **Max Tokens**: 2000 (für Stationen), 1500 (für Schichten), 1000 (für Insights)
- **Format**: JSON-Ausgabe für strukturierte Daten mit `responseFormat: { type: 'json_object' }`
- **Error Handling**: Automatischer Fallback bei API-Fehlern
- **Performance**: Timing-Logs für alle AI-Aufrufe

## Entwicklung

### Neue AI-Features hinzufügen

1. Erweitern Sie die `AIService` Klasse in `src/lib/aiService.ts`
2. Fügen Sie neue Prompt-Templates hinzu
3. Implementieren Sie JSON-Parsing für die Antworten
4. Aktualisieren Sie die UI-Komponenten entsprechend

### Testing

Die AI-Integration kann mit verschiedenen Festtypen getestet werden:

- Feuerwehrfeste
- Musikfeste
- Weinfeste
- Weihnachtsmärkte
- Bälle
- Familienfeste

Jeder Festtyp sollte spezifische, relevante Stationen und Schichten generieren.
