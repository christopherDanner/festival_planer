import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
	createMagicLink,
	getMagicLinksForFestival,
	deleteMagicLink,
	sendMagicLinkEmail,
	type MagicLink
} from '@/lib/magicLinkService';
import { getMembers } from '@/lib/memberService';
import { Copy, Mail, Trash2, Eye, Users, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface MagicLinkManagerProps {
	festivalId: string;
}

interface Member {
	id: string;
	first_name: string;
	last_name: string;
	email?: string;
	phone?: string;
	is_active: boolean;
}

const MagicLinkManager: React.FC<MagicLinkManagerProps> = ({ festivalId }) => {
	const { toast } = useToast();

	const [loading, setLoading] = useState(true);
	const [magicLinks, setMagicLinks] = useState<MagicLink[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [selectedMember, setSelectedMember] = useState<string>('');
	const [expiresInHours, setExpiresInHours] = useState(168); // 7 days
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [creating, setCreating] = useState(false);

	useEffect(() => {
		loadData();
	}, [festivalId]);

	const loadData = async () => {
		try {
			const [linksData, membersData] = await Promise.all([
				getMagicLinksForFestival(festivalId),
				getMembers()
			]);

			setMagicLinks(linksData);
			setMembers(membersData.filter((m) => m.is_active));
		} catch (error) {
			console.error('Error loading data:', error);
			toast({
				title: 'Fehler',
				description: 'Fehler beim Laden der Daten.',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	};

	const handleCreateMagicLink = async () => {
		if (!selectedMember) {
			toast({
				title: 'Fehler',
				description: 'Bitte wählen Sie ein Mitglied aus.',
				variant: 'destructive'
			});
			return;
		}

		setCreating(true);

		try {
			const magicLink = await createMagicLink(
				festivalId,
				selectedMember,
				undefined,
				expiresInHours
			);

			// Send email (in development, this will just log)
			const member = members.find((m) => m.id === selectedMember);
			if (member) {
				await sendMagicLinkEmail(
					magicLink,
					`${member.first_name} ${member.last_name}`,
					'Festival', // You might want to get the festival name
					window.location.origin
				);
			}

			await loadData();
			setShowCreateDialog(false);
			setSelectedMember('');

			toast({
				title: 'Erfolg',
				description: 'Magic Link wurde erstellt und per E-Mail versendet.'
			});
		} catch (error) {
			console.error('Error creating magic link:', error);
			toast({
				title: 'Fehler',
				description: 'Fehler beim Erstellen des Magic Links.',
				variant: 'destructive'
			});
		} finally {
			setCreating(false);
		}
	};

	const handleDeleteMagicLink = async (id: string) => {
		try {
			await deleteMagicLink(id);
			await loadData();
			toast({
				title: 'Erfolg',
				description: 'Magic Link wurde gelöscht.'
			});
		} catch (error) {
			console.error('Error deleting magic link:', error);
			toast({
				title: 'Fehler',
				description: 'Fehler beim Löschen des Magic Links.',
				variant: 'destructive'
			});
		}
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast({
			title: 'Kopiert',
			description: 'Link wurde in die Zwischenablage kopiert.'
		});
	};

	const getStatusBadge = (link: MagicLink) => {
		if (link.used_at) {
			return (
				<Badge variant="default" className="bg-green-100 text-green-800">
					<CheckCircle className="h-3 w-3 mr-1" />
					Verwendet
				</Badge>
			);
		}
		if (new Date() > new Date(link.expires_at)) {
			return <Badge variant="destructive">Abgelaufen</Badge>;
		}
		return <Badge variant="secondary">Aktiv</Badge>;
	};

	const getPreferenceStats = () => {
		const totalMembers = members.length;
		const activeLinks = magicLinks.filter(
			(link) => !link.used_at && new Date() <= new Date(link.expires_at)
		).length;
		const usedLinks = magicLinks.filter((link) => link.used_at).length;

		return {
			totalMembers,
			activeLinks,
			usedLinks
		};
	};

	const stats = getPreferenceStats();

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="h-24 bg-gray-200 rounded"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Magic Links & Präferenzen</h2>
					<p className="text-gray-600">Verwalten Sie die Präferenz-Erfassung Ihrer Mitglieder</p>
				</div>
				<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
					<DialogTrigger asChild>
						<Button>
							<Mail className="h-4 w-4 mr-2" />
							Magic Link erstellen
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Magic Link erstellen</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor="member-select">Mitglied auswählen</Label>
								<Select value={selectedMember} onValueChange={setSelectedMember}>
									<SelectTrigger>
										<SelectValue placeholder="Mitglied auswählen" />
									</SelectTrigger>
									<SelectContent>
										{members.map((member) => (
											<SelectItem key={member.id} value={member.id}>
												{member.first_name} {member.last_name} ({member.email})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="expires-hours">Gültigkeitsdauer (Stunden)</Label>
								<Input
									id="expires-hours"
									type="number"
									min="1"
									max="720"
									value={expiresInHours}
									onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 168)}
								/>
								<p className="text-sm text-gray-600 mt-1">Standard: 168 Stunden (7 Tage)</p>
							</div>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setShowCreateDialog(false)}>
									Abbrechen
								</Button>
								<Button onClick={handleCreateMagicLink} disabled={creating}>
									{creating ? 'Erstelle...' : 'Erstellen'}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center">
							<Users className="h-8 w-8 text-blue-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Mitglieder</p>
								<p className="text-2xl font-bold">{stats.totalMembers}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center">
							<Mail className="h-8 w-8 text-orange-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Aktive Links</p>
								<p className="text-2xl font-bold">{stats.activeLinks}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center">
							<Calendar className="h-8 w-8 text-purple-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Verwendete Links</p>
								<p className="text-2xl font-bold">{stats.usedLinks}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Magic Links */}
			<Card>
				<CardHeader>
					<CardTitle>Magic Links</CardTitle>
				</CardHeader>
				<CardContent>
					{magicLinks.length === 0 ? (
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Noch keine Magic Links erstellt. Erstellen Sie einen Link, um Mitgliedern die
								Präferenz-Erfassung zu ermöglichen.
							</AlertDescription>
						</Alert>
					) : (
						<div className="space-y-4">
							{magicLinks.map((link) => (
								<div
									key={link.id}
									className="flex items-center justify-between p-4 border rounded-lg">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<span className="font-medium">
												{members.find((m) => m.id === link.member_id)?.first_name}{' '}
												{members.find((m) => m.id === link.member_id)?.last_name}
											</span>
											{getStatusBadge(link)}
										</div>
										<div className="text-sm text-gray-600 space-y-1">
											<p>E-Mail: {members.find((m) => m.id === link.member_id)?.email}</p>
											<p>Erstellt: {new Date(link.created_at).toLocaleString('de-DE')}</p>
											<p>Läuft ab: {new Date(link.expires_at).toLocaleString('de-DE')}</p>
											{link.used_at && (
												<p>Verwendet: {new Date(link.used_at).toLocaleString('de-DE')}</p>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												copyToClipboard(`${window.location.origin}/preferences/${link.token}`)
											}>
											<Copy className="h-4 w-4" />
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												copyToClipboard(`${window.location.origin}/preferences/${link.token}`)
											}>
											<Eye className="h-4 w-4" />
										</Button>
										<Button
											size="sm"
											variant="outline"
											className="text-red-600 hover:text-red-700"
											onClick={() => handleDeleteMagicLink(link.id)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default MagicLinkManager;
