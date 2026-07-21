import { cn } from '@/lib/utils';
import { statusColor, type AmpelStatus } from '@/components/toolkit/status';

const fillClass: Record<AmpelStatus, string> = {
	empty: 'bg-rot',
	partial: 'bg-gelb',
	complete: 'bg-gruen',
};

const surfaceClass: Record<AmpelStatus, string> = {
	empty: 'bg-status-empty border-status-empty-border',
	partial: 'bg-status-partial border-status-partial-border',
	complete: 'bg-status-complete border-status-complete-border',
};

export interface StatusBarProps {
	/** Ist-Wert (z. B. zugewiesene Helfer) */
	assigned: number;
	/** Soll-Wert (z. B. benötigte Plätze) */
	required: number;
	/**
	 * Darstellung der Ampel (Vision §4): 'edge' = 4px-Linkskante (Elternelement
	 * braucht position: relative), 'bar' = Balkenfüllung, 'badge' = Badge.
	 */
	variant?: 'edge' | 'bar' | 'badge';
	className?: string;
}

/** Ampel-Anzeige: leer = Rot, teilbesetzt = Gelb, voll = Grün. */
export function StatusBar({ assigned, required, variant = 'bar', className }: StatusBarProps) {
	const status = statusColor(assigned, required);

	if (variant === 'edge') {
		return <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', fillClass[status], className)} />;
	}

	if (variant === 'badge') {
		const open = Math.max(0, required - assigned);
		return (
			<span className={cn('inline-flex items-baseline gap-1.5 border-1.5 px-2 py-0.5 text-tinte', surfaceClass[status], className)}>
				<span className="font-display text-[13px] font-semibold">
					{assigned}/{required}
				</span>
				<span className="text-[10.5px] font-extrabold tracking-[.05em]">{open === 0 ? 'VOLL' : `${open} OFFEN`}</span>
			</span>
		);
	}

	const pct = required > 0 ? Math.min(100, Math.max(0, (assigned / required) * 100)) : 100;
	return (
		<div
			role="meter"
			aria-valuemin={0}
			aria-valuemax={required}
			aria-valuenow={assigned}
			className={cn('status-bar w-full', className)}
		>
			<span className={cn('absolute inset-y-0 left-0', fillClass[status])} style={{ width: `${pct}%` }} />
		</div>
	);
}
