import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { allStationsState, type StationPreviewRow } from './stationChoice';

/** Maß der Werkzeug-Checkbox (Prototyp `.cbx`); grün gefüllt über die Variante. */
const CHECKBOX = 'h-[18px] w-[18px]';

/** Beschriftung als Tippziel: am Handy ≥ 40px hoch (DESIGN-VISION §6). */
const TIPPZIEL = 'flex items-center max-[899px]:min-h-10';

export interface StationsShiftsStepProps {
	rows: StationPreviewRow[];
	selectedStationIds: string[];
	/** Aufgeklappte Stationen — reine Vorschau, keine Auswahl. */
	expandedStationIds: string[];
	copyAssignments: boolean;
	onToggleStation: (stationId: string) => void;
	onToggleAllStations: () => void;
	onToggleExpanded: (stationId: string) => void;
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
	copyAssignments,
	onToggleStation,
	onToggleAllStations,
	onToggleExpanded,
	onCopyAssignmentsChange,
	onBack,
	onNext
}: StationsShiftsStepProps) {
	const allState = allStationsState(
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
					Die Vorlage hat keine Stationen — es gibt hier nichts zu wählen.
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
							const open = expandedStationIds.includes(row.id);
							const panelId = `schichten-${row.id}`;
							return (
								<li key={row.id} className="border-b border-linie last:border-b-0">
									<div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 text-[13.5px]">
										<Checkbox
											id={`station-${row.id}`}
											variant="gruen"
											checked={selectedStationIds.includes(row.id)}
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

					<div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-linie px-4 py-3">
						<div className="flex items-center gap-2.5">
							<Checkbox
								id="zuweisungen-uebernehmen"
								variant="gruen"
								checked={copyAssignments}
								onCheckedChange={(value) => onCopyAssignmentsChange(value === true)}
								className={cn(CHECKBOX, FOCUS_INK)}
							/>
							<Label
								htmlFor="zuweisungen-uebernehmen"
								className={cn(TIPPZIEL, 'text-[12.5px] font-bold')}>
								Zuweisungen übernehmen (Helfer + Verantwortliche)
							</Label>
						</div>
						{/* Nur das Versprechen, das der Kopier-Service hält: Präferenzen
						kopiert er nicht (#94). */}
						<span className="text-[11.5px] text-tinte-soft">Helfer bleiben sonst leer.</span>
					</div>
				</>
			)}

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
