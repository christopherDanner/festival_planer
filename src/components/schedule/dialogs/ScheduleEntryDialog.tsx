import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScheduleEntryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entry?: {
		id: string;
		title: string;
		type: 'task' | 'program';
		start_time: string | null;
		end_time: string | null;
		responsible_member_id: string | null;
		status: 'open' | 'done' | null;
		description: string | null;
		sort_order?: number;
	} | null;
	schedulePhaseId: string;
	festivalId: string;
	members: Array<{ id: string; first_name: string; last_name: string }>;
	sortOrder: number;
	onSave: (data: {
		schedule_phase_id: string;
		festival_id: string;
		title: string;
		type: 'task' | 'program';
		start_time: string | null;
		end_time: string | null;
		responsible_member_id: string | null;
		status: 'open' | 'done' | null;
		description: string | null;
		sort_order: number;
	}) => void;
}

const ScheduleEntryDialog: React.FC<ScheduleEntryDialogProps> = ({
	open,
	onOpenChange,
	entry,
	schedulePhaseId,
	festivalId,
	members,
	sortOrder,
	onSave
}) => {
	const [form, setForm] = useState({
		title: '',
		type: 'task' as string,
		start_time: '',
		end_time: '',
		responsible_member_id: '' as string,
		description: ''
	});

	useEffect(() => {
		if (entry) {
			setForm({
				title: entry.title,
				type: entry.type,
				start_time: entry.start_time || '',
				end_time: entry.end_time || '',
				responsible_member_id: entry.responsible_member_id || '',
				description: entry.description || ''
			});
		} else {
			setForm({
				title: '',
				type: 'task',
				start_time: '',
				end_time: '',
				responsible_member_id: '',
				description: ''
			});
		}
	}, [entry, open]);

	const handleSave = () => {
		if (!form.title) return;
		if (form.start_time && form.end_time && form.start_time >= form.end_time) return;

		const type = form.type as 'task' | 'program';
		onSave({
			schedule_phase_id: schedulePhaseId,
			festival_id: festivalId,
			title: form.title,
			type,
			start_time: form.start_time || null,
			end_time: form.end_time || null,
			responsible_member_id: form.responsible_member_id && form.responsible_member_id !== '__none__' ? form.responsible_member_id : null,
			status: type === 'task' ? (entry?.status || 'open') : null,
			description: form.description || null,
			sort_order: entry ? entry.sort_order ?? sortOrder : sortOrder
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{entry ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen'}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4">
					<div>
						<Label htmlFor="entry-title">Titel *</Label>
						<Input
							id="entry-title"
							value={form.title}
							onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
						<div>
							<Label htmlFor="entry-type">Typ</Label>
							<Select
								value={form.type}
								onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
								<SelectTrigger id="entry-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="task">Aufgabe</SelectItem>
									<SelectItem value="program">Programmpunkt</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="entry-start">Startzeit</Label>
							<Input
								id="entry-start"
								type="time"
								value={form.start_time}
								onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
							/>
						</div>
						<div>
							<Label htmlFor="entry-end">Endzeit</Label>
							<Input
								id="entry-end"
								type="time"
								value={form.end_time}
								onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="entry-responsible">Verantwortlich</Label>
						<Select
							value={form.responsible_member_id || '__none__'}
							onValueChange={(value) =>
								setForm((prev) => ({ ...prev, responsible_member_id: value === '__none__' ? '' : value }))
							}>
							<SelectTrigger id="entry-responsible">
								<SelectValue placeholder="Kein Verantwortlicher" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Kein Verantwortlicher</SelectItem>
								{members.map((member) => (
									<SelectItem key={member.id} value={member.id}>
										{member.last_name} {member.first_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="entry-description">Beschreibung</Label>
						<Textarea
							id="entry-description"
							value={form.description}
							onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
							placeholder="Notizen..."
							rows={2}
						/>
					</div>

					{form.start_time && form.end_time && form.start_time >= form.end_time && (
						<p className="text-sm text-destructive">Startzeit muss vor der Endzeit liegen.</p>
					)}

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
							Abbrechen
						</Button>
						<Button
							onClick={handleSave}
							disabled={!form.title || (!!form.start_time && !!form.end_time && form.start_time >= form.end_time)}
							size="sm"
						>
							{entry ? 'Aktualisieren' : 'Hinzufügen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ScheduleEntryDialog;
