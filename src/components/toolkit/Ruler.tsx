import { cn } from '@/lib/utils';

export interface RulerProps {
	/** Ist-Wert (z. B. besetzte Schichten) */
	value: number;
	/** Soll-Wert; Fehlt ergibt sich als max − value */
	max: number;
	/** 'small': 10–12px-Karten-Variante ohne Ist-Marke (Vision §4) */
	size?: 'default' | 'small';
	className?: string;
}

/** Maßband-Fortschrittsanzeige (DESIGN-VISION.md §4 „Maßband-Ruler"). */
export function Ruler({ value, max, size = 'default', className }: RulerProps) {
	const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 100;
	const missing = Math.max(0, max - value);

	return (
		<div
			role="meter"
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={value}
			aria-valuetext={`${value} von ${max}${missing > 0 ? `, ${missing} fehlen` : ''}`}
			className={cn(size === 'small' ? 'ruler ruler--small' : 'ruler', 'w-full', className)}
		>
			<span className="ruler__fill" style={{ width: `${pct}%` }} />
			{size === 'default' && <span className="ruler__mark" style={{ left: `${pct}%` }} />}
		</div>
	);
}
