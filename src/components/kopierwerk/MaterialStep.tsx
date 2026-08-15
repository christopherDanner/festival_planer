import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { OpenSlot } from '@/components/toolkit/OpenSlot';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import { Stamp } from '@/components/toolkit/Stamp';
import { cn } from '@/lib/utils';

import {
	QUANTITY_SOURCES,
	chipState,
	materialChipSections,
	sourceQuantity,
	stationLoss,
	toggleAll,
	toggleChip,
	toggleMaterial,
	type ChipState,
	type CopyableMaterial,
	type MaterialChip,
	type QuantitySource
} from './materialChoice';

export interface MaterialStepProps {
	/** Die Positionen der Vorlage. */
	materials: CopyableMaterial[];
	/** Was Schritt 2 an Stationen mitnimmt — daraus die Warnung „ohne Station". */
	selectedStationIds: ReadonlySet<string>;
	selectedMaterialIds: ReadonlySet<string>;
	quantitySource: QuantitySource;
	/** Das Fest wird gerade angelegt. */
	saving: boolean;
	onQuantitySourceChange: (source: QuantitySource) => void;
	onSelectionChange: (ids: Set<string>) => void;
	onBack: () => void;
	onSubmit: () => void;
}

/**
 * Werkbank von Schritt 3 (#95): Mengenquelle als Segment-Schalter, Gruppen-Chips
 * mit Zwischenzustand und die Positionen einzeln wählbar.
 *
 * Dazu die Kante aus dem Entscheid #64: Material zeigt auf Stationen, und wer
 * eine Station in Schritt 2 abwählt, dessen Positionen landen ohne Station im
 * neuen Fest. Das bleibt so — es wird nur sichtbar gewarnt, abgewählt wird
 * nichts.
 */
export default function MaterialStep({
	materials,
	selectedStationIds,
	selectedMaterialIds,
	quantitySource,
	saving,
	onQuantitySourceChange,
	onSelectionChange,
	onBack,
	onSubmit
}: MaterialStepProps) {
	const loss = stationLoss(materials, selectedStationIds, selectedMaterialIds);
	const sections = materialChipSections(materials);
	const allSelected =
		materials.length > 0 && materials.every((material) => selectedMaterialIds.has(material.id));

	return (
		<div className="border-2.5 border-tinte bg-white">
			<div className="flex flex-wrap items-baseline gap-3 border-b-2.5 border-tinte px-4 py-3">
				<h3 className="text-sm font-bold uppercase tracking-[.08em]">Material</h3>
				<span className="text-xs text-tinte-soft">
					Die gewählten Positionen kommen mit der Menge der gewählten Quelle ins neue Fest —
					Preise und Zuordnungen wandern unverändert mit.
				</span>
			</div>

			{materials.length === 0 ? (
				<EmptyMaterials />
			) : (
				<>
					<div className="flex flex-wrap items-center gap-3 border-b border-linie px-4 py-3">
						<span className="text-[11px] font-extrabold uppercase tracking-[.07em] text-tinte-soft">
							Mengenquelle
						</span>
						<SegmentedControl
							options={QUANTITY_SOURCES}
							value={quantitySource}
							onValueChange={onQuantitySourceChange}
							aria-label="Mengenquelle"
							className="w-auto"
						/>
					</div>

					{sections.map((section) => (
						<div
							key={section.axis}
							className="flex flex-wrap items-center gap-1.5 border-b border-linie px-4 py-2.5">
							<span className="mr-1 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
								{section.label}
							</span>
							{section.chips.map((chip) => (
								<GroupChip
									key={chip.id}
									chip={chip}
									state={chipState(chip, selectedMaterialIds)}
									onToggle={() => onSelectionChange(toggleChip(selectedMaterialIds, chip))}
								/>
							))}
						</div>
					))}

					<div className="flex flex-wrap items-center gap-3 border-b border-linie px-4 py-2.5">
						<label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-bold">
							<Checkbox
								checked={
									allSelected ? true : selectedMaterialIds.size === 0 ? false : 'indeterminate'
								}
								onCheckedChange={() => onSelectionChange(toggleAll(materials, selectedMaterialIds))}
								className={TOOL_CHECKBOX}
							/>
							Alle / Keine
						</label>
						<span className="ml-auto text-[11.5px] text-tinte-soft">
							{selectedMaterialIds.size}/{materials.length} gewählt
						</span>
					</div>

					{loss.notice && (
						// Die Warnung steht über der Liste, nicht als Fußnote darunter: sie
						// betrifft, was gerade gewählt ist.
						<p className="border-b border-linie bg-papier px-4 py-2.5 text-[12px] font-semibold text-rot">
							{loss.notice}
						</p>
					)}

					<ul className="max-h-[420px] overflow-y-auto">
						{materials.map((material) => (
							<li key={material.id} data-position={material.id}>
								<label className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 border-b border-linie px-4 py-2.5 hover:bg-papier">
									<Checkbox
										checked={selectedMaterialIds.has(material.id)}
										onCheckedChange={() =>
											onSelectionChange(toggleMaterial(selectedMaterialIds, material.id))
										}
										className={TOOL_CHECKBOX}
									/>
									<span className="min-w-0 flex-1 text-[13.5px] font-bold">{material.name}</span>
									{loss.ids.has(material.id) && (
										// Rezept „Freier Platz" — dieselbe gestrichelte rote Outline, nur
										// als Notiz statt als Knopf: hier ist nichts zu besetzen.
										<OpenSlot as="span">ohne Station</OpenSlot>
									)}
									<span className="text-[11.5px] text-tinte-soft">{material.category || '–'}</span>
									<span className="whitespace-nowrap text-[11.5px] tabular-nums text-tinte-soft">
										{sourceQuantity(material, quantitySource)} {material.unit}
									</span>
								</label>
							</li>
						))}
					</ul>
				</>
			)}

			<div className="flex flex-wrap justify-between gap-3 border-t-2.5 border-tinte px-4 py-3">
				<Button variant="outline" onClick={onBack} className="h-10 px-4 text-[12.5px]">
					← Stationen &amp; Schichten
				</Button>
				<Button onClick={onSubmit} disabled={saving} className="h-10 px-4 text-[12.5px]">
					{saving ? 'LEGE FEST AN …' : 'FEST ANLEGEN'}
				</Button>
			</div>
		</div>
	);
}

