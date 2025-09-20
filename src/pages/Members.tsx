import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Phone, 
  Mail,
  Tags,
  Plus
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import MemberImport from "@/components/MemberImport";
import Navigation from "@/components/Navigation";
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  type Member,
} from "@/lib/memberService";

const Members = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showImport, setShowImport] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    tags: [] as string[],
    notes: '',
    is_active: true,
  });
  const [newTag, setNewTag] = useState('');

  // Common tags
  const commonTags = ['Grill', 'Kassa', 'Sanitäter', 'Sicherheit', 'Technik', 'Aufbau', 'Abbau', 'Küche', 'Bar', 'Service'];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadMembers();
  }, [user, navigate]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, tagFilter, activeFilter]);

  const loadMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Mitglieder konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone?.includes(searchTerm)
      );
    }

    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter(member =>
        member.tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
      );
    }

    // Active filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(member => 
        activeFilter === 'active' ? member.is_active : !member.is_active
      );
    }

    setFilteredMembers(filtered);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      tags: [],
      notes: '',
      is_active: true,
    });
    setNewTag('');
    setEditingMember(null);
  };

  const handleSaveMember = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: "Fehler",
        description: "Vorname und Nachname sind erforderlich.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingMember) {
        await updateMember(editingMember.id, formData);
        toast({
          title: "Erfolg",
          description: "Mitglied wurde aktualisiert.",
        });
      } else {
        await createMember(formData);
        toast({
          title: "Erfolg",
          description: "Mitglied wurde hinzugefügt.",
        });
      }
      
      resetForm();
      setShowAddMember(false);
      loadMembers();
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Möchten Sie ${member.first_name} ${member.last_name} wirklich löschen?`)) {
      return;
    }

    try {
      await deleteMember(member.id);
      toast({
        title: "Erfolg",
        description: "Mitglied wurde gelöscht.",
      });
      loadMembers();
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Löschen",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = (member: Member) => {
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      email: member.email || '',
      tags: [...member.tags],
      notes: member.notes || '',
      is_active: member.is_active,
    });
    setEditingMember(member);
    setShowAddMember(true);
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const allTags = Array.from(new Set(members.flatMap(member => member.tags))).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="text-lg">Lade Mitglieder...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Mitgliederverwaltung
            </h1>
            <p className="text-muted-foreground mt-2">
              Verwalten Sie Ihre Vereinsmitglieder für alle Feste
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowImport(true)} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              CSV Import
            </Button>
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Mitglied hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingMember ? 'Mitglied bearbeiten' : 'Neues Mitglied hinzufügen'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Vorname *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="Vorname"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Nachname *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Nachname"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Telefonnummer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-Mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="E-Mail Adresse"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Tags/Rollen</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Neuen Tag eingeben"
                        onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
                      />
                      <Button onClick={() => addTag(newTag)} type="button" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-1 flex-wrap mb-2">
                      {commonTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={formData.tags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => addTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Zusätzliche Notizen"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Mitglied ist aktiv</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddMember(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleSaveMember}>
                      {editingMember ? 'Aktualisieren' : 'Hinzufügen'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Suche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, E-Mail oder Telefon..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Tag Filter</Label>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={activeFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setActiveFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setTagFilter('');
                    setActiveFilter('all');
                  }}
                >
                  Filter zurücksetzen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Mitglieder ({filteredMembers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Keine Mitglieder gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {member.first_name} {member.last_name}
                          </div>
                          {member.notes && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {member.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {member.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          )}
                          {member.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {member.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {member.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditMember(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteMember(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Import Dialog */}
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mitglieder importieren</DialogTitle>
            </DialogHeader>
            <MemberImport
              onImportComplete={loadMembers}
              onClose={() => setShowImport(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Members;