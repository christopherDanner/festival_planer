import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { checkboxState } from './selection';
import { type StationPreviewRow } from './stationChoice';

/** Maß der Werkzeug-Checkbox (Prototyp `.cbx`); grün gefüllt über die Variante. */
const CHECKBOX = 'h-[18px] w-[18px]';

/** Beschriftung als Tippziel: am Handy ≥ 40px hoch (DESIGN-VISION §6). */
const TIPPZIEL = 'flex items-center max-[899px]:min-h-10';

interface CopySwitchProps {
	id: string;
	label: string;
	/** Steht neben der Beschriftung und sagt, was der Schalter holt. */
	hint: string;
	checked: boolean;
	disabled?: boolean;
	onChange: (value: boolean) => void;
}

/**
 * Ein Übernahme-Schalter unter der Stationsliste (Prototyp `.row` mit `.cbx`).
 * Ausgegraut bleibt die Zeile lesbar — der Hinweis daneben sagt dann, was
 * fehlt, statt den Schalter kommentarlos totzustellen.
 */
function CopySwitch({ id, label, hint, checked, disabled, onChange }: CopySwitchProps) {
	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-1">
			{/* Gedimmt wird nur der Schalter selbst — der Hinweis daneben sagt
			gerade dann, was fehlt, und muss darum voll lesbar bleiben. */}
			<div className={cn('flex items-center gap-2.5', disabled && 'opacity-55')}>
				<Checkbox
					id={id}
					variant="gruen"
					checked={checked}
					disabled={disabled}
					onCheckedChange={(value) => onChange(value === true)}
					className={cn(CHECKBOX, FOCUS_INK)}
				/>
				<Label htmlFor={id} className={cn(TIPPZIEL, 'text-[12.5px] font-bold')}>
					{label}
				</Label>
			</div>
			<span className="text-[11.5px] text-tinte-soft">{hint}</span>
		</div>
	);
}

export interface StationsShiftsStepProps {
	rows: StationPreviewRow[];
	selectedStationIds: ReadonlySet<string>;
	/** Aufgeklappte Stationen — reine Vorschau, keine Auswahl. */
	expandedStationIds: ReadonlySet<string>;
	/** Die ganze Helferliste der Vorlage ins neue Fest (ADR 0005). */
	copyHelpers: boolean;
	copyAssignments: boolean;
	onToggleStation: (stationId: string) => void;
	onToggleAllStations: () => void;
	onToggleExpanded: (stationId: string) => void;
	onCopyHelpersChange: (value: boolean) => void;
	onCopyAssignmentsChange: (value: boolean) => void;
	onBack: () => void;
	onNext: () => void;
}

/**
 * Werkbank von Schritt 2 des Kopierwerks (#94, Master-Prototyp `kstrow`/
 * `kshifts`): je Station eine Zeile mit Checkbox und Falt-Knopf, aufgeklappt
 * die Schichten **read-only** mit altem und neuem Termin.
 *
 * Gewählt wird nur auf Stations-Ebene (Entscheid #64) — die Schichten bekommen
 * keine eigenen Checkboxen, damit `CopyFestivalOptions` unangetastet bleibt.
 * Sie stehen da, damit vor dem Anlegen sichtbar ist, auf welche Tage sie
 * rücken.
 */
