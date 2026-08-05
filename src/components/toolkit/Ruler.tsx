import { cn } from '@/lib/utils';

export interface RulerProps {
	/** Ist-Wert (z. B. besetzte Schichten) */
	value: number;
	/** Soll-Wert; Fehlt ergibt sich als max − value */
	max: number;
	/** 'small': 10–12px-Karten-Variante ohne Ist-Marke (Vision §4) */
	size?: 'default' | 'small';
	/**
	 * Position der Marke, wenn sie nicht am Ist-Wert steht — etwa der
	 * Vorjahres-Stand, an dem sich das laufende Fest misst.
	 */
	mark?: number;
	/** Beschriftung über der Marke, z. B. „Vorjahr". */
	markLabel?: string;
	/** Ersetzt den abgeleiteten Vorlesetext, wo „X von Y" nichts sagt (Geldsummen). */
	valueText?: string;
	className?: string;
}

/** Maßband-Fortschrittsanzeige (DESIGN-VISION.md §4 „Maßband-Ruler"). */
export function Ruler({
	value,
	max,
	size = 'default',
	mark,
	markLabel,
	valueText,
	className
}: RulerProps) {
	const percent = (of: number) => (max > 0 ? Math.min(100, Math.max(0, (of / max) * 100)) : 100);
	const pct = percent(value);
	const markPct = mark == null ? pct : percent(mark);
	const missing = Math.max(0, max - value);

	return (
		<div
			role="meter"
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={value}
			aria-valuetext={
				valueText ?? `${value} von ${max}${missing > 0 ? `, ${missing} fehlen` : ''}`
			}
			className={cn(size === 'small' ? 'ruler ruler--small' : 'ruler', 'w-full', className)}
		>
			<span className="ruler__fill" style={{ width: `${pct}%` }} />
			{size === 'default' && (
				<>
					<span className="ruler__mark" style={{ left: `${markPct}%` }} />
					{markLabel && (
						<span
							className="absolute -top-3.5 -translate-x-1/2 whitespace-nowrap text-[9.5px] font-extrabold uppercase tracking-[.04em] text-tinte"
							style={{ left: `${markPct}%` }}
						>
							{markLabel}
						</span>
					)}
				</>
			)}
		</div>
	);
}
