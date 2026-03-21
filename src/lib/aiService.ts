import { Mistral } from '@mistralai/mistralai';

export interface AIStation {
	name: string;
	description: string;
	required_people: number;
	aiReason: string;
}

export interface AIShift {
	name: string;
	start_time: string;
	end_time: string;
	start_date: string;
}

export interface AIInsight {
	type: 'info' | 'warning' | 'success';
	title: string;
	message: string;
	icon: string;
}

export interface FestivalContext {
	name: string;
	type?: string;
	location: string;
	startDate: string;
	endDate?: string;
	visitorCount: string;
}

export interface AIMaterialItem {
	name: string;
	category: string | null;
	supplier: string | null;
	unit: string;
	packaging_unit: string | null;
	amount_per_packaging: number | null;
	ordered_quantity: number;
	unit_price: number | null;
	tax_rate: number | null;
	price_is_net: boolean;
	price_per: string;
	notes: string | null;
}

class AIService {
	private client: Mistral | null = null;

	constructor() {
		const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
		if (apiKey) {
			this.client = new Mistral({ apiKey });
			console.log('Mistral AI client initialized successfully');
		} else {
			console.warn('Mistral API key not configured');
		}
	}

	async generateFestivalStations(context: FestivalContext): Promise<AIStation[]> {
		if (!this.client) {
			console.warn('Mistral API key not configured, using fallback');
			return this.getFallbackStations(context);
		}

		const prompt = this.buildStationPrompt(context);

		try {
			const startTime = Date.now();
			const response = await this.client.chat.complete({
				model: 'mistral-small-latest',
				messages: [
					{
						role: 'system',
						content:
							'Du bist ein Experte für österreichische Feste und Veranstaltungen. Du hilfst bei der Planung von Stationen und Schichten für verschiedene Festtypen.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.7,
				maxTokens: 2000,
				responseFormat: {
					type: 'json_object'
				}
			});

			const endTime = Date.now();
			console.log(`[Mistral] Station generation took ${endTime - startTime}ms`);

			const content = response.choices[0]?.message?.content;
			if (typeof content !== 'string') {
				throw new Error('Unexpected content format from Mistral AI');
			}

			if (!content) {
				throw new Error('No content received from Mistral AI');
			}

			return this.parseStationResponse(content);
		} catch (error) {
			console.error('Error calling Mistral AI:', error);
			return this.getFallbackStations(context);
		}
	}

	async generateFestivalShifts(context: FestivalContext): Promise<AIShift[]> {
		if (!this.client) {
			console.warn('Mistral API key not configured, using fallback');
			return this.getFallbackShifts(context);
		}

		const prompt = this.buildShiftPrompt(context);

		try {
			const startTime = Date.now();
			const response = await this.client.chat.complete({
				model: 'mistral-small-latest',
				messages: [
					{
						role: 'system',
						content:
							'Du bist ein Experte für österreichische Feste und Veranstaltungen. Du hilfst bei der Planung von Schichten für verschiedene Festtypen.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.7,
				maxTokens: 1500,
				responseFormat: {
					type: 'json_object'
				}
			});

			const endTime = Date.now();
			console.log(`[Mistral] Shift generation took ${endTime - startTime}ms`);

			const content = response.choices[0]?.message?.content;
			if (typeof content !== 'string') {
				throw new Error('Unexpected content format from Mistral AI');
			}

			if (!content) {
				throw new Error('No content received from Mistral AI');
			}

			return this.parseShiftResponse(content);
		} catch (error) {
			console.error('Error calling Mistral AI:', error);
			return this.getFallbackShifts(context);
		}
	}

	async generateFestivalInsights(context: FestivalContext): Promise<AIInsight[]> {
		if (!this.client) {
			console.warn('Mistral API key not configured, using fallback');
			return this.getFallbackInsights(context);
		}

		const prompt = this.buildInsightPrompt(context);

		try {
			const startTime = Date.now();
			const response = await this.client.chat.complete({
				model: 'mistral-small-latest',
				messages: [
					{
						role: 'system',
						content:
							'Du bist ein Experte für österreichische Feste und Veranstaltungen. Du gibst hilfreiche Tipps und Warnungen für die Festplanung.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.5,
				maxTokens: 1000,
				responseFormat: {
					type: 'json_object'
				}
			});

			const endTime = Date.now();
			console.log(`[Mistral] Insight generation took ${endTime - startTime}ms`);

			const content = response.choices[0]?.message?.content;
			if (typeof content !== 'string') {
				throw new Error('Unexpected content format from Mistral AI');
			}

			if (!content) {
				throw new Error('No content received from Mistral AI');
			}

			return this.parseInsightResponse(content);
		} catch (error) {
			console.error('Error calling Mistral AI:', error);
			return this.getFallbackInsights(context);
		}
	}

	async extractMaterialsFromText(text: string): Promise<AIMaterialItem[]> {
		if (!this.client) {
			throw new Error('Mistral API key nicht konfiguriert. KI-Import ist nicht verfügbar.');
		}

		const prompt = this.buildMaterialExtractionPrompt();

		try {
			const startTime = Date.now();
			const response = await this.client.chat.complete({
				model: 'mistral-medium-latest',
				messages: [
					{ role: 'system', content: prompt },
					{ role: 'user', content: `Extrahiere alle Bestellpositionen aus folgendem Text:\n\n${text}` }
				],
				temperature: 0.3,
				maxTokens: 16000,
				responseFormat: { type: 'json_object' }
			});

			const endTime = Date.now();
			console.log(`[Mistral] Material text extraction took ${endTime - startTime}ms`);

			const content = response.choices[0]?.message?.content;
			if (typeof content !== 'string' || !content) {
				throw new Error('Keine Antwort von Mistral AI erhalten');
			}

			return this.parseMaterialResponse(content);
		} catch (error) {
			console.error('Error extracting materials from text:', error);
			throw error;
		}
	}

	async extractMaterialsFromImage(base64DataUrl: string): Promise<AIMaterialItem[]> {
		if (!this.client) {
			throw new Error('Mistral API key nicht konfiguriert. KI-Import ist nicht verfügbar.');
		}

		const prompt = this.buildMaterialExtractionPrompt();

		try {
			const startTime = Date.now();
			const response = await this.client.chat.complete({
				model: 'pixtral-12b-2409',
				messages: [
					{ role: 'system', content: prompt },
					{
						role: 'user',
						content: [
							{ type: 'text', text: 'Extrahiere alle Bestellpositionen aus diesem Bild:' },
							{ type: 'image_url', imageUrl: base64DataUrl }
						] as any
					}
				],
				temperature: 0.3,
				maxTokens: 4000,
				responseFormat: { type: 'json_object' }
			});

			const endTime = Date.now();
			console.log(`[Mistral] Material image extraction took ${endTime - startTime}ms`);

			const content = response.choices[0]?.message?.content;
			if (typeof content !== 'string' || !content) {
				throw new Error('Keine Antwort von Mistral AI erhalten');
			}

			return this.parseMaterialResponse(content);
		} catch (error) {
			console.error('Error extracting materials from image:', error);
			throw error;
		}
	}

	async extractTextFromPdfViaOcr(fileBytes: Uint8Array, fileName: string): Promise<string> {
		if (!this.client) {
			throw new Error('Mistral API key nicht konfiguriert. KI-Import ist nicht verfügbar.');
		}

		try {
			const startTime = Date.now();

			const uploaded = await this.client.files.upload({
				file: {
					fileName: fileName,
					content: fileBytes
				},
				purpose: 'ocr' as any
			});

			const ocrResult = await (this.client as any).ocr.process({
				model: 'mistral-ocr-latest',
				document: {
					type: 'file_id',
					fileId: uploaded.id
				}
			});

			const endTime = Date.now();
			console.log(`[Mistral] PDF OCR took ${endTime - startTime}ms`);

			const pages = ocrResult?.pages || [];
			return pages.map((p: any) => p.markdown || '').join('\n\n');
		} catch (error) {
			console.error('Error extracting text from PDF via OCR:', error);
			throw error;
		}
	}

	private buildMaterialExtractionPrompt(): string {
		return `Du bist ein Experte für das Extrahieren von Rechnungen, Bestelllisten und Materiallisten.
Analysiere den gegebenen Text oder das Bild und extrahiere alle Positionen als strukturiertes JSON.

**WICHTIG — Lieferant erkennen:**
Identifiziere ZUERST den Lieferanten/Absender des Dokuments. Dieser steht typischerweise im Briefkopf oder Absenderfeld. Verwende einen kurzen, gebräuchlichen Firmennamen.

**Regeln:**
- Erkenne die Einheit so wie sie auf dem Dokument steht (Stück, Liter, kg, Meter, Flasche, Dose, Packung, etc.)
- Erkenne Gebindeeinheiten (Fass, Kiste, Karton, Palette, Sack, etc.)
- "amount_per_packaging": Wie viele Einheiten sind in einem Gebinde? (z.B. 20 Flaschen pro Kiste)
- Wenn die Menge unklar ist, verwende 1
- Setze null für unbekannte/fehlende Felder — NIEMALS raten!

**Preise & MwSt:**
- "unit_price": Der Einzelpreis GENAU WIE ER AUF DEM DOKUMENT STEHT (als Zahl ohne €)
- "price_is_net": true wenn der Preis ein Netto-Preis ist (ohne MwSt), false wenn Brutto (inkl. MwSt)
  - Hinweis: Rechnungen zwischen Firmen zeigen oft Netto-Preise
  - Wenn "netto", "exkl. MwSt", "zzgl. MwSt" steht → price_is_net = true
  - Wenn "brutto", "inkl. MwSt" steht oder es ein Kassenbon ist → price_is_net = false
  - Wenn unklar → price_is_net = true (Rechnungen sind meistens netto)
- "tax_rate": Der MwSt-Satz als Zahl (10, 13, 20). Erkenne ihn aus dem Dokument. null wenn nicht erkennbar.
  - In Österreich: 10% (Lebensmittel, Getränke), 13% (Beherbergung), 20% (Standard)
- "price_per": "unit" wenn der Preis sich auf eine einzelne Einheit bezieht (z.B. pro Flasche), "packaging" wenn er sich auf ein Gebinde bezieht (z.B. pro Kiste). Standard: "unit"

**Kategorien (wenn erkennbar):** Getränke, Lebensmittel, Dekoration, Geschirr/Besteck, Technik, Sonstiges

**Ausgabe-Format (JSON):**
{
  "materials": [
    {
      "name": "Artikelname",
      "category": "Kategorie oder null",
      "supplier": "Lieferant oder null",
      "unit": "Einheit wie im Dokument",
      "packaging_unit": "Gebindeeinheit oder null",
      "amount_per_packaging": null,
      "ordered_quantity": 1,
      "unit_price": null,
      "tax_rate": null,
      "price_is_net": true,
      "price_per": "unit",
      "notes": "Zusätzliche Infos oder null"
    }
  ]
}`;
	}

	private parseMaterialResponse(content: string): AIMaterialItem[] {
		try {
			let parsed: any;
			try {
				parsed = JSON.parse(content);
			} catch {
				// Try to recover truncated JSON by extracting complete objects
				const regex = /\{[^{}]*"name"\s*:\s*"[^"]+"[^{}]*"ordered_quantity"\s*:\s*\d+[^{}]*\}/g;
				const matches = content.match(regex);
				if (matches && matches.length > 0) {
					const recovered = matches
						.map((m) => { try { return JSON.parse(m); } catch { return null; } })
						.filter(Boolean);
					if (recovered.length > 0) {
						console.log(`[Mistral] Recovered ${recovered.length} materials from truncated JSON`);
						parsed = { materials: recovered };
					} else {
						throw new Error('KI-Antwort konnte nicht verarbeitet werden.');
					}
				} else {
					throw new Error('KI-Antwort konnte nicht verarbeitet werden.');
				}
			}
			const materials = parsed.materials || [];
			return materials.filter((m: any) => m && m.name && m.ordered_quantity != null).map((m: any) => ({
				name: String(m.name),
				category: m.category || null,
				supplier: m.supplier || null,
				unit: m.unit || 'Stück',
				packaging_unit: m.packaging_unit || null,
				amount_per_packaging: m.amount_per_packaging != null ? Number(m.amount_per_packaging) : null,
				ordered_quantity: Number(m.ordered_quantity) || 1,
				unit_price: m.unit_price != null ? Number(m.unit_price) : null,
				tax_rate: m.tax_rate != null ? Number(m.tax_rate) : null,
				price_is_net: m.price_is_net !== false,
				price_per: m.price_per === 'packaging' ? 'packaging' : 'unit',
				notes: m.notes || null
			}));
		} catch (error) {
			console.error('Error parsing material response:', error);
			throw new Error('KI-Antwort konnte nicht verarbeitet werden.');
		}
	}

	private buildStationPrompt(context: FestivalContext): string {
		const visitorCountText = this.getVisitorCountText(context.visitorCount);
		const duration =
			context.endDate && context.endDate !== context.startDate
				? `vom ${new Date(context.startDate).toLocaleDateString('de-AT')} bis ${new Date(
						context.endDate
				  ).toLocaleDateString('de-AT')}`
				: `am ${new Date(context.startDate).toLocaleDateString('de-AT')}`;

		return `
Analysiere das folgende Fest und schlage passende Stationen vor:

**Fest-Informationen:**
- Name: "${context.name}"
- Typ: ${context.type || 'nicht spezifiziert'}
- Ort: ${context.location}
- Datum: ${duration}
- Erwartete Besucher: ${visitorCountText}

**Aufgabe:**
Erstelle eine Liste von 3-8 Stationen, die für dieses spezifische Fest sinnvoll sind. Berücksichtige:
- Den Festnamen und -typ
- Die erwartete Besucherzahl
- Typische österreichische Festtraditionen
- Praktische Erfordernisse

**Ausgabe-Format (JSON):**
{
  "stations": [
    {
      "name": "Stationsname",
      "description": "Detaillierte Beschreibung der Station",
      "required_people": Anzahl,
      "aiReason": "Warum diese Station für dieses spezifische Fest sinnvoll ist"
    }
  ]
}

**Wichtige Hinweise:**
- Sei spezifisch für dieses Fest, nicht generisch
- Erkläre bei jeder Station, warum sie für dieses Fest passt
- Berücksichtige österreichische Besonderheiten
- Passe die Personalanzahl an die Besucherzahl an
`;
	}

	private buildShiftPrompt(context: FestivalContext): string {
		const visitorCountText = this.getVisitorCountText(context.visitorCount);
		const duration =
			context.endDate && context.endDate !== context.startDate
				? `vom ${new Date(context.startDate).toLocaleDateString('de-AT')} bis ${new Date(
						context.endDate
				  ).toLocaleDateString('de-AT')}`
				: `am ${new Date(context.startDate).toLocaleDateString('de-AT')}`;

		return `
Analysiere das folgende Fest und schlage passende Schichten vor:

**Fest-Informationen:**
- Name: "${context.name}"
- Typ: ${context.type || 'nicht spezifiziert'}
- Ort: ${context.location}
- Datum: ${duration}
- Erwartete Besucher: ${visitorCountText}

**Aufgabe:**
Erstelle eine Liste von Schichten für dieses Fest. Berücksichtige:
- Die Festdauer (ein- oder mehrtägig)
- Typische österreichische Festzeiten
- Besucherzahl und Personalbedarf
- Praktische Arbeitszeiten

**Ausgabe-Format (JSON):**
{
  "shifts": [
    {
      "name": "Schichtname (z.B. 'Samstag Vormittag')",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "start_date": "YYYY-MM-DD"
    }
  ]
}

**Wichtige Hinweise:**
- Passe die Schichten an die Festdauer an
- Berücksichtige typische österreichische Festzeiten
- Plane realistische Arbeitszeiten (max. 8 Stunden pro Schicht)
- Berücksichtige Vorbereitungs- und Aufräumzeiten
`;
	}

	private buildInsightPrompt(context: FestivalContext): string {
		const visitorCountText = this.getVisitorCountText(context.visitorCount);
		const duration =
			context.endDate && context.endDate !== context.startDate
				? `vom ${new Date(context.startDate).toLocaleDateString('de-AT')} bis ${new Date(
						context.endDate
				  ).toLocaleDateString('de-AT')}`
				: `am ${new Date(context.startDate).toLocaleDateString('de-AT')}`;

		return `
Analysiere das folgende Fest und gib hilfreiche Tipps und Warnungen:

**Fest-Informationen:**
- Name: "${context.name}"
- Typ: ${context.type || 'nicht spezifiziert'}
- Ort: ${context.location}
- Datum: ${duration}
- Erwartete Besucher: ${visitorCountText}

**Aufgabe:**
Erstelle 2-4 hilfreiche Insights für dieses spezifische Fest. Berücksichtige:
- Besondere Anforderungen für diesen Festtyp
- Warnungen bei der Besucherzahl
- Österreichische Besonderheiten
- Praktische Tipps

**Ausgabe-Format (JSON):**
{
  "insights": [
    {
      "type": "info|warning|success",
      "title": "Titel des Insights",
      "message": "Detaillierte Nachricht",
      "icon": "passendes Icon (Users, Shield, Music, etc.)"
    }
  ]
}

**Wichtige Hinweise:**
- Sei spezifisch für dieses Fest
- Gib praktische, umsetzbare Tipps
- Warnungen bei besonderen Risiken
- Berücksichtige österreichische Gesetze und Traditionen
`;
	}

	private getVisitorCountText(visitorCount: string): string {
		switch (visitorCount) {
			case 'small':
				return 'weniger als 100 Besucher';
			case 'medium':
				return '100-300 Besucher';
			case 'large':
				return '300-800 Besucher';
			case 'xlarge':
				return 'über 800 Besucher';
			default:
				return 'unbekannte Besucherzahl';
		}
	}

	private parseStationResponse(content: string): AIStation[] {
		try {
			const parsed = JSON.parse(content);
			return parsed.stations || [];
		} catch (error) {
			console.error('Error parsing station response:', error);
			return [];
		}
	}

	private parseShiftResponse(content: string): AIShift[] {
		try {
			const parsed = JSON.parse(content);
			return parsed.shifts || [];
		} catch (error) {
			console.error('Error parsing shift response:', error);
			return [];
		}
	}

	private parseInsightResponse(content: string): AIInsight[] {
		try {
			const parsed = JSON.parse(content);
			return parsed.insights || [];
		} catch (error) {
			console.error('Error parsing insight response:', error);
			return [];
		}
	}

	// Fallback methods when AI is not available
	private getFallbackStations(context: FestivalContext): AIStation[] {
		return [
			{
				name: 'Ausschank',
				description: 'Getränkeausgabe und Bar-Service',
				required_people: 2,
				aiReason: 'Standard-Station für Getränkeausgabe (Fallback ohne AI)'
			},
			{
				name: 'Kassa',
				description: 'Eingangsbereich und Zahlungsabwicklung',
				required_people: 1,
				aiReason: 'Standard-Station für Eintrittskontrolle (Fallback ohne AI)'
			}
		];
	}

	private getFallbackShifts(context: FestivalContext): AIShift[] {
		const startDate = new Date(context.startDate);
		const endDate = context.endDate ? new Date(context.endDate) : startDate;
		const shifts: AIShift[] = [];

		const currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			shifts.push({
				name: `${currentDate.toLocaleDateString('de-AT', { weekday: 'long' })} Vormittag`,
				start_time: '09:00',
				end_time: '13:00',
				start_date: currentDate.toISOString().split('T')[0]
			});

			shifts.push({
				name: `${currentDate.toLocaleDateString('de-AT', { weekday: 'long' })} Nachmittag`,
				start_time: '13:00',
				end_time: '17:00',
				start_date: currentDate.toISOString().split('T')[0]
			});

			currentDate.setDate(currentDate.getDate() + 1);
		}

		return shifts;
	}

	private getFallbackInsights(context: FestivalContext): AIInsight[] {
		return [
			{
				type: 'info',
				title: 'AI-Service nicht verfügbar',
				message:
					'Die Mistral AI-Integration ist nicht konfiguriert. Verwende die Standard-Vorschläge oder konfiguriere die API-Schlüssel.',
				icon: 'Info'
			}
		];
	}
}

export const aiService = new AIService();