export default function StationsShiftsStep({
	rows,
	selectedStationIds,
	expandedStationIds,
	copyHelpers,
	copyAssignments,
	onToggleStation,
	onToggleAllStations,
	onToggleExpanded,
	onCopyHelpersChange,
	onCopyAssignmentsChange,
	onBack,
	onNext
}: StationsShiftsStepProps) {
	const allState = checkboxState(
		rows.map((row) => row.id),
		selectedStationIds
	);

	return (
		<div className="border-2.5 border-tinte bg-white">
			<div className="flex flex-wrap items-baseline gap-3 border-b-2.5 border-tinte px-4 py-3">
				<h3 className="text-sm font-bold uppercase tracking-[.08em]">Stationen &amp; Schichten</h3>
				<span className="text-xs text-tinte-soft">
					Alles Gewählte wird ins neue Fest kopiert — Schichten rücken automatisch auf die neuen
					Tage.
				</span>
			</div>

			{rows.length === 0 ? (
				<p className="px-4 py-6 text-[12.5px] text-tinte-soft">
					Die Vorlage hat keine Stationen — zu übernehmen bleiben ihre Helfer.
				</p>
			) : (
				<>
					<div className="flex flex-wrap items-center gap-2.5 border-b border-linie px-4 py-2.5">
						<Checkbox
							id="alle-stationen"
							variant="gruen"
							checked={allState}
							onCheckedChange={onToggleAllStations}
							className={cn(CHECKBOX, FOCUS_INK)}
						/>
						<Label htmlFor="alle-stationen" className={cn(TIPPZIEL, 'text-[13px] font-bold')}>
							Alle Stationen
						</Label>
					</div>

					<ul>
						{rows.map((row) => {
							const open = expandedStationIds.has(row.id);
							const panelId = `schichten-${row.id}`;
							return (
								<li key={row.id} className="border-b border-linie last:border-b-0">
									<div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 text-[13.5px]">
										<Checkbox
											id={`station-${row.id}`}
											variant="gruen"
											checked={selectedStationIds.has(row.id)}
											onCheckedChange={() => onToggleStation(row.id)}
											className={cn(CHECKBOX, FOCUS_INK)}
										/>
										{/* Stationsnamen tragen die Akzentschrift (DESIGN-VISION §4). */}
										<Label
											htmlFor={`station-${row.id}`}
											className={cn(TIPPZIEL, 'font-display text-[15px] font-semibold')}>
											{row.name}
										</Label>
										<span className="text-[11.5px] text-tinte-soft">{row.meta}</span>
										<button
											type="button"
											aria-expanded={open}
											aria-controls={panelId}
											onClick={() => onToggleExpanded(row.id)}
											className={cn(
												'ml-auto px-1 text-[11px] font-extrabold uppercase tracking-[.04em] text-gruen',
												// Tippziel ≥ 40px am Handy (DESIGN-VISION §6).
												'max-[899px]:min-h-10 max-[899px]:px-2.5',
												FOCUS_INK
											)}>
											{open ? 'ZUKLAPPEN ▴' : 'AUFKLAPPEN ▾'}
										</button>
									</div>

									{open && (
										<ul id={panelId} className="grid gap-1 px-4 pb-2.5 min-[900px]:pl-[47px]">
											{row.shifts.length === 0 ? (
												<li className="text-[12px] text-tinte-soft">Keine Schichten</li>
											) : (
												row.shifts.map((shift) => (
													<li
														key={shift.id}
														className="flex flex-wrap items-baseline gap-2.5 text-[12px] text-tinte-soft">
														{/* Uhrzeiten tragen die Akzentschrift (DESIGN-VISION §4). */}
														<span className="w-[118px] font-display font-semibold tabular-nums text-tinte">
															{shift.when}
														</span>
														<span>{[shift.name, shift.places].filter(Boolean).join(' · ')}</span>
														<span className="font-extrabold text-gruen">
															<span aria-hidden>→</span> {shift.newWhen}
														</span>
													</li>
												))
											)}
										</ul>
									)}
								</li>
							);
						})}
					</ul>

				</>
			)}

			{/* Zwei Schalter, der zweite hängt am ersten (ADR 0005): ohne kopierte
			Helfer gibt es nichts, woran eine Zuteilung hängen könnte. Sie stehen
			außerhalb der Stationsliste, weil die Fest-Kopie der einzige Weg ist,
			letztjährige Helfer zu holen — eine Vorlage ohne Stationen darf daraus
			keine Sackgasse machen. */}
			<div className="grid gap-2 border-b border-linie px-4 py-3">
				<CopySwitch
					id="helfer-uebernehmen"
					label="Helfer übernehmen"
					// Nicht nur die zugeteilten: wer denselben Stamm, aber einen
					// frischen Plan will, tippt sonst jeden Namen neu (#100).
					hint="Die ganze Helferliste der Vorlage — Wünsche wandern auf die neuen Stationen und Schichten mit."
					checked={copyHelpers}
					onChange={onCopyHelpersChange}
				/>
				{/* Ohne Station gibt es keine Zuteilung, die man übernehmen könnte. */}
				{rows.length > 0 && (
					<CopySwitch
						id="zuteilungen-uebernehmen"
						label="Zuteilungen übernehmen"
						hint={
							copyHelpers
								? 'Stationen, Schichten und Verantwortliche.'
								: 'Braucht die übernommenen Helfer.'
						}
						checked={copyAssignments}
						disabled={!copyHelpers}
						onChange={onCopyAssignmentsChange}
					/>
				)}
			</div>

			<div className="flex flex-wrap justify-between gap-2.5 border-t-2.5 border-tinte px-4 py-3">
				<Button variant="ghost" onClick={onBack} className="h-10 px-4 text-[12.5px]">
					← Name &amp; Datum
				</Button>
				<Button onClick={onNext} className="h-10 px-4 text-[12.5px]">
					WEITER: MATERIAL →
				</Button>
			</div>
		</div>
	);
}
