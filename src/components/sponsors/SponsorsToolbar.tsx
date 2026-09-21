import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import type { SponsorSegment, SponsorSegmentCounts } from '@/lib/sponsorHistory';
import MastPanel from './MastPanel';

export interface SponsorsToolbarProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	/** Treffer beider Filter zusammen (Suche und Segment). */
	shown: number;
	/** Größe des gesamten Sponsorenbestands. */
	total: number;
	segment: SponsorSegment;
	onSegmentChange: (segment: SponsorSegment) => void;
	/** Firmen je Segment, gezählt über die Treffer der Suche. */
	segmentCounts: SponsorSegmentCounts;
	/** Jahr des Bezugsfests; null zwischen zwei Festen — dann entfällt der Schalter. */
	referenceYear: number | null;
}

/** Was der Trefferzähler bei aktivem Segment nennt; bei ALLE gibt es nichts zu
beschriften (ADR 0006: gefiltert rechnen **und** beschriften). */
function segmentCaption(segment: SponsorSegment, referenceYear: number): string | null {
	switch (segment) {
		case 'alle':
			return null;
		case 'sponsert':
			return `sponsern ${referenceYear}`;
		case 'nicht-gefragt':
			return 'heuer noch nicht gefragt';
	}
}

/** Segment samt Zähler; der Zähler steht kleiner daneben, nicht in Klammern. */
function SegmentLabel({ text, count }: { text: string; count: number }) {
	return (
		<span className="inline-flex items-center justify-center gap-1.5">
			<span className="tracking-[.04em]">{text}</span>
			<span className="text-[11px] font-bold tabular-nums opacity-70">{count}</span>
		</span>
	);
}

/**
 * Klebende Werkzeugleiste unter dem Mast (#101 Entscheid 5): Suche über den
 * Firmennamen, der Segment-Schalter der Sponsoren-Historie und der
 * Trefferzähler. Klebt am Handy wie am Desktop, weil der Scrollweg bei 40
 * Firmen lang ist.
 *
 * Suche und Segment filtern **zusammen**, nicht ersetzend — die Zähler am
 * Schalter sagen deshalb voraus, was ein Klick zeigen wird.
 *
 * Ab 900px steht die Höhe auf `--sponsors-toolbar-h` (gesetzt von
 * `SponsorsView`), weil der Tabellenkopf genau darunter klebt.
 */
export default function SponsorsToolbar({
	searchTerm,
	onSearchChange,
	shown,
	total,
	segment,
	onSegmentChange,
	segmentCounts,
	referenceYear
}: SponsorsToolbarProps) {
	// Ohne bevorstehendes Fest gibt es kein „heuer" — dann entfällt der
	// Schalter ganz, statt zwei leere Segmente und „sponsern undefined" zu
	// zeigen. Das ist der Normalzustand zwischen zwei Festen (#158).
	const caption = referenceYear === null ? null : segmentCaption(segment, referenceYear);

	return (
		<MastPanel className="sticky top-0 z-20 flex flex-wrap items-center gap-3 px-4 py-2.5 min-[900px]:h-[var(--sponsors-toolbar-h)] min-[900px]:flex-nowrap">
			<div className="relative min-w-0 flex-1 min-[900px]:flex-none min-[900px]:basis-[260px]">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinte-soft" />
				<Input
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Firma suchen …"
					aria-label="Firma suchen"
					className="h-10 pl-9 text-[13px] min-[900px]:h-9"
				/>
			</div>
			{referenceYear !== null && (
				<SegmentedControl<SponsorSegment>
					value={segment}
					onValueChange={onSegmentChange}
					aria-label="Sponsoren-Historie"
					className="w-full min-[900px]:w-auto"
					options={[
						{ value: 'alle', label: <SegmentLabel text="ALLE" count={segmentCounts.alle} /> },
						{
							value: 'sponsert',
							label: <SegmentLabel text={`SPONSERT ${referenceYear}`} count={segmentCounts.sponsert} />
						},
						{
							value: 'nicht-gefragt',
							label: (
								<SegmentLabel
									text="HEUER NOCH NICHT GEFRAGT"
									count={segmentCounts['nicht-gefragt']}
								/>
							)
						}
					]}
				/>
			)}
			<span className="text-xs font-bold uppercase tracking-[.06em] text-tinte-soft min-[900px]:ml-auto">
				{shown} von {total}
				{caption && <span className="normal-case"> · {caption}</span>}
			</span>
		</MastPanel>
	);
}
