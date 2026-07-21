import * as React from 'react';

export interface SegmentedOption<T extends string = string> {
	value: T;
	label: React.ReactNode;
}

interface SegmentedBaseProps {
	options: readonly SegmentedOption[];
	value: string;
	onValueChange: (value: string) => void;
	/** Pflicht: Gruppenname für Screenreader, z. B. „Mengenquelle" */
	'aria-label': string;
	className?: string;
	buttonClassName: (active: boolean) => string;
}

/** Gemeinsames Radiogroup-Verhalten von SegmentedControl und ModeToggle:
Pfeiltasten wählen (roving tabindex), Tab verlässt die Gruppe. Nicht für
Seiten-Code gedacht — Seiten nutzen die beiden Schalter-Komponenten. */
export function SegmentedBase({ options, value, onValueChange, className, buttonClassName, 'aria-label': ariaLabel }: SegmentedBaseProps) {
	const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
	const selectedIndex = Math.max(
		0,
		options.findIndex((o) => o.value === value),
	);

	const select = (index: number) => {
		const next = (index + options.length) % options.length;
		onValueChange(options[next].value);
		refs.current[next]?.focus();
	};

	const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				select(index + 1);
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				select(index - 1);
				break;
			case 'Home':
				select(0);
				break;
			case 'End':
				select(options.length - 1);
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	return (
		<div role="radiogroup" aria-label={ariaLabel} className={className}>
			{options.map((option, i) => (
				<button
					key={option.value}
					ref={(el) => {
						refs.current[i] = el;
					}}
					type="button"
					role="radio"
					aria-checked={option.value === value}
					tabIndex={i === selectedIndex ? 0 : -1}
					onClick={() => onValueChange(option.value)}
					onKeyDown={(event) => handleKeyDown(event, i)}
					className={buttonClassName(option.value === value)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
