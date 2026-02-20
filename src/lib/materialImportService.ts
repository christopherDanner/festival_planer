import * as XLSX from 'xlsx';
import { aiService, type AIMaterialItem } from './aiService';

export type SupportedFileType = 'excel' | 'csv' | 'image' | 'pdf';

export interface ImportedMaterial extends AIMaterialItem {
	_id: string;
	_selected: boolean;
	_stationId: string | null;
}

const MIME_MAP: Record<string, SupportedFileType> = {
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
	'application/vnd.ms-excel': 'excel',
	'text/csv': 'csv',
	'image/jpeg': 'image',
	'image/png': 'image',
	'image/webp': 'image',
	'application/pdf': 'pdf'
};

const EXT_MAP: Record<string, SupportedFileType> = {
	xlsx: 'excel',
	xls: 'excel',
	csv: 'csv',
	jpg: 'image',
	jpeg: 'image',
	png: 'image',
	webp: 'image',
	pdf: 'pdf'
};

export function detectFileType(file: File): SupportedFileType | null {
	if (MIME_MAP[file.type]) return MIME_MAP[file.type];
	const ext = file.name.split('.').pop()?.toLowerCase() || '';
	return EXT_MAP[ext] || null;
}

export async function processFileForImport(
	file: File
): Promise<ImportedMaterial[]> {
	const fileType = detectFileType(file);
	if (!fileType) throw new Error('Nicht unterstütztes Dateiformat.');

	let items: AIMaterialItem[];

	switch (fileType) {
		case 'excel': {
			const buffer = await readAsArrayBuffer(file);
			const workbook = XLSX.read(buffer, { type: 'array' });
			const csvParts: string[] = [];
			for (const sheetName of workbook.SheetNames) {
				const sheet = workbook.Sheets[sheetName];
				const csv = XLSX.utils.sheet_to_csv(sheet);
				// Clean CSV: strip trailing commas and remove empty rows
				const cleanLines = csv
					.split('\n')
					.map((line) => line.replace(/,+$/, ''))
					.filter((line) => line.trim().length > 0);
				if (cleanLines.length === 0) continue;
				csvParts.push(`--- Blatt: ${sheetName} ---\n${cleanLines.join('\n')}`);
			}
			const combinedCsv = csvParts.join('\n\n');
			items = await aiService.extractMaterialsFromText(combinedCsv);
			break;
		}
		case 'csv': {
			const text = await readAsText(file);
			items = await aiService.extractMaterialsFromText(text);
			break;
		}
		case 'image': {
			const dataUrl = await readAsDataURL(file);
			items = await aiService.extractMaterialsFromImage(dataUrl);
			break;
		}
		case 'pdf': {
			const buffer = await readAsArrayBuffer(file);
			const bytes = new Uint8Array(buffer);
			const markdown = await aiService.extractTextFromPdfViaOcr(bytes, file.name);
			items = await aiService.extractMaterialsFromText(markdown);
			break;
		}
	}

	return items.map((item) => ({
		...item,
		_id: crypto.randomUUID(),
		_selected: true,
		_stationId: null
	}));
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
		reader.readAsArrayBuffer(file);
	});
}

function readAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
		reader.readAsText(file);
	});
}

function readAsDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
		reader.readAsDataURL(file);
	});
}
