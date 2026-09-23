import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Sponsor } from '@/lib/sponsorService';

/**
 * Was das Formular herausgibt — genau die sieben Stammdaten-Felder des
 * *Sponsors* (CONTEXT.md). Leere Felder sind `null`, nicht `''`: „kein
 * Ansprechpartner" ist etwas anderes als „ein Ansprechpartner namens nichts".
 * Der Firmenname ist Pflicht und darum kein `null`.
 */
export type SponsorFormValues = Pick<Sponsor, 'company_name'> &
	Pick<Sponsor, 'contact_person' | 'email' | 'phone' | 'address' | 'website' | 'notes'>;

export interface SponsorFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Die Firma, deren Stammdaten gezeigt werden; `null` legt eine neue an. */
	sponsor: Sponsor | null;
	onSave: (values: SponsorFormValues) => void;
	saving?: boolean;
}

/** Ein leeres Feld ist kein leerer Text, sondern keine Angabe. */
const trimmedOrNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/**
 * Die *Firmendaten* eines globalen *Sponsors*. Gebaut als eigene Komponente,
 * damit sie **mehrere Einstiege** tragen kann (#150): heute hängt sie am ⋮ der
 * Sponsoring-Matrix; „+ SPONSOR → Neue Firma" und die Sponsoren-Stammdatenseite
 * holen sie mit ihren eigenen Slices dazu (#101/#159) — die Seite bringt bis
 * dahin ihr eigenes Formular mit, samt Löschweg, den es hier nicht gibt.
 *
 * Es kennt darum **keinen Fest-Kontext**: der Sponsor lebt über allen Festen
 * (ADR 0011). Und es kennt keinen Datenzugriff — geschrieben wird über
 * `onSave`, sodass jeder Einstieg seinen eigenen Anschluss behält
 * (`createSponsor` bzw. `updateSponsor`).
 *
 * Der fachliche Anlass steht im Bereichszweck: man sitzt mit dem Telefon vor
 * der Matrix, und die Nummer liegt am globalen Stammsatz. Ohne diesen Weg
 * müsste man den Bereich verlassen, um anzurufen.
 */
const SponsorFormDialog: React.FC<SponsorFormDialogProps> = ({
	open,
	onOpenChange,
	sponsor,
	onSave,
	saving = false
}) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
			<DialogHeader>
				<DialogTitle>{sponsor ? 'Firmendaten' : 'Neue Firma anlegen'}</DialogTitle>
				{/* Sagt, wie weit die Änderung reicht: der Sponsor ist global, die
				neue Telefonnummer gilt auch auf der Sponsoren-Seite (ADR 0011). */}
				<DialogDescription>Stammdaten der Firma — sie gelten für alle Feste.</DialogDescription>
			</DialogHeader>
			{/* Die Felder stehen erst ab dem Öffnen im Baum — so beginnt jedes Öffnen
			beim gespeicherten Stand und nicht bei einem alten Tippstand. */}
			<SponsorFields
				sponsor={sponsor}
				saving={saving}
				onSave={onSave}
				onCancel={() => onOpenChange(false)}
			/>
		</DialogContent>
	</Dialog>
);

const SponsorFields: React.FC<{
	sponsor: Sponsor | null;
	saving: boolean;
	onSave: (values: SponsorFormValues) => void;
	onCancel: () => void;
}> = ({ sponsor, saving, onSave, onCancel }) => {
	const [form, setForm] = useState({
		company_name: sponsor?.company_name ?? '',
		contact_person: sponsor?.contact_person ?? '',
		email: sponsor?.email ?? '',
		phone: sponsor?.phone ?? '',
		address: sponsor?.address ?? '',
		website: sponsor?.website ?? '',
		notes: sponsor?.notes ?? ''
	});

	const set = (field: keyof typeof form) => (value: string) =>
		setForm((prev) => ({ ...prev, [field]: value }));

	/* Ohne Firmennamen gibt es keine Firma — der Knopf ist gesperrt, statt beim
	Drücken einen Fehler zu melden. */
	const complete = form.company_name.trim() !== '';

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				if (!complete) return;
				onSave({
					company_name: form.company_name.trim(),
					contact_person: trimmedOrNull(form.contact_person),
					email: trimmedOrNull(form.email),
					phone: trimmedOrNull(form.phone),
					address: trimmedOrNull(form.address),
					website: trimmedOrNull(form.website),
					notes: trimmedOrNull(form.notes)
				});
			}}>
			<div>
				<Label htmlFor="sponsor_company_name">Firmenname *</Label>
				<Input
					id="sponsor_company_name"
					value={form.company_name}
					onChange={(e) => set('company_name')(e.target.value)}
					placeholder="Firmenname"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="sponsor_contact_person">Ansprechpartner</Label>
					<Input
						id="sponsor_contact_person"
						value={form.contact_person}
						onChange={(e) => set('contact_person')(e.target.value)}
						placeholder="Ansprechpartner"
					/>
				</div>
				<div>
					<Label htmlFor="sponsor_email">E-Mail</Label>
					<Input
						id="sponsor_email"
						type="email"
						value={form.email}
						onChange={(e) => set('email')(e.target.value)}
						placeholder="E-Mail Adresse"
					/>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="sponsor_phone">Telefon</Label>
					{/* `tel` schaltet am Handy die Zifferntastatur auf — ein Wählen aus
					dem Formular heraus ist es nicht; das Feld ist zum Ablesen da. */}
					<Input
						id="sponsor_phone"
						type="tel"
						value={form.phone}
						onChange={(e) => set('phone')(e.target.value)}
						placeholder="Telefonnummer"
					/>
				</div>
				<div>
					<Label htmlFor="sponsor_website">Website</Label>
					<Input
						id="sponsor_website"
						value={form.website}
						onChange={(e) => set('website')(e.target.value)}
						placeholder="https://..."
					/>
				</div>
			</div>

			<div>
				<Label htmlFor="sponsor_address">Adresse</Label>
				<Input
					id="sponsor_address"
					value={form.address}
					onChange={(e) => set('address')(e.target.value)}
					placeholder="Adresse"
				/>
			</div>

			<div>
				<Label htmlFor="sponsor_notes">Notizen</Label>
				{/* Die Notiz der **Firma** (`sponsors.notes`) — nicht die des
				Sponsorings, die im ⋮ daneben liegt (`sponsorings.notes`). */}
				<Textarea
					id="sponsor_notes"
					value={form.notes}
					onChange={(e) => set('notes')(e.target.value)}
					placeholder="Zusätzliche Notizen zur Firma"
					rows={3}
				/>
			</div>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Abbrechen
				</Button>
				<Button type="submit" disabled={saving || !complete}>
					Speichern
				</Button>
			</div>
		</form>
	);
};

export default SponsorFormDialog;
