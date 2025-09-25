import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
// PDF processing will be handled by Supabase Edge Function
import { createWorker } from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import { Loader2, Brain, CheckCircle, AlertTriangle, FileSpreadsheet, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importMembers, type MemberImportData } from '@/lib/memberService';

interface ParsedRow {
	[key: string]: string;
}

interface ColumnMapping {
	[columnName: string]: keyof MemberImportData | 'none';
}

interface AIAnalysis {
	mappings: Record<
		string,
		{
			field: string;
			confidence: number;
			reasoning: string;
		}
	>;
	suggestions: {
		field: string;
		column: string;
		confidence: number;
		reasoning: string;
	}[];
}

interface MemberImportProps {
	onImportComplete: () => void;
	onClose: () => void;
}

const MemberImport: React.FC<MemberImportProps> = ({ onImportComplete, onClose }) => {
	const [file, setFile] = useState<File | null>(null);
	const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [previewData, setPreviewData] = useState<MemberImportData[]>([]);
	const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisError, setAnalysisError] = useState<string | null>(null);
	const [autoMapping, setAutoMapping] = useState<ColumnMapping>({});
	const [isProcessing, setIsProcessing] = useState(false);
	const { toast } = useToast();

	const generatePreviewFromMapping = (
		mapping: ColumnMapping,
		headers: string[],
		sampleRows: ParsedRow[]
	) => {
		if (!sampleRows.length) {
			toast({
				title: 'Fehler',
				description: 'Keine Daten zum Anzeigen verfügbar.',
				variant: 'destructive'
			});
			return;
		}

		const firstNameCol = Object.keys(mapping).find((key) => mapping[key] === 'first_name');
		const lastNameCol = Object.keys(mapping).find((key) => mapping[key] === 'last_name');

		if (!firstNameCol && !lastNameCol) {
			toast({
				title: 'Fehler',
				description: 'Mindestens Vor- oder Nachname muss erkannt werden.',
				variant: 'destructive'
			});
			return;
		}

		const preview = sampleRows.map((row) => {
			const member: MemberImportData = {
				first_name: firstNameCol ? row[firstNameCol] || '' : '',
				last_name: lastNameCol ? row[lastNameCol] || '' : '',
				phone: undefined,
				email: undefined,
				notes: undefined
			};

			// Map other fields
			Object.entries(mapping).forEach(([column, field]) => {
				if (field && field !== 'none') {
					if (field === 'phone') {
						member.phone = row[column] || undefined;
					} else if (field === 'email') {
						member.email = row[column] || undefined;
					} else if (field === 'notes') {
						member.notes = row[column] || undefined;
					}
				}
			});

			return member;
		});

		setPreviewData(preview);
	};

	// Auto-generate preview when autoMapping and parsedData are available
	useEffect(() => {
		if (Object.keys(autoMapping).length > 0 && parsedData.length > 0 && !isAnalyzing) {
			const headers = Object.keys(parsedData[0]);
			generatePreviewFromMapping(autoMapping, headers, parsedData.slice(0, 10));
		}
	}, [autoMapping, parsedData, isAnalyzing]);

	const processPDF = async (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = async (e) => {
				try {
					// Convert file to base64 for Supabase Edge Function
					const base64Data = e.target?.result as string;
					const base64Content = base64Data.split(',')[1]; // Remove data:application/pdf;base64, prefix

					// Call Supabase Edge Function for PDF processing
					const { data, error } = await supabase.functions.invoke('process-pdf', {
						body: {
							fileData: base64Content,
							fileName: file.name
						}
					});

					if (error) {
						throw new Error(`PDF-Verarbeitung fehlgeschlagen: ${error.message}`);
					}

					if (!data.success) {
						throw new Error(data.error || 'Unbekannter Fehler bei der PDF-Verarbeitung');
					}

					resolve(data.text);
				} catch (error) {
					console.error('PDF processing error:', error);
					reject(error);
				}
			};
			reader.onerror = reject;
			reader.readAsDataURL(file); // Use readAsDataURL to get base64
		});
	};

	const processImage = async (file: File): Promise<string> => {
		const worker = await createWorker('deu+eng');
		try {
			const {
				data: { text }
			} = await worker.recognize(file);
			return text;
		} finally {
			await worker.terminate();
		}
	};

	const parseTextToCSV = (text: string): ParsedRow[] => {
		// Try to detect table structure in text
		const lines = text.split('\n').filter((line) => line.trim());

		// Look for CSV-like format (comma-separated)
		const csvLines = lines.filter((line) => line.includes(','));
		if (csvLines.length > 0) {
			// Parse CSV format: "LastName FirstName,Telefon,Email"
			const parsedRows: ParsedRow[] = csvLines
				.map((line, index) => {
					const parts = line.split(',').map((part) => part.trim());
					if (parts.length < 1) return null;

					// Skip header row (first line)
					if (index === 0) {
						// Check if this looks like a header row
						const isHeader = parts.some(
							(part) =>
								part.toLowerCase().includes('nachname') ||
								part.toLowerCase().includes('vorname') ||
								part.toLowerCase().includes('telefon') ||
								part.toLowerCase().includes('email')
						);
						if (isHeader) return null;
					}

					// Handle the specific CSV format: Nachname,,Vorname,Telefon
					const lastName = parts[0] || '';
					const firstName = parts[2] || ''; // Vorname ist in der 3. Spalte
					const phonePart = parts[3] || ''; // Telefon ist in der 4. Spalte
					const emailPart = parts[4] || ''; // Email wäre in der 5. Spalte (falls vorhanden)

					return {
						Nachname: lastName,
						Vorname: firstName,
						Telefon: phonePart,
						Email: emailPart
					};
				})
				.filter((row) => row !== null);

			if (parsedRows.length > 0) {
				return parsedRows;
			}
		}

		// Look for patterns that might indicate a table
		const tableLines = lines.filter((line) => {
			// Check if line contains multiple words separated by spaces or tabs
			const parts = line.split(/\s+/).filter((part) => part.trim());
			return parts.length >= 2;
		});

		if (tableLines.length < 2) {
			throw new Error('Keine Tabellenstruktur in der Datei erkannt');
		}

		// Try to detect headers (first line with multiple words)
		const headers = tableLines[0].split(/\s+/).filter((part) => part.trim());
		const dataRows = tableLines.slice(1);

		// Convert to ParsedRow format
		const parsedRows: ParsedRow[] = dataRows.map((line) => {
			const values = line.split(/\s+/).filter((part) => part.trim());
			const row: ParsedRow = {};

			headers.forEach((header, index) => {
				row[header] = values[index] || '';
			});

			return row;
		});

		return parsedRows.filter((row) =>
			Object.values(row).some((value) => value && value.trim() !== '')
		);
	};

	const parsePDFTextToMembers = (text: string): ParsedRow[] => {
		// Direct PDF text parsing - no CSV conversion needed
		const lines = text.split('\n').filter((line) => line.trim());

		// Look for name patterns in the text
		const members: ParsedRow[] = [];

		for (const line of lines) {
			// Skip empty lines and header-like content
			if (
				!line.trim() ||
				line.toLowerCase().includes('geburtstagsliste') ||
				line.toLowerCase().includes('mitgliederliste') ||
				line.toLowerCase().includes('nachname') ||
				line.toLowerCase().includes('vorname')
			) {
				continue;
			}

			// Try to extract names from the line
			// Pattern: "LastName FirstName" or "FirstName LastName"
			const words = line
				.trim()
				.split(/\s+/)
				.filter((word) => word.length > 0);

			if (words.length >= 2) {
				// Assume first word is last name, rest is first name
				const lastName = words[0];
				const firstName = words.slice(1).join(' ');

				// Skip if it looks like a date or number
				if (lastName.match(/^\d+/) || firstName.match(/^\d+/)) {
					continue;
				}

				members.push({
					Nachname: lastName,
					Vorname: firstName,
					Telefon: '',
					Email: ''
				});
			}
		}

		if (members.length === 0) {
			throw new Error('Keine Mitgliederdaten in der PDF gefunden');
		}

		return members;
	};

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = event.target.files?.[0];
		if (!selectedFile) return;

		setFile(selectedFile);
		setAnalysisError(null);

		const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

		if (fileExtension === 'pdf') {
			// Handle PDF files with dedicated PDF parsing
			setIsProcessing(true);
			try {
				const text = await processPDF(selectedFile);
				const parsedRows = parsePDFTextToMembers(text);

				if (parsedRows.length === 0) {
					toast({
						title: 'Fehler',
						description: 'Keine Mitgliederdaten in der PDF-Datei gefunden.',
						variant: 'destructive'
					});
					return;
				}

				setParsedData(parsedRows);
				const headers = Object.keys(parsedRows[0]);

				// Start AI analysis
				await analyzeWithAI(headers, parsedRows.slice(0, 10));
			} catch (error) {
				console.error('PDF processing error:', error);
				toast({
					title: 'Fehler',
					description: `Fehler beim Verarbeiten der PDF-Datei: ${
						error instanceof Error ? error.message : 'Unbekannter Fehler'
					}`,
					variant: 'destructive'
				});
			} finally {
				setIsProcessing(false);
			}
		} else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '')) {
			// Handle image files
			setIsProcessing(true);
			try {
				const text = await processImage(selectedFile);
				const parsedRows = parseTextToCSV(text);

				if (parsedRows.length === 0) {
					toast({
						title: 'Fehler',
						description: 'Keine Tabellendaten im Bild gefunden.',
						variant: 'destructive'
					});
					return;
				}

				setParsedData(parsedRows);
				const headers = Object.keys(parsedRows[0]);

				// Start AI analysis
				await analyzeWithAI(headers, parsedRows.slice(0, 10));
			} catch (error) {
				toast({
					title: 'Fehler',
					description: 'Fehler beim Verarbeiten des Bildes.',
					variant: 'destructive'
				});
			} finally {
				setIsProcessing(false);
			}
		} else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
			// Handle Excel files
			const reader = new FileReader();
			reader.onload = async (e) => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer);
					const workbook = XLSX.read(data, { type: 'array' });
					const sheetName = workbook.SheetNames[0];
					const worksheet = workbook.Sheets[sheetName];
					const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

					if (jsonData.length < 2) {
						toast({
							title: 'Fehler',
							description: 'Die Excel-Datei enthält keine gültigen Daten.',
							variant: 'destructive'
						});
						return;
					}

					// Convert to ParsedRow format
					const headers = jsonData[0] as string[];
					const rows = jsonData.slice(1).map((row) => {
						const parsedRow: ParsedRow = {};
						headers.forEach((header, index) => {
							parsedRow[header] = row[index] ? String(row[index]) : '';
						});
						return parsedRow;
					});

					const filteredData = rows.filter((row) =>
						Object.values(row).some((value) => value && value.trim() !== '')
					);

					if (filteredData.length === 0) {
						toast({
							title: 'Fehler',
							description: 'Die Excel-Datei enthält keine gültigen Daten.',
							variant: 'destructive'
						});
						return;
					}

					setParsedData(filteredData);

					// Start AI analysis
					await analyzeWithAI(headers, filteredData.slice(0, 10));
				} catch (error) {
					toast({
						title: 'Fehler',
						description: 'Fehler beim Lesen der Excel-Datei.',
						variant: 'destructive'
					});
				}
			};
			reader.readAsArrayBuffer(selectedFile);
		} else {
			// Handle CSV files
			Papa.parse(selectedFile, {
				complete: async (results) => {
					const data = results.data as ParsedRow[];
					const filteredData = data.filter((row) =>
						Object.values(row).some((value) => value && value.trim() !== '')
					);

					if (filteredData.length === 0) {
						toast({
							title: 'Fehler',
							description: 'Die Datei enthält keine gültigen Daten.',
							variant: 'destructive'
						});
						return;
					}

					setParsedData(filteredData);
					const headers = Object.keys(filteredData[0]);

					// Start AI analysis
					await analyzeWithAI(headers, filteredData.slice(0, 10));
				},
				header: true,
				skipEmptyLines: true
			});
		}
	};

	const analyzeWithAI = async (headers: string[], sampleRows: ParsedRow[]) => {
		setIsAnalyzing(true);
		setAnalysisError(null);

		try {
			console.log('Starting AI analysis...');
			const { data, error } = await supabase.functions.invoke('analyze-member-import', {
				body: {
					headers,
					sampleRows: sampleRows.map((row) => Object.values(row))
				}
			});

			if (error) {
				throw new Error(error.message);
			}

			console.log('AI analysis result:', data);
			setAiAnalysis(data);

			// Apply AI suggestions to column mapping
			const aiMapping: ColumnMapping = {};
			Object.entries(data.mappings || {}).forEach(([column, mapping]: [string, any]) => {
				if (mapping.confidence > 0.7) {
					// Normalize field names
					let normalizedField = mapping.field;
					if (mapping.field === 'firstName') normalizedField = 'first_name';
					if (mapping.field === 'lastName') normalizedField = 'last_name';

					aiMapping[column] = normalizedField as keyof MemberImportData;
				}
			});

			setAutoMapping(aiMapping);

			// Automatically generate preview after AI analysis
			// We'll generate preview after setting the state

			toast({
				title: 'KI-Analyse abgeschlossen',
				description: `${Object.keys(aiMapping).length} Spalten automatisch erkannt`
			});
		} catch (error) {
			console.error('AI analysis failed:', error);
			setAnalysisError(error instanceof Error ? error.message : 'Unbekannter Fehler');

			// Fallback to basic auto-detection
			const basicMapping: ColumnMapping = {};
			headers.forEach((header) => {
				const lowerHeader = header.toLowerCase().trim();
				if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
					basicMapping[header] = 'email';
				} else if (
					lowerHeader.includes('phone') ||
					lowerHeader.includes('telefon') ||
					lowerHeader.includes('tel')
				) {
					basicMapping[header] = 'phone';
				} else if (lowerHeader.includes('vorname') || lowerHeader.includes('firstname')) {
					basicMapping[header] = 'first_name';
				} else if (lowerHeader.includes('nachname') || lowerHeader.includes('lastname')) {
					basicMapping[header] = 'last_name';
				} else if (lowerHeader.includes('notiz') || lowerHeader.includes('note')) {
					basicMapping[header] = 'notes';
				}
			});
			setAutoMapping(basicMapping);

			// Generate preview with fallback mapping
			// We'll generate preview after setting the state
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleImport = async () => {
		if (!parsedData.length) {
			return;
		}

		const firstNameCol = Object.keys(autoMapping).find((key) => autoMapping[key] === 'first_name');
		const lastNameCol = Object.keys(autoMapping).find((key) => autoMapping[key] === 'last_name');

		if (!firstNameCol && !lastNameCol) {
			toast({
				title: 'Fehler',
				description: 'Mindestens Vor- oder Nachname muss erkannt werden.',
				variant: 'destructive'
			});
			return;
		}

		setIsLoading(true);
		try {
			const membersToImport = parsedData.map((row) => {
				const member: MemberImportData = {
					first_name: firstNameCol ? row[firstNameCol] || '' : '',
					last_name: lastNameCol ? row[lastNameCol] || '' : '',
					phone: undefined,
					email: undefined,
					notes: undefined
				};

				// Map other fields
				Object.entries(autoMapping).forEach(([column, field]) => {
					if (field && field !== 'none') {
						if (field === 'phone') {
							member.phone = row[column] || undefined;
						} else if (field === 'email') {
							member.email = row[column] || undefined;
						} else if (field === 'notes') {
							member.notes = row[column] || undefined;
						}
					}
				});

				return member;
			});

			await importMembers(membersToImport);

			toast({
				title: 'Import erfolgreich',
				description: `${membersToImport.length} Personen wurden importiert.`
			});

			onImportComplete();
			onClose();
		} catch (error) {
			toast({
				title: 'Import Fehler',
				description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
				variant: 'destructive'
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileSpreadsheet className="h-5 w-5" />
						KI-gestützter Import (CSV, Excel, PDF, Bilder)
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="file-upload">Datei auswählen (CSV, Excel, PDF oder Bild)</Label>
						<div className="flex items-center gap-2 mt-2">
							<Input
								id="file-upload"
								type="file"
								accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp"
								onChange={handleFileUpload}
								className="flex-1"
							/>
							<Upload className="h-4 w-4 text-muted-foreground" />
						</div>

						{isProcessing && (
							<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Verarbeite Datei...
							</div>
						)}

						{isAnalyzing && (
							<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								<Brain className="h-4 w-4" />
								KI analysiert die Daten...
							</div>
						)}

						{analysisError && (
							<div className="mt-2 flex items-center gap-2 text-sm text-destructive">
								<AlertTriangle className="h-4 w-4" />
								KI-Analyse fehlgeschlagen, verwende Basis-Erkennung
							</div>
						)}

						{aiAnalysis && !isAnalyzing && (
							<div className="mt-2 flex items-center gap-2 text-sm text-green-600">
								<CheckCircle className="h-4 w-4" />
								<Brain className="h-4 w-4" />
								KI-Analyse erfolgreich - {Object.keys(aiAnalysis.mappings).length} Spalten erkannt
							</div>
						)}
					</div>

					{file && (
						<div className="text-sm text-muted-foreground">
							Datei: {file.name} ({parsedData.length} Zeilen)
						</div>
					)}
				</CardContent>
			</Card>

			{previewData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle className="h-5 w-5 text-green-600" />
							KI-Erkennung abgeschlossen
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-sm text-muted-foreground">
							Die KI hat {Object.keys(autoMapping).length} Spalten automatisch erkannt. Überprüfen
							Sie die Vorschau und klicken Sie auf "Importieren" um fortzufahren.
						</div>

						<div className="flex gap-2">
							<Button onClick={handleImport} disabled={isLoading} className="flex-1">
								{isLoading ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Importiere...
									</>
								) : (
									`${parsedData.length} Personen importieren`
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{previewData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Vorschau (erste 10 Einträge)</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
											<TableHead>Vorname</TableHead>
											<TableHead>Nachname</TableHead>
											<TableHead>Telefon</TableHead>
											<TableHead>E-Mail</TableHead>
											<TableHead>Notizen</TableHead>
									<TableHead>Notizen</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{previewData.map((member, index) => (
									<TableRow key={index}>
										<TableCell>{member.first_name}</TableCell>
										<TableCell>{member.last_name}</TableCell>
										<TableCell>{member.phone || '-'}</TableCell>
										<TableCell>{member.email || '-'}</TableCell>
										<TableCell>{member.notes || '-'}</TableCell>
										<TableCell className="max-w-[200px] truncate">{member.notes || '-'}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			<div className="flex justify-end gap-2">
				<Button variant="outline" onClick={onClose}>
					Abbrechen
				</Button>
			</div>
		</div>
	);
};

export default MemberImport;
