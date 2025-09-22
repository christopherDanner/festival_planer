import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface AnalysisRequest {
	headers: string[];
	sampleRows: any[][];
}

interface FieldMapping {
	field: string;
	confidence: number;
	reasoning: string;
}

interface AnalysisResponse {
	mappings: Record<string, FieldMapping>;
	suggestions: {
		field: string;
		column: string;
		confidence: number;
		reasoning: string;
	}[];
}

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
		if (!MISTRAL_API_KEY) {
			throw new Error('MISTRAL_API_KEY is not configured');
		}

		const { headers, sampleRows }: AnalysisRequest = await req.json();

		console.log('Analyzing import data:', { headers, sampleRowCount: sampleRows.length });

		const prompt = `
Du bist ein Experte für die Analyse von Mitgliederdaten. Analysiere die folgenden CSV-Spalten und Beispieldaten und erkenne automatisch, welche Spalten zu welchen Mitgliederfeldern gehören.

Verfügbare Zielfelder:
- first_name (Vorname)
- last_name (Nachname) 
- phone (Telefon)
- email (E-Mail)
- tags (Tags/Stationspräferenzen/Kategorien)

Spaltenheader: ${JSON.stringify(headers)}

Beispieldaten (erste 3 Zeilen):
${sampleRows
	.slice(0, 3)
	.map((row, i) => `Zeile ${i + 1}: ${JSON.stringify(row)}`)
	.join('\n')}

Analysiere sowohl die Spaltenheader als auch die Beispieldaten und erkenne:
1. Eindeutige Zuordnungen (z.B. "Email" → email)
2. Wahrscheinliche Zuordnungen basierend auf Datenmustern
3. Zusammengesetzte Felder (z.B. "Vollname" könnte aufgeteilt werden)
4. Verschiedene Sprachen und Schreibweisen

Antworte im folgenden JSON-Format:
{
  "mappings": {
    "spaltenname": {
      "field": "zielfeld",
      "confidence": 0.95,
      "reasoning": "Erklärung warum diese Zuordnung"
    }
  },
  "suggestions": [
    {
      "field": "first_name", 
      "column": "spaltenname",
      "confidence": 0.85,
      "reasoning": "Begründung"
    }
  ]
}

Berücksichtige verschiedene Sprachen (Deutsch, Englisch, Französisch) und gängige Variationen der Feldnamen. 
Erkenne auch Stationspräferenzen wie "Küche", "Kassa", "Service", "Bar", "Grill", "Bier", "Wein", etc. als Tags.
`;

		const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${MISTRAL_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'mistral-small-latest',
				messages: [
					{
						role: 'system',
						content:
							'Du bist ein Experte für Datenanalyse und hilfst bei der automatischen Erkennung von Spaltentypen in Mitgliederdaten. Antworte immer mit gültigem JSON.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.1,
				max_tokens: 1500
			})
		});

		if (!response.ok) {
			throw new Error(`Mistral API error: ${response.status}`);
		}

		const data = await response.json();
		const content = data.choices[0].message.content;

		console.log('Mistral response:', content);

		// Parse the JSON response from Mistral
		let analysisResult: AnalysisResponse;
		try {
			analysisResult = JSON.parse(content);
		} catch (parseError) {
			console.error('Failed to parse Mistral response:', parseError);
			// Fallback: create basic analysis based on header names
			analysisResult = createFallbackAnalysis(headers, sampleRows);
		}

		return new Response(JSON.stringify(analysisResult), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error in analyze-member-import function:', error);
		return new Response(
			JSON.stringify({
				error: error.message,
				mappings: {},
				suggestions: []
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			}
		);
	}
});

function createFallbackAnalysis(headers: string[], sampleRows: any[][]): AnalysisResponse {
	const mappings: Record<string, FieldMapping> = {};
	const suggestions: AnalysisResponse['suggestions'] = [];

	headers.forEach((header) => {
		const lowerHeader = header.toLowerCase().trim();

		// Basic pattern matching as fallback
		if (
			lowerHeader.includes('email') ||
			lowerHeader.includes('mail') ||
			lowerHeader.includes('e-mail')
		) {
			mappings[header] = {
				field: 'email',
				confidence: 0.9,
				reasoning: 'Header enthält "email" oder ähnlich'
			};
		} else if (
			lowerHeader.includes('phone') ||
			lowerHeader.includes('telefon') ||
			lowerHeader.includes('tel')
		) {
			mappings[header] = {
				field: 'phone',
				confidence: 0.8,
				reasoning: 'Header enthält "phone" oder "telefon"'
			};
		} else if (
			lowerHeader.includes('vorname') ||
			lowerHeader.includes('firstname') ||
			lowerHeader === 'first'
		) {
			mappings[header] = {
				field: 'firstName',
				confidence: 0.85,
				reasoning: 'Header deutet auf Vorname hin'
			};
		} else if (
			lowerHeader.includes('nachname') ||
			lowerHeader.includes('lastname') ||
			lowerHeader === 'last'
		) {
			mappings[header] = {
				field: 'lastName',
				confidence: 0.85,
				reasoning: 'Header deutet auf Nachname hin'
			};
		}
	});

	return { mappings, suggestions };
}
