import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import { formatEuro } from '@/lib/money';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Poster } from '@/components/toolkit/Poster';
import type { MaterialAxis, MaterialGroup } from '@/lib/materialGrouping';

export interface MaterialGroupDrawerProps {
	groups: MaterialGroup[];
	axis: MaterialAxis;
	activeGroupId: string | null;
	onSelect: (groupId: string) => void;
}

/**
 * Die Gruppen-Auswahl am Handy (#116): ein **gelber Balken** mit der aktiven
 * Gruppe, Antippen öffnet eine Schublade mit *allen* Gruppen als vollwertigen
 * Kästen.
 *
 * Statt des Reiter-Streifens vom Desktop: die Reiter vollständig aufzulisten
 * kostet auf der Lieferanten-Achse gemessene 467 px — die Tabelle läge komplett
 * unter der Falz. Statt eines Dropdowns, weil man dort 13 Options durchscrollen
 * müsste, um zu sehen, wo Preise fehlen (Vision §1 „Lücken sehen und
 * schließen"). Dasselbe Idiom wie die Helferliste-Schublade aus #68 — zwei
 * Bereiche, eine Geste.
 */
const MaterialGroupDrawer: React.FC<MaterialGroupDrawerProps> = ({
	groups,
	axis,
	activeGroupId,
	onSelect
}) => {
	const [open, setOpen] = useState(false);

	// Auf der Achse ALLE gibt es genau einen Kasten; sein Kopf nennt ihn schon.
	if (axis === 'all') return null;
	const active = groups.find((g) => g.id === activeGroupId) ?? groups[0];
	if (!active) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-label={`Gruppe wählen — offen: ${active.name}`}
				className={cn(
					'flex w-full items-center gap-3 border-2 border-tinte bg-gelb px-3 py-2 text-left shadow-versatz',
					'min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte'
				)}>
				<span className="truncate font-display text-[15px] font-semibold uppercase tracking-[.02em]">
					{active.name}
				</span>
				<span className="whitespace-nowrap text-[11px] font-bold text-tinte-soft">
					{active.count} Pos · <span className="tabular-nums">{formatEuro(active.total)}</span>
				</span>
				{active.withoutPrice > 0 && (
					<span className="ml-auto whitespace-nowrap text-[11px] font-extrabold text-rot">
						{active.withoutPrice} ⚠
					</span>
				)}
				<span className={cn('font-bold', active.withoutPrice > 0 ? 'ml-1.5' : 'ml-auto')} aria-hidden>
					▾
				</span>
			</button>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerContent className="max-h-[80vh] bg-papier">
					<Poster className="flex items-center gap-3 border-0 border-b-2 px-4 py-2.5">
						<DrawerTitle className="font-display text-[15px] font-semibold uppercase tracking-[.04em]">
							Gruppe wählen
						</DrawerTitle>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="ml-auto min-h-10 bg-gelb px-3 py-1.5 text-[12.5px] font-bold uppercase tracking-[.02em] text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papier">
							Fertig
						</button>
					</Poster>
					<div className="overflow-y-auto px-3 py-3">
						<MaterialGroupSheetList
							groups={groups}
							activeGroupId={active.id}
							onSelect={(id) => {
								onSelect(id);
								setOpen(false);
							}}
						/>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
};

export interface MaterialGroupSheetListProps {
	groups: MaterialGroup[];
	activeGroupId: string | null;
	onSelect: (groupId: string) => void;
}

/**
 * Der Inhalt der Schublade: je Gruppe ein Kasten mit Positionen, Zwischensumme
 * und den Preislücken — genau der Vergleich, den ein Dropdown verlieren würde.
 *
 * Eigener Baustein, damit die Regel ohne die Schublade prüfbar ist: der
 * Schubladen-Inhalt wird erst im Browser und erst beim Öffnen gerendert.
 */
export const MaterialGroupSheetList: React.FC<MaterialGroupSheetListProps> = ({
	groups,
	activeGroupId,
	onSelect
}) => (
	<div className="grid gap-2">
		{groups.map((group) => {
			const active = group.id === activeGroupId;
			return (
				<button
					key={group.id}
					type="button"
					aria-pressed={active}
					onClick={() => onSelect(group.id)}
					className={cn(
						'flex min-h-14 items-center gap-3 border-2 border-tinte px-3 py-2 text-left',
						'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
						active ? 'bg-gelb shadow-versatz' : 'bg-white'
					)}>
					<span className="min-w-0 flex-1">
						<span className="block truncate font-display text-sm font-semibold uppercase tracking-[.03em]">
							{group.name}
						</span>
						<span className="block text-[11px] text-tinte-soft">{group.count} Positionen</span>
					</span>
					<span className="shrink-0 text-right">
						<span className="block text-[12.5px] font-extrabold tabular-nums">
							{formatEuro(group.total)}
						</span>
						{group.withoutPrice > 0 ? (
							<span className="block text-[10.5px] font-extrabold text-rot">
								{group.withoutPrice} ohne Preis
							</span>
						) : (
							<span className="block text-[10.5px] text-tinte-soft">✓ vollständig</span>
						)}
					</span>
				</button>
			);
		})}
	</div>
);

export default MaterialGroupDrawer;