/**
 * Werkzeug-Checkbox: den 2px-Tinte-Rahmen bringt `ui/checkbox` schon mit,
 * gefüllt wird sie grün wie im Master-Prototyp (`.cbx.on`). Die Standardfüllung
 * wäre Gelb — das ist im Kopierwerk die Farbe des aktiven Schritts.
 */
const TOOL_CHECKBOX =
	'h-[18px] w-[18px] data-[state=checked]:border-gruen data-[state=checked]:bg-gruen data-[state=checked]:text-white data-[state=indeterminate]:border-gruen data-[state=indeterminate]:bg-gruen data-[state=indeterminate]:text-white';

/** Gruppen-Chip im Wertmarken-Rezept: ganz gewählt füllt er sich grün, teilweise
steht die Marke grün auf Weiß, gar nicht gewählt bleibt sie grau auf Papier. */
function GroupChip({
	chip,
	state,
	onToggle
}: {
	chip: MaterialChip;
	state: ChipState;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			data-chip={chip.id}
			data-chip-state={state}
			aria-pressed={state !== 'none'}
			onClick={onToggle}
			className={cn(
				'whitespace-nowrap border-1.5 px-[9px] py-[3px] text-[11.5px] font-bold',
				// Tippziel ≥ 40px am Handy (DESIGN-VISION §6).
				'max-[899px]:min-h-10 max-[899px]:px-3.5',
				'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
				chipTone(state)
			)}>
			{chip.label}
		</button>
	);
}

function chipTone(state: ChipState): string {
	if (state === 'all') return 'border-gruen bg-gruen text-white';
	if (state === 'some') return 'border-gruen bg-white text-gruen';
	return 'border-tinte-soft bg-papier text-tinte-soft';
}

/** Leerzustand: gestrichelter Rahmen, roter Stempelton, ein Satz — der Schritt
bleibt überspringbar, das Fest entsteht auch ohne Material. */
function EmptyMaterials() {
	return (
		<div className="px-4 py-8">
			<div className="flex flex-col items-center border-2.5 border-dashed border-tinte-soft px-5 py-7 text-center">
				<Stamp tone="red" size="lg" tilt="right">
					KEIN MATERIAL
				</Stamp>
				<p className="mx-auto mt-4 max-w-[46ch] text-[12.5px] leading-snug text-tinte-soft">
					Die Vorlage führt keine Material-Positionen — hier gibt es nichts zu wählen. Die
					Materialliste des neuen Fests legst du danach im Fest an.
				</p>
			</div>
		</div>
	);
}
