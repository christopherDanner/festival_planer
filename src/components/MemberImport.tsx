import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Brain, CheckCircle, AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importMembers, type MemberImportData } from "@/lib/memberService";
import { supabase } from "@/integrations/supabase/client";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  [columnName: string]: keyof MemberImportData | "";
}

interface AIAnalysis {
  mappings: Record<string, {
    field: string;
    confidence: number;
    reasoning: string;
  }>;
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
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<MemberImportData[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalysisError(null);

    Papa.parse(selectedFile, {
      complete: async (results) => {
        const data = results.data as ParsedRow[];
        const filteredData = data.filter(row => 
          Object.values(row).some(value => value && value.trim() !== '')
        );
        
        if (filteredData.length === 0) {
          toast({
            title: "Fehler",
            description: "Die Datei enthält keine gültigen Daten.",
            variant: "destructive",
          });
          return;
        }

        setParsedData(filteredData);
        const headers = Object.keys(filteredData[0]);
        
        // Start AI analysis
        await analyzeWithAI(headers, filteredData.slice(0, 10));
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const analyzeWithAI = async (headers: string[], sampleRows: ParsedRow[]) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      console.log('Starting AI analysis...');
      const { data, error } = await supabase.functions.invoke('analyze-member-import', {
        body: {
          headers,
          sampleRows: sampleRows.map(row => Object.values(row))
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
      
      setColumnMapping(aiMapping);
      
      toast({
        title: "KI-Analyse abgeschlossen",
        description: `${Object.keys(aiMapping).length} Spalten automatisch erkannt`,
      });
      
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      
      // Fallback to basic auto-detection
      const basicMapping: ColumnMapping = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
          basicMapping[header] = 'email';
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('telefon') || lowerHeader.includes('tel')) {
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
      setColumnMapping(basicMapping);
      
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePreview = () => {
    if (!parsedData.length) {
      toast({
        title: "Fehler",
        description: "Keine Daten zum Anzeigen verfügbar.",
        variant: "destructive",
      });
      return;
    }

    const firstNameCol = Object.keys(columnMapping).find(key => columnMapping[key] === 'first_name');
    const lastNameCol = Object.keys(columnMapping).find(key => columnMapping[key] === 'last_name');

    if (!firstNameCol && !lastNameCol) {
      toast({
        title: "Fehler",
        description: "Bitte ordnen Sie mindestens Vor- oder Nachname zu.",
        variant: "destructive",
      });
      return;
    }

    const preview = parsedData.slice(0, 10).map(row => {
      const member: MemberImportData = {
        first_name: firstNameCol ? (row[firstNameCol] || '') : '',
        last_name: lastNameCol ? (row[lastNameCol] || '') : '',
        phone: undefined,
        email: undefined,
        tags: [],
        notes: undefined,
      };

      // Map other fields
      Object.entries(columnMapping).forEach(([column, field]) => {
        if (field === 'phone') {
          member.phone = row[column] || undefined;
        } else if (field === 'email') {
          member.email = row[column] || undefined;
        } else if (field === 'tags') {
          const tagValue = row[column];
          if (tagValue) {
            member.tags = tagValue.split(',').map(tag => tag.trim()).filter(Boolean);
          }
        } else if (field === 'notes') {
          member.notes = row[column] || undefined;
        }
      });

      return member;
    });

    setPreviewData(preview);
  };

  const handleImport = async () => {
    if (!parsedData.length) {
      return;
    }

    const firstNameCol = Object.keys(columnMapping).find(key => columnMapping[key] === 'first_name');
    const lastNameCol = Object.keys(columnMapping).find(key => columnMapping[key] === 'last_name');

    if (!firstNameCol && !lastNameCol) {
      toast({
        title: "Fehler",
        description: "Bitte ordnen Sie mindestens Vor- oder Nachname zu.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const membersToImport = parsedData.map(row => {
        const member: MemberImportData = {
          first_name: firstNameCol ? (row[firstNameCol] || '') : '',
          last_name: lastNameCol ? (row[lastNameCol] || '') : '',
          phone: undefined,
          email: undefined,
          tags: [],
          notes: undefined,
        };

        // Map other fields
        Object.entries(columnMapping).forEach(([column, field]) => {
          if (field === 'phone') {
            member.phone = row[column] || undefined;
          } else if (field === 'email') {
            member.email = row[column] || undefined;
          } else if (field === 'tags') {
            const tagValue = row[column];
            if (tagValue) {
              member.tags = tagValue.split(',').map(tag => tag.trim()).filter(Boolean);
            }
          } else if (field === 'notes') {
            member.notes = row[column] || undefined;
          }
        });

        return member;
      });

      await importMembers(membersToImport);
      
      toast({
        title: "Import erfolgreich",
        description: `${membersToImport.length} Personen wurden importiert.`,
      });
      
      onImportComplete();
      onClose();
    } catch (error) {
      toast({
        title: "Import Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const availableColumns = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];

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

      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Intelligente Spalten-Zuordnung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {availableColumns.map(column => (
                <div key={column} className="space-y-2">
                  <Label className="font-medium">{column}</Label>
                  <Select
                    value={columnMapping[column] || ''}
                    onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [column]: value as keyof MemberImportData | '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Feld auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nicht zuordnen</SelectItem>
                      <SelectItem value="first_name">Vorname</SelectItem>
                      <SelectItem value="last_name">Nachname</SelectItem>
                      <SelectItem value="phone">Telefon</SelectItem>
                      <SelectItem value="email">E-Mail</SelectItem>
                      <SelectItem value="tags">Tags</SelectItem>
                      <SelectItem value="notes">Notizen</SelectItem>
                    </SelectContent>
                  </Select>
                  {aiAnalysis?.mappings[column] && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <Brain className="h-3 w-3 text-blue-500" />
                      <span className="text-muted-foreground">
                        KI-Vorschlag: {aiAnalysis.mappings[column].field} 
                        ({Math.round(aiAnalysis.mappings[column].confidence * 100)}% Sicherheit)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePreview} variant="outline">
                Vorschau generieren
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={Object.keys(columnMapping).filter(k => columnMapping[k]).length === 0 || isLoading}
              >
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