import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Maß der Werkzeug-Checkbox (Prototyp `.cbx`); grün gefüllt über die Variante. */
export const COPY_CHECKBOX = 'h-[18px] w-[18px]';

/** Beschriftung als Tippziel: am Handy ≥ 40px hoch (DESIGN-VISION §6). */
export const TIPPZIEL = 'flex items-center max-[899px]:min-h-10';

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
 * Ein Übernahme-Schalter einer Kopier-Werkbank (Prototyp `.row` mit `.cbx`):
 * „Helfer übernehmen" und „Zuteilungen übernehmen" in Schritt 2, „Ablaufplan
 * übernehmen" in Schritt 4 (#127). Ein Rezept für alle — ein zweites wäre der
 * Verstoß gegen ADR 0003 §2.
 *
 * Ausgegraut bleibt die Zeile lesbar — der Hinweis daneben sagt dann, was fehlt,
 * statt den Schalter kommentarlos totzustellen.
 */
export default function CopySwitch({
	id,
	label,
	hint,
	checked,
	disabled,
	onChange
}: CopySwitchProps) {
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
					className={cn(COPY_CHECKBOX, FOCUS_INK)}
				/>
				<Label htmlFor={id} className={cn(TIPPZIEL, 'text-[12.5px] font-bold')}>
					{label}
				</Label>
			</div>
			<span className="text-[11.5px] text-tinte-soft">{hint}</span>
		</div>
	);
}
