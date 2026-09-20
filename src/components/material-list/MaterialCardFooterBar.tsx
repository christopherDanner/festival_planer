import React from 'react';

import { cn } from '@/lib/utils';

export interface MaterialCardFooterBarProps {
	open: number;
	dirty: number;
	onSaveAll: () => void;
	onDiscardAll: () => void;
}

/**
 * Sammel-Fußleiste des Zeilenmodus (#116, Regel aus #115): klebt gelb über der
 * Fest-Tab-Leiste und schließt *alle* offenen Karten in einem Griff. Sie deckt
 * den Rechnungs-Fall — eine Lieferantenrechnung, viele Positionen, ein
 * Durchgang.
 *
 * Bei höchstens einer offenen Karte bleibt sie weg: dort stehen ✓ und ✕ schon
 * in der Kopfzeile, und eine zweite Stelle für dieselbe Handlung wäre nur eine
 * verdeckte Bildschirmzeile.
 */
const MaterialCardFooterBar: React.FC<MaterialCardFooterBarProps> = ({
	open,
	dirty,
	onSaveAll,
	onDiscardAll
}) => {
	if (open < 2) return null;

	return (
		<div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center gap-2 border-y-2 border-tinte bg-gelb px-3 py-2">
			<span className="text-[12px] font-bold">
				<b className="font-display text-[15px] font-semibold tabular-nums">{open}</b> Karten offen,
				davon <span className="tabular-nums">{dirty}</span> geändert
			</span>
			<div className="ml-auto flex gap-2">
				<FooterButton onClick={onDiscardAll}>Alle verwerfen</FooterButton>
				<FooterButton onClick={onSaveAll} primary>
					Alle {open} speichern
				</FooterButton>
			</div>
		</div>
	);
};

const FooterButton: React.FC<{
	onClick: () => void;
	primary?: boolean;
	children: React.ReactNode;
}> = ({ onClick, primary, children }) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			'min-h-10 border-2 border-tinte px-3 py-1.5 text-[12px] font-bold uppercase tracking-[.02em]',
			'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
			primary ? 'bg-tinte text-white' : 'bg-white text-tinte'
		)}>
		{children}
	</button>
);

export default MaterialCardFooterBar;
