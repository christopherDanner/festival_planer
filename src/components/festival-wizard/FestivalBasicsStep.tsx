import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { festYear, formatFestDateRange } from '@/lib/festDates';
import type { Festival } from '@/lib/festivalService';
import { isDraftReady, stepSubmitLabel, type FestivalDraft } from './kopierwerk';

/** Wert des „Keine Vorlage"-Eintrags — Radix erlaubt keinen leeren Item-Wert. */
const NO_TEMPLATE = 'none';

export interface FestivalBasicsStepProps {
	draft: FestivalDraft;
	/** Bestehende Feste, die als Vorlage dienen können. */
	templates: Festival[];
	/** Die Vorlage wird gerade geladen — vor ihrem Umfang geht es nicht weiter. */
	loadingTemplate: boolean;
	/** Das Fest wird gerade angelegt. */
	saving: boolean;
	onChange: (patch: Partial<FestivalDraft>) => void;
	onSubmit: () => void;
}

/**
 * Werkbank von Schritt 1 (#93): Name, Zeitraum und **Ort** des neuen Fests,
 * darunter das Vorlage-Feld. Der Ort steht hier, weil ihn Plakat und Dashboard
 * zeigen, ein neu angelegtes Fest ihn bisher aber nie hatte (`location: ''`).
 */
export default function FestivalBasicsStep({
	draft,
	templates,
	loadingTemplate,
	saving,
	onChange,
	onSubmit
}: FestivalBasicsStepProps) {
	const hasTemplate = draft.templateId !== '';
	const blocked = !isDraftReady(draft) || saving || loadingTemplate;

	return (
		<div className="border-2.5 border-tinte bg-white">
			<div className="flex flex-wrap items-baseline gap-3 border-b-2.5 border-tinte px-4 py-3">
				<h3 className="font-display text-[19px] font-semibold uppercase tracking-[.02em]">
					Name &amp; Datum
				</h3>
				<span className="text-xs text-tinte-soft">
					Name und Startdatum genügen — Ort und Zeitraum lassen sich später am Fest ändern.
				</span>
			</div>

			<div className="space-y-4 px-4 py-4">
				<div className="space-y-1.5">
					<Label htmlFor="festival-name">Festname *</Label>
					<Input
						id="festival-name"
						value={draft.name}
						placeholder="z. B. Musikfest Steinbach 2027"
						onChange={(e) => onChange({ name: e.target.value })}
					/>
				</div>

				<div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
					<div className="space-y-1.5">
						<Label htmlFor="festival-start">Startdatum *</Label>
						<Input
							id="festival-start"
							type="date"
							value={draft.startDate}
							onChange={(e) => onChange({ startDate: e.target.value })}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="festival-end">Enddatum (optional)</Label>
						<Input
							id="festival-end"
							type="date"
							value={draft.endDate}
							onChange={(e) => onChange({ endDate: e.target.value })}
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="festival-location">Ort</Label>
					<Input
						id="festival-location"
						value={draft.location}
						placeholder="z. B. Festwiese Steinbach"
						onChange={(e) => onChange({ location: e.target.value })}
					/>
				</div>

				<div className="space-y-1.5 border-t border-linie pt-4">
					<Label htmlFor="festival-template">Vorlage</Label>
					<Select
						value={draft.templateId || undefined}
						onValueChange={(value) =>
							onChange({ templateId: value === NO_TEMPLATE ? '' : value })
						}>
						<SelectTrigger id="festival-template" aria-label="Vorlage">
							<SelectValue placeholder="Keine Vorlage" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_TEMPLATE}>Keine Vorlage</SelectItem>
							{templates.map((template) => (
								<SelectItem key={template.id} value={template.id}>
									{templateLabel(template)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-[11.5px] text-tinte-soft">
						Mit Vorlage kommen Stationen, Schichten und Material in den nächsten Schritten dazu.
					</p>
				</div>
			</div>

			<div className="flex justify-end border-t-2.5 border-tinte px-4 py-3">
				<Button onClick={onSubmit} disabled={blocked} className="h-10 px-4 text-[12.5px]">
					{loadingTemplate
						? 'LADE VORLAGE …'
						: saving
							? 'LEGE FEST AN …'
							: stepSubmitLabel(hasTemplate)}
				</Button>
			</div>
		</div>
	);
}

/** „Musikfest Steinbach 2026 · Fr 24. Juli 2026" — Name plus Zeitraum zur Unterscheidung. */
function templateLabel(template: Festival): string {
	const range = formatFestDateRange(template.start_date, template.end_date);
	return `${template.name || 'Fest'} · ${range} ${festYear(template.start_date)}`;
}
