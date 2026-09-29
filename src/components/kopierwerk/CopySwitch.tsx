import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { CHECKBOX, TIPPZIEL } from './marks';

export interface CopySwitchProps {
	id: string;
	label: string;
	/** Steht neben der Beschriftung und sagt, was der Schalter holt. */
	hint: string;
	checked: boolean;
	disabled?: boolean;
	onChange: (value: boolean) => void;
}

/**
 * Ein Übernahme-Schalter des Kopierwerks (Prototyp `.row` mit `.cbx`): ein
 * An/Aus über *alles* eines Bereichs, im Unterschied zu den Häkchen-Mengen der
 * Stationen und Positionen. Ausgegraut bleibt die Zeile lesbar — der Hinweis
 * daneben sagt dann, was fehlt, statt den Schalter kommentarlos totzustellen.
 *
 * Steht hier und nicht bei einem seiner Schritte, weil ihn inzwischen zwei
 * tragen: Helfer und Zuteilungen in Schritt 2, Preisliste und Sponsoren im
 * Sponsoring-Schritt (#146). Ein zweites Rezept wäre der Verstoß gegen
 * ADR 0003 §2.
 */
export function CopySwitch({ id, label, hint, checked, disabled, onChange }: CopySwitchProps) {
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
