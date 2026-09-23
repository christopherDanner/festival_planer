import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { scheduleDayTitle } from '@/lib/scheduleWorklist';

/** Der fertige Eintrag, wie ihn der Dialog abliefert — das, was der Service
anlegt oder aktualisiert. */
export interface ScheduleEntryFormData {
	schedule_day_id: string;
	schedule_phase_id: string | null;
	festival_id: string;
	title: string;
	type: 'task' | 'program';
	start_time: string | null;
	end_time: string | null;
	responsible_helper_id: string | null;
	status: 'open' | 'done' | null;
	description: string | null;
}

interface ScheduleEntryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entry?: {
		id: string;
		schedule_day_id: string;
		title: string;
		type: 'task' | 'program';
		start_time: string | null;
		end_time: string | null;
		responsible_helper_id: string | null;
		status: 'open' | 'done' | null;
		description: string | null;
	} | null;
	/** Die Art eines **neuen** Eintrags: „+ AUFGABE" und „+ PROGRAMMPUNKT" der
	Werkzeugleiste führen in denselben Dialog (#122). Umschalten geht weiter. */
	defaultType?: 'task' | 'program';
	/** Der Eintrag gehört dem Tag — die einzige Pflichtebene (ADR 0007). Hier
	steht der vorbelegte Tag; gewählt wird im Feld darunter. */
	scheduleDayId: string;
	/** Alle Ablauf-Tage des Fests zur Wahl — auch die ohne Eintrag, die in der
	Werkliste gar nicht erscheinen (#122). */
	days: Array<{ id: string; date: string; label: string | null }>;
	/** Optionaler Feinschnitt; `null` heißt „direkt unter dem Tag". */
	schedulePhaseId: string | null;
	festivalId: string;
	/** Die Verantwortlichen sind die Helfer dieses Fests (ADR 0005). */
	helpers: Array<{ id: string; first_name: string; last_name: string }>;
	onSave: (data: ScheduleEntryFormData) => void;
}

const ScheduleEntryDialog: React.FC<ScheduleEntryDialogProps> = ({
	open,
	onOpenChange,
	entry,
	defaultType = 'task',
	scheduleDayId,
	days,
	schedulePhaseId,
	festivalId,
	helpers,
	onSave
}) => {
	const [form, setForm] = useState({
		title: '',
		type: 'task' as string,
		schedule_day_id: '',
		start_time: '',
		end_time: '',
		responsible_helper_id: '' as string,
		description: ''
	});

	useEffect(() => {
		if (entry) {
			setForm({
				title: entry.title,
				type: entry.type,
				schedule_day_id: entry.schedule_day_id || scheduleDayId,
				start_time: entry.start_time || '',
				end_time: entry.end_time || '',
				responsible_helper_id: entry.responsible_helper_id || '',
				description: entry.description || ''
			});
		} else {
			setForm({
				title: '',
				type: defaultType,
				schedule_day_id: scheduleDayId,
				start_time: '',
				end_time: '',
				responsible_helper_id: '',
				description: ''
			});
		}
	}, [entry, open, defaultType, scheduleDayId]);

	const handleSave = () => {
		if (!form.title || !form.schedule_day_id) return;
		if (form.start_time && form.end_time && form.start_time >= form.end_time) return;

		const type = form.type as 'task' | 'program';
		onSave({
			schedule_day_id: form.schedule_day_id,
			// Die Phase gehört ihrem Tag: zieht der Eintrag auf einen anderen Tag,
			// lässt er sie zurück, statt unter einem fremden Zwischentitel zu hängen.
			schedule_phase_id: form.schedule_day_id === scheduleDayId ? schedulePhaseId : null,
			festival_id: festivalId,
			title: form.title,
			type,
			start_time: form.start_time || null,
			end_time: form.end_time || null,
			responsible_helper_id: form.responsible_helper_id && form.responsible_helper_id !== '__none__' ? form.responsible_helper_id : null,
			status: type === 'task' ? (entry?.status || 'open') : null,
			description: form.description || null
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

					{/* Der Tag ist die Pflichtebene (ADR 0007) und seit #122 hier zu
					wählen: mit dem Akkordeon ist der tagesbezogene „+"-Griff entfallen.
					Zur Wahl stehen auch Tage ohne Eintrag, die in der Werkliste gar
					nicht erscheinen. */}
					<div>
						<Label htmlFor="entry-day">Tag *</Label>
						<Select
							value={form.schedule_day_id}
							onValueChange={(value) => setForm((prev) => ({ ...prev, schedule_day_id: value }))}>
							<SelectTrigger id="entry-day">
								<SelectValue placeholder="Tag auswählen" />
							</SelectTrigger>
							<SelectContent>
								{days.map((day) => (
									<SelectItem key={day.id} value={day.id}>
										{scheduleDayTitle(day)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
							value={form.responsible_helper_id || '__none__'}
							onValueChange={(value) =>
								setForm((prev) => ({ ...prev, responsible_helper_id: value === '__none__' ? '' : value }))
							}>
							<SelectTrigger id="entry-responsible">
								<SelectValue placeholder="Kein Verantwortlicher" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Kein Verantwortlicher</SelectItem>
								{helpers.map((helper) => (
									<SelectItem key={helper.id} value={helper.id}>
										{helper.last_name} {helper.first_name}
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
							disabled={
								!form.title ||
								!form.schedule_day_id ||
								(!!form.start_time && !!form.end_time && form.start_time >= form.end_time)
							}
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
