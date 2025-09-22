import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
import { supabase } from '@/integrations/supabase/client';

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
				tags: [],
				notes: undefined
			};

			// Map other fields
			Object.entries(mapping).forEach(([column, field]) => {
				if (field && field !== 'none') {
					if (field === 'phone') {
						member.phone = row[column] || undefined;
					} else if (field === 'email') {
						member.email = row[column] || undefined;
					} else if (field === 'tags') {
						const tagValue = row[column];
						if (tagValue) {
							member.tags = tagValue
								.split(',')
								.map((tag) => tag.trim())
								.filter(Boolean);
						}
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

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = event.target.files?.[0];
		if (!selectedFile) return;

		setFile(selectedFile);
		setAnalysisError(null);

		const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

		if (fileExtension === 'xlsx' || fileExtension === 'xls') {
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
					aiMapping[column] = mapping.field as keyof MemberImportData;
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
				} else if (lowerHeader.includes('tag') || lowerHeader.includes('skill')) {
					basicMapping[header] = 'tags';
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
					tags: [],
					notes: undefined
				};

				// Map other fields
				Object.entries(autoMapping).forEach(([column, field]) => {
					if (field && field !== 'none') {
						if (field === 'phone') {
							member.phone = row[column] || undefined;
						} else if (field === 'email') {
							member.email = row[column] || undefined;
						} else if (field === 'tags') {
							const tagValue = row[column];
							if (tagValue) {
								member.tags = tagValue
									.split(',')
									.map((tag) => tag.trim())
									.filter(Boolean);
							}
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
						KI-gestützter CSV/Excel Import
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="file-upload">Datei auswählen (CSV oder Excel)</Label>
						<div className="flex items-center gap-2 mt-2">
							<Input
								id="file-upload"
								type="file"
								accept=".csv,.xlsx,.xls"
								onChange={handleFileUpload}
								className="flex-1"
							/>
							<Upload className="h-4 w-4 text-muted-foreground" />
						</div>

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
									<TableHead>Tags</TableHead>
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
										<TableCell>
											<div className="flex gap-1 flex-wrap">
												{member.tags.map((tag, tagIndex) => (
													<Badge key={tagIndex} variant="secondary" className="text-xs">
														{tag}
													</Badge>
												))}
											</div>
										</TableCell>
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
