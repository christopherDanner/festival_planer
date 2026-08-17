import React from 'react';

import type { HandoverSummary } from '@/lib/materialHandover';

export interface HandoverSummaryBarProps {
	/** Zahlen des **ganzen** Laufs (`handoverSummary`), nicht des Reiters. */
	summary: HandoverSummary;
}

/**
 * Fußleiste der Übernahme (#118): was der Lauf bis jetzt bewirkt hat. Sie zählt
 * über alle Stationen — der Reiter zeigt eine, gespeichert wird aber ins ganze
 * Fest.
 */
const HandoverSummaryBar: React.FC<HandoverSummaryBarProps> = ({ summary }) => (
	<div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-2.5 border-tinte bg-papier-getoent px-4 py-2.5 text-[12.5px] text-tinte">
		<span>
			<b className="font-display font-semibold tabular-nums text-gruen">{summary.saved}</b>{' '}
			{summary.saved === 1 ? 'Position' : 'Positionen'} übernommen
		</span>
		<span>
			<b className="font-display font-semibold tabular-nums text-gruen">{summary.created}</b>{' '}
			{summary.created === 1 ? 'wird' : 'werden'} neu angelegt
		</span>
		<span className="text-tinte-soft">
			<b className="tabular-nums">{summary.skipped}</b> ausgelassen
		</span>
		{summary.pending > 0 && (
			<span className="text-tinte-soft">
				<b className="tabular-nums">{summary.pending}</b> noch offen
			</span>
		)}
		{summary.failed > 0 && (
			<span className="font-bold text-rot">{summary.failed} nicht gespeichert</span>
		)}
	</div>
);

export default HandoverSummaryBar;
