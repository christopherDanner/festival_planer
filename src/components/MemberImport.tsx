import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importMembers, type MemberImportData } from "@/lib/memberService";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  tags?: string;
  notes?: string;
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
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      complete: (results) => {
        const data = results.data as ParsedRow[];
        const filteredData = data.filter(row => 
          Object.values(row).some(value => value && value.trim() !== '')
        );
        setParsedData(filteredData);
        
        // Auto-detect columns
        if (filteredData.length > 0) {
          const headers = Object.keys(filteredData[0]);
          const autoMapping: ColumnMapping = {};
          
          headers.forEach(header => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('vorname') || lowerHeader.includes('first')) {
              autoMapping.first_name = header;
            } else if (lowerHeader.includes('nachname') || lowerHeader.includes('last') || lowerHeader.includes('name')) {
              autoMapping.last_name = header;
            } else if (lowerHeader.includes('telefon') || lowerHeader.includes('phone')) {
              autoMapping.phone = header;
            } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
              autoMapping.email = header;
            } else if (lowerHeader.includes('tag') || lowerHeader.includes('skill') || lowerHeader.includes('rolle')) {
              autoMapping.tags = header;
            } else if (lowerHeader.includes('notiz') || lowerHeader.includes('note')) {
              autoMapping.notes = header;
            }
          });
          
          setColumnMapping(autoMapping);
        }
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const generatePreview = () => {
    if (!parsedData.length || !columnMapping.first_name || !columnMapping.last_name) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens Vorname und Nachname aus.",
        variant: "destructive",
      });
      return;
    }

    const preview = parsedData.slice(0, 10).map(row => {
      const member: MemberImportData = {
        first_name: row[columnMapping.first_name!] || '',
        last_name: row[columnMapping.last_name!] || '',
        phone: columnMapping.phone ? row[columnMapping.phone] : undefined,
        email: columnMapping.email ? row[columnMapping.email] : undefined,
        tags: columnMapping.tags 
          ? row[columnMapping.tags].split(',').map(tag => tag.trim()).filter(Boolean)
          : [],
        notes: columnMapping.notes ? row[columnMapping.notes] : undefined,
      };
      return member;
    });

    setPreviewData(preview);
  };

  const handleImport = async () => {
    if (!parsedData.length || !columnMapping.first_name || !columnMapping.last_name) {
      return;
    }

    setIsLoading(true);
    try {
      const membersToImport = parsedData.map(row => {
        const member: MemberImportData = {
          first_name: row[columnMapping.first_name!] || '',
          last_name: row[columnMapping.last_name!] || '',
          phone: columnMapping.phone ? row[columnMapping.phone] : undefined,
          email: columnMapping.email ? row[columnMapping.email] : undefined,
          tags: columnMapping.tags 
            ? row[columnMapping.tags].split(',').map(tag => tag.trim()).filter(Boolean)
            : [],
          notes: columnMapping.notes ? row[columnMapping.notes] : undefined,
        };
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
            CSV/Excel Import
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
            <CardTitle>Spalten zuordnen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Vorname *</Label>
                <Select
                  value={columnMapping.first_name || ''}
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, first_name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nachname *</Label>
                <Select
                  value={columnMapping.last_name || ''}
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, last_name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Telefon</Label>
                <Select
                  value={columnMapping.phone || ''}
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, phone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Zuordnung</SelectItem>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>E-Mail</Label>
                <Select
                  value={columnMapping.email || ''}
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, email: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Zuordnung</SelectItem>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tags/Rollen (kommagetrennt)</Label>
                <Select
                  value={columnMapping.tags || ''}
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, tags: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Zuordnung</SelectItem>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notizen</Label>
                <Select
                  value={columnMapping.notes || ''}
                  onValueChange={(value) => setColumnMapping(prev => ({ ...prev, notes: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spalte auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Zuordnung</SelectItem>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePreview} variant="outline">
                Vorschau generieren
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!columnMapping.first_name || !columnMapping.last_name || isLoading}
              >
                {isLoading ? "Importiere..." : `${parsedData.length} Personen importieren`}
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