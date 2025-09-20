import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Clock, MapPin, Users, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getShifts,
  getStations,
  getShiftAssignments,
  createShift,
  createStation,
  assignMemberToShift,
  removeMemberFromShift,
  type Shift,
  type Station,
  type ShiftAssignmentWithMember
} from "@/lib/shiftService";
import { getMembers, type Member } from "@/lib/memberService";

interface ShiftMatrixProps {
  festivalId: string;
}

interface MatrixCell {
  shiftId: string;
  stationId: string;
  assignments: ShiftAssignmentWithMember[];
  requiredPeople: number;
}

const ShiftMatrix: React.FC<ShiftMatrixProps> = ({ festivalId }) => {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignmentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showStationDialog, setShowStationDialog] = useState(false);
  
  // Form states
  const [shiftForm, setShiftForm] = useState({
    name: '',
    start_date: '',
    start_time: '',
    end_time: ''
  });
  
  const [stationForm, setStationForm] = useState({
    name: '',
    required_people: 1,
    description: ''
  });

  // Drag and drop state
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);

  useEffect(() => {
    loadData();
  }, [festivalId]);

  const loadData = async () => {
    try {
      const [shiftsData, stationsData, assignmentsData, membersData] = await Promise.all([
        getShifts(festivalId),
        getStations(festivalId),
        getShiftAssignments(festivalId),
        getMembers()
      ]);
      
      setShifts(shiftsData);
      setStations(stationsData);
      setAssignments(assignmentsData);
      setMembers(membersData.filter(m => m.is_active));
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async () => {
    if (!shiftForm.name || !shiftForm.start_date || !shiftForm.start_time || !shiftForm.end_time) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createShift({
        festival_id: festivalId,
        ...shiftForm
      });
      
      setShiftForm({ name: '', start_date: '', start_time: '', end_time: '' });
      setShowShiftDialog(false);
      loadData();
      
      toast({
        title: "Erfolg",
        description: "Schicht wurde erstellt.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Schicht konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };

  const handleCreateStation = async () => {
    if (!stationForm.name) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createStation({
        festival_id: festivalId,
        ...stationForm
      });
      
      setStationForm({ name: '', required_people: 1, description: '' });
      setShowStationDialog(false);
      loadData();
      
      toast({
        title: "Erfolg",
        description: "Station wurde erstellt.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Station konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };

  const getMatrixCell = (shiftId: string, stationId: string): MatrixCell => {
    const station = stations.find(s => s.id === stationId);
    const cellAssignments = assignments.filter(a => 
      a.shift_id === shiftId && a.station_id === stationId && a.member_id
    );
    
    return {
      shiftId,
      stationId,
      assignments: cellAssignments,
      requiredPeople: station?.required_people || 1
    };
  };

  const getCellColor = (cell: MatrixCell): string => {
    const assigned = cell.assignments.length;
    const required = cell.requiredPeople;
    
    if (assigned >= required) return 'bg-success/20 border-success';
    if (assigned > 0) return 'bg-warning/20 border-warning';
    return 'bg-destructive/20 border-destructive';
  };

  const getRemainingBadgeVariant = (cell: MatrixCell): "default" | "secondary" | "destructive" | "outline" => {
    const remaining = cell.requiredPeople - cell.assignments.length;
    if (remaining === 0) return 'default';
    if (remaining < cell.requiredPeople / 2) return 'secondary';
    return 'destructive';
  };

  const handleDragStart = (member: Member) => {
    setDraggedMember(member);
  };

  const handleDragEnd = () => {
    setDraggedMember(null);
  };

  const handleDrop = async (shiftId: string, stationId: string, e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedMember) return;

    try {
      const cell = getMatrixCell(shiftId, stationId);
      if (cell.assignments.length >= cell.requiredPeople) {
        toast({
          title: "Hinweis",
          description: "Diese Station ist bereits vollständig besetzt.",
          variant: "destructive",
        });
        return;
      }

      await assignMemberToShift(festivalId, shiftId, stationId, draggedMember.id, cell.assignments.length + 1);
      loadData();
      
      toast({
        title: "Erfolg",
        description: `${draggedMember.first_name} ${draggedMember.last_name} wurde zugewiesen.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Zuweisung konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
    
    setDraggedMember(null);
  };

  const handleRemoveMember = async (shiftId: string, stationId: string, memberId: string) => {
    try {
      await removeMemberFromShift(festivalId, shiftId, stationId, memberId);
      loadData();
      
      toast({
        title: "Erfolg",
        description: "Zuweisung wurde entfernt.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Zuweisung konnte nicht entfernt werden.",
        variant: "destructive",
      });
    }
  };

  const getAssignedMemberIds = (): Set<string> => {
    return new Set(assignments.filter(a => a.member_id).map(a => a.member_id!));
  };

  const getFreMembers = (): Member[] => {
    const assignedIds = getAssignedMemberIds();
    return members.filter(member => !assignedIds.has(member.id));
  };

  const formatShiftTime = (shift: Shift): string => {
    const date = new Date(shift.start_date).toLocaleDateString('de-AT', { 
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
    return `${date} ${shift.start_time}-${shift.end_time}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Lade Schichtplan...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Schichtplan Matrix
          </h2>
          <p className="text-muted-foreground">
            Ziehen Sie Mitglieder aus der Liste in die gewünschten Schichten
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Schicht hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Schicht erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shift-name">Name</Label>
                  <Input
                    id="shift-name"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Freitag Abend"
                  />
                </div>
                <div>
                  <Label htmlFor="shift-date">Datum</Label>
                  <Input
                    id="shift-date"
                    type="date"
                    value={shiftForm.start_date}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Von</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">Bis</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreateShift}>
                    Erstellen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showStationDialog} onOpenChange={setShowStationDialog}>
            <DialogTrigger asChild>
              <Button>
                <MapPin className="h-4 w-4 mr-2" />
                Station hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Station erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="station-name">Name</Label>
                  <Input
                    id="station-name"
                    value={stationForm.name}
                    onChange={(e) => setStationForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Grill, Kassa, Bar"
                  />
                </div>
                <div>
                  <Label htmlFor="required-people">Benötigte Personen</Label>
                  <Input
                    id="required-people"
                    type="number"
                    min="1"
                    value={stationForm.required_people}
                    onChange={(e) => setStationForm(prev => ({ ...prev, required_people: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="station-description">Beschreibung (optional)</Label>
                  <Textarea
                    id="station-description"
                    value={stationForm.description}
                    onChange={(e) => setStationForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Zusätzliche Informationen..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowStationDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreateStation}>
                    Erstellen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Matrix */}
      {shifts.length === 0 || stations.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {shifts.length === 0 && stations.length === 0 && (
                <p>Erstellen Sie zuerst Schichten und Stationen, um die Matrix zu sehen.</p>
              )}
              {shifts.length === 0 && stations.length > 0 && (
                <p>Erstellen Sie Schichten, um die Matrix zu sehen.</p>
              )}
              {shifts.length > 0 && stations.length === 0 && (
                <p>Erstellen Sie Stationen, um die Matrix zu sehen.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left font-medium min-w-[150px] sticky left-0 bg-muted/50">
                      Station
                    </th>
                    {shifts.map((shift) => (
                      <th key={shift.id} className="p-4 text-center font-medium min-w-[200px]">
                        <div className="space-y-1">
                          <div className="font-semibold">{shift.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatShiftTime(shift)}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station) => (
                    <tr key={station.id} className="border-b">
                      <td className="p-4 font-medium sticky left-0 bg-background">
                        <div className="space-y-1">
                          <div>{station.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {station.required_people} Personen
                          </div>
                        </div>
                      </td>
                      {shifts.map((shift) => {
                        const cell = getMatrixCell(shift.id, station.id);
                        const remaining = cell.requiredPeople - cell.assignments.length;
                        
                        return (
                          <td key={`${shift.id}-${station.id}`} className="p-2">
                            <div
                              className={cn(
                                "min-h-[120px] border-2 rounded-lg p-2 space-y-2 transition-colors",
                                getCellColor(cell),
                                "relative"
                              )}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(shift.id, station.id, e)}
                            >
                              <div className="flex justify-between items-start">
                                <Badge variant={getRemainingBadgeVariant(cell)} className="text-xs">
                                  {remaining > 0 ? `${remaining} fehlt` : 'Vollständig'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1">
                                {cell.assignments.map((assignment) => (
                                  <div
                                    key={assignment.id}
                                    className="flex items-center justify-between bg-background/80 rounded px-2 py-1 text-sm group"
                                  >
                                    <span className="font-medium">
                                      {assignment.member?.first_name} {assignment.member?.last_name}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                                      onClick={() => handleRemoveMember(shift.id, station.id, assignment.member_id!)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              
                              {remaining > 0 && (
                                <div className="text-xs text-muted-foreground text-center border-dashed border rounded p-2">
                                  Person hier ablegen
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Free Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Freie Personen ({getFreMembers().length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getFreMembers().length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Alle Mitglieder sind bereits eingeteilt.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {getFreMembers().map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 cursor-move hover:bg-secondary/80 transition-colors"
                  draggable
                  onDragStart={() => handleDragStart(member)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="font-medium">
                    {member.first_name} {member.last_name}
                  </span>
                  {member.tags.length > 0 && (
                    <div className="flex gap-1">
                      {member.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {member.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftMatrix;