import React, { type ElementType } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NameChip } from '@/components/toolkit/NameChip';
import { SectionHeading } from '@/components/toolkit/SectionHeading';
import { ValueTag } from '@/components/toolkit/ValueTag';
import {
	FOCUS_INK,
	PaperSheet,
	PaperSheetField,
	PaperSheetFields,
	PaperSheetNote
} from '@/components/toolkit/PaperSheet';
import {
	buildWishBoard,
	canSaveHelper,
	toggleShiftWish,
	toggleStationWish,
	type HelperForm,
	type WishShift,
	type WishSource,
	type WishStation
} from '@/lib/helperDialogForm';

export interface HelperZettelProps {
	mode: 'create' | 'edit';
	form: HelperForm;
	/** Stationen und Schichten des Fests — woran die Wunsch-Marken hängen. */
	source: WishSource;
	onChange: (patch: Partial<HelperForm>) => void;
	onCancel: () => void;
	onSave: () => void;
	/** Der Radix-Dialog reicht hier seinen `DialogTitle` durch; alleinstehend
	 * (Schaukasten, Test) bleibt es eine gewöhnliche Überschrift. */
	TitleTag?: ElementType;
}

const FOCUS_RING =
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte';

/**
 * Der Helfer-Zettel (#107) — dasselbe Papier wie Station- und Schicht-Zettel
 * (`PaperSheet`), aber **ein** Blatt für beides: oben die Stammdaten, darunter
 * die Wünsche, getrennt durch die Punktraster-Zwischenzeile (`SectionHeading`).
 *
 * Zwei Dialoge waren nötig, solange die Wünsche in einer eigenen Tabelle lagen.
 * Seit ADR 0005 sind sie zwei `uuid[]`-Spalten auf **dieser** Helfer-Zeile —
 * ein zweites Blatt dafür wäre Ballast.
 *
 * Gewünscht wird durch Anklicken, nicht in Auswahllisten: die Station ist eine
 * Namens-Marke, ihre Schichten sind Wertmarken, gewählt ist gelb. Der Zettel
 * ist gesteuert — er hält keinen eigenen Zustand; die Regeln (auch die
 * Kopplung Schicht ⇄ Station) stehen in `helperDialogForm`.
 */
const HelperZettel: React.FC<HelperZettelProps> = ({
	mode,
	form,
	source,
	onChange,
	onCancel,
	onSave,
	TitleTag = 'h2'
}) => {
	const board = buildWishBoard(form, source);
	const mitSchichten = board.filter((station) => station.shifts.length > 0);

	return (
		<PaperSheet
			title={mode === 'edit' ? 'Helfer bearbeiten' : 'Neuer Helfer'}
			TitleTag={TitleTag}
			onClose={onCancel}
			footer={
				<>
					<Button variant="outline" className={FOCUS_INK} onClick={onCancel}>
						Abbrechen
					</Button>
					<Button
						data-zettel="speichern"
						className={FOCUS_INK}
						onClick={onSave}
						disabled={!canSaveHelper(form)}>
						{mode === 'edit' ? 'Speichern' : 'Anlegen'}
					</Button>
				</>
			}>
			<PaperSheetFields>
				<PaperSheetField label="Vorname" htmlFor="helper-first-name">
					<Input
						id="helper-first-name"
						className={FOCUS_INK}
						value={form.first_name}
						onChange={(e) => onChange({ first_name: e.target.value })}
						placeholder="z.B. Franz"
					/>
				</PaperSheetField>

				<PaperSheetField label="Nachname" htmlFor="helper-last-name">
					<Input
						id="helper-last-name"
						className={FOCUS_INK}
						value={form.last_name}
						onChange={(e) => onChange({ last_name: e.target.value })}
						placeholder="z.B. Hochauer"
					/>
				</PaperSheetField>

				<PaperSheetField label="E-Mail" htmlFor="helper-email">
					<Input
						id="helper-email"
						type="email"
						className={FOCUS_INK}
						value={form.email}
						onChange={(e) => onChange({ email: e.target.value })}
						placeholder="z.B. franz@example.at"
					/>
				</PaperSheetField>

				<PaperSheetField label="Telefon" htmlFor="helper-phone">
					<Input
						id="helper-phone"
						type="tel"
						className={FOCUS_INK}
						value={form.phone}
						onChange={(e) => onChange({ phone: e.target.value })}
						placeholder="z.B. 0660 1234567"
					/>
				</PaperSheetField>

				<PaperSheetField wide label="Notizen" htmlFor="helper-notes">
					<Textarea
						id="helper-notes"
						rows={2}
						className={FOCUS_INK}
						value={form.notes}
						onChange={(e) => onChange({ notes: e.target.value })}
						placeholder="z.B. kann nur Samstag, kein Zapfhahn"
					/>
				</PaperSheetField>

				<SectionHeading as="h3" className="mt-1 min-[900px]:col-span-2">
					Wünsche
				</SectionHeading>

				{board.length === 0 ? (
					<PaperSheetNote wide ton="warnung">
						Noch keine Station im Fest — Wünsche gibt es erst, wenn der Schichtplan Stationen
						führt.
					</PaperSheetNote>
				) : (
					<>
						<PaperSheetField
							wide
							label="Wunsch-Stationen"
							hint="Sie heben den Helfer in der Helferliste nach oben, sobald diese Station im Fokus steht.">
							<div role="group" aria-label="Wunsch-Stationen" className="flex flex-wrap gap-[5px]">
								{board.map((station) => (
									<StationMark
										key={station.id}
										station={station}
										onToggle={() =>
											onChange(toggleStationWish(form, station.id, source.stationShifts))
										}
									/>
								))}
							</div>
						</PaperSheetField>

						{mitSchichten.length > 0 && (
							<PaperSheetField
								wide
								label="Wunsch-Schichten"
								hint="Eine gewählte Schicht wünscht ihre Station gleich mit.">
								<div role="group" aria-label="Wunsch-Schichten" className="grid gap-2.5">
									{mitSchichten.map((station) => (
										<div key={station.id} className="grid gap-1.5">
											<span className="text-[10.5px] font-extrabold uppercase leading-none tracking-[.06em] text-tinte-soft">
												{station.name}
											</span>
											<div className="flex flex-wrap gap-[5px]">
												{station.shifts.map((shift) => (
													<ShiftMark
														key={shift.id}
														shift={shift}
														onToggle={() =>
															onChange(toggleShiftWish(form, shift.id, source.stationShifts))
														}
													/>
												))}
											</div>
										</div>
									))}
								</div>
							</PaperSheetField>
						)}
					</>
				)}
			</PaperSheetFields>
		</PaperSheet>
	);
};

/** Eine Wunsch-Station als Namens-Marke. Gewählt ist sie gelb — dieselbe Farbe,
mit der die Helferliste ihre Auswahl markiert. */
function StationMark({ station, onToggle }: { station: WishStation; onToggle: () => void }) {
	return (
		<NameChip
			data-wish-station={station.id}
			onSelect={onToggle}
			selected={station.selected}
			className={cn(station.selected ? 'bg-gelb text-tinte' : 'hover:bg-papier-getoent')}>
			{station.name}
		</NameChip>
	);
}

/** Eine Wunsch-Schicht als Wertmarke: Tag und Name als Aufschrift, die Zeit als
Akzentschrift-Wert. Gewählt ist sie gelb wie die Station darüber. */
function ShiftMark({ shift, onToggle }: { shift: WishShift; onToggle: () => void }) {
	return (
		<button
			type="button"
			data-wish-shift={shift.id}
			aria-pressed={shift.selected}
			onClick={onToggle}
			className={FOCUS_RING}>
			<ValueTag
				tone="ink"
				value={shift.time}
				// Tippziel ≥ 40px am Handy (DESIGN-VISION §6).
				className={cn('items-center max-[899px]:min-h-10', shift.selected && 'bg-gelb')}>
				{shift.label}
			</ValueTag>
		</button>
	);
}

export default HelperZettel;
