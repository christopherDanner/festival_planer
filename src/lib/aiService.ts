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
