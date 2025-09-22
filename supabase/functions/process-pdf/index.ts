import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Mistral } from 'https://esm.sh/@mistralai/mistralai@1.7.3';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const { fileData, fileName } = await req.json();

		if (!fileData || !fileName) {
			return new Response(JSON.stringify({ error: 'File data and filename are required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Convert base64 to ArrayBuffer
		const binaryString = atob(fileData);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		// Extract text from PDF using Mistral AI
		let extractedText = '';
		try {
			console.log(`PDF received: ${fileName}, ${bytes.length} bytes`);

			// Get Mistral API key from environment
			const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
			if (!mistralApiKey) {
				throw new Error('Mistral API key not found in environment variables');
			}

			// Use Mistral OCR API to extract text from PDF
			const client = new Mistral({ apiKey: mistralApiKey });

			const startUpload = Date.now();
			const file = new File([bytes], fileName, { type: 'application/pdf' });
			const fileResponse = await client.files.upload({ purpose: 'ocr', file: file });
			const endUpload = Date.now();
			console.log(`[Mistral] File upload took ${endUpload - startUpload}ms`);

			const startOcr = Date.now();
			const ocrResponse = await client.ocr.process({
				model: 'mistral-ocr-latest',
				document: { type: 'file', fileId: fileResponse.id }
			});
			const endOcr = Date.now();
			console.log(`[Mistral] OCR process took ${endOcr - startOcr}ms`);

			// Extract text from OCR response
			const ocrText = ocrResponse.pages.map((page: any) => page.markdown).join('\n');

			// Use Mistral AI to structure the extracted text into member data
			const startChat = Date.now();
			const mistralResponse = await client.chat.complete({
				model: 'mistral-small-latest',
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `Du bist ein Experte für Mitgliederdaten-Extraktion aus PDF-Dokumenten. 

WICHTIG: Du musst die Daten als strukturierte Liste von Namen ausgeben.

Erkenne alle Namen aus dem PDF-Text und gib sie als einfache Liste aus:
- Eine Zeile pro Name
- Format: "Nachname Vorname"
- Beispiel: "Schafhuber Kerstin"
- Beispiel: "Müller Max"

BESONDERS WICHTIG: 
- Erkenne sowohl Vor- als auch Nachnamen
- Wenn nur ein Name vorhanden ist, teile ihn in Vor- und Nachname auf
- Beispiel: "Max Müller" → "Müller Max"
- Beispiel: "Schafhuber Kerstin" → "Schafhuber Kerstin"

WICHTIG: Gib NUR die Namen aus, eine pro Zeile, keine zusätzlichen Erklärungen!

Extrahiere alle Namen aus diesem PDF-Text:`
							},
							{
								type: 'text',
								text: ocrText
							}
						]
					}
				],
				maxTokens: 10000,
				temperature: 0.1
			});
			const endChat = Date.now();
			console.log(`[Mistral] Chat completion took ${endChat - startChat}ms`);

			const structuredData =
				mistralResponse.choices[0]?.message?.content || 'Keine Daten extrahiert';

			// Check if we got actual name data
			const nameLines = structuredData
				.split('\n')
				.filter((line) => line.trim() && !line.toLowerCase().includes('keine'))
				.map((line) => line.trim());

			if (nameLines.length > 0) {
				// Return the structured name list
				extractedText = nameLines.join('\n');
				console.log(`Extracted ${nameLines.length} names from PDF using Mistral OCR`);
			} else {
				// Fallback if no name data was extracted
				extractedText = `PDF-Datei "${fileName}" wurde mit Mistral OCR verarbeitet.

Extrahierter Text:
${ocrText}

🤖 Mistral AI Strukturierung:
${structuredData}

📋 Hinweis: Keine Namen erkannt.
Bitte überprüfe den extrahierten Text und versuche es erneut.`;
			}

			console.log('PDF analysis completed with Mistral AI');
		} catch (pdfError) {
			console.error('PDF processing error:', pdfError);
			extractedText = `Fehler beim Verarbeiten der PDF-Datei: ${pdfError.message}

Bitte versuche es mit einer anderen Datei oder konvertiere das PDF zu CSV/Excel.`;
		}

		return new Response(
			JSON.stringify({
				success: true,
				text: extractedText,
				message: 'PDF-Verarbeitung noch nicht implementiert. Bitte verwende CSV oder Excel-Dateien.'
			}),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('PDF processing error:', error);
		return new Response(
			JSON.stringify({
				error: 'Fehler beim Verarbeiten der PDF-Datei',
				details: error.message
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			}
		);
	}
});
