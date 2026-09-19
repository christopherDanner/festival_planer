import React, { type ElementType } from 'react';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/toolkit/ModeToggle';
import { NameChip } from '@/components/toolkit/NameChip';
import { FOCUS_INK, PaperSheet, PaperSheetField, PaperSheetFields } from '@/components/toolkit/PaperSheet';
import type { Helper } from '@/lib/helperService';

/** Was geteilt wird: das ganze Fest oder der Zettel einer Person. */
export type ShareMode = 'full' | 'helper';

const MODES = [
	{ value: 'full', label: 'Ganzer Plan' },
	{ value: 'helper', label: 'Plan einer Person' }
] as const satisfies readonly { value: ShareMode; label: string }[];

export interface ShareZettelProps {
	mode: ShareMode;
	onModeChange: (mode: ShareMode) => void;
	/** Die Helfer des Fests, in der Reihenfolge, in der sie als Marken stehen. */
	helpers: Helper[];
	selectedHelperId: string | null;
	onSelectHelper: (helperId: string) => void;
	/** Der fertige Text; leer heißt „noch keine Person gewählt". */
	previewText: string;
	onCopy: () => void;
	onWhatsApp: () => void;
	onPdf: () => void;
	onExcel: () => void;
	onCancel: () => void;
	TitleTag?: ElementType;
}

/**
 * Der Zettel des Teilen-Dialogs (#109). Gefragt wird zweierlei: **wessen Plan**
 * — das ganze Fest oder eine Person — und, im zweiten Fall, **welche Person**.
 * Darunter steht, was tatsächlich rausgeht, und die vier Ausgaben.
 *
 * Die Personen stehen als **Marken**, nicht als Auswahlliste: ein zugeklapptes
 * Feld verschweigt, wie viele Helfer das Fest hat, und braucht zwei Gesten für
 * eine Wahl. Der Zettel ist gesteuert; Zustand und Wortlaut hält der Dialog.
 */
const ShareZettel: React.FC<ShareZettelProps> = ({
	mode,
	onModeChange,
	helpers,
	selectedHelperId,
	onSelectHelper,
	previewText,
	onCopy,
	onWhatsApp,
	onPdf,
	onExcel,
	onCancel,
	TitleTag
}) => (
	<PaperSheet
		title="Schichtplan teilen"
		TitleTag={TitleTag}
		onClose={onCancel}
		footer={
			<>
				<Button
					data-share="copy"
					variant="outline"
					className={FOCUS_INK}
					disabled={!previewText}
					onClick={onCopy}>
					Kopieren
				</Button>
				<Button
					data-share="whatsapp"
					variant="outline"
					className={FOCUS_INK}
					disabled={!previewText}
					onClick={onWhatsApp}>
					WhatsApp
				</Button>
				<Button data-share="excel" variant="outline" className={FOCUS_INK} onClick={onExcel}>
					Excel
				</Button>
				<Button data-share="pdf" className={FOCUS_INK} onClick={onPdf}>
					PDF drucken
				</Button>
			</>
		}>
		<PaperSheetFields>
			<PaperSheetField wide label="Wessen Plan">
				<ModeToggle
					options={MODES}
					value={mode}
					onValueChange={onModeChange}
					aria-label="Umfang des geteilten Plans"
					className="w-max"
				/>
			</PaperSheetField>

			{mode === 'helper' && (
				<PaperSheetField
					wide
					label="Welche Person"
					hint="Die Marke trägt den Namen, mit dem die Person im Plan steht.">
					{helpers.length === 0 ? (
						<p className="text-xs text-tinte-soft">Noch kein Helfer in diesem Fest.</p>
					) : (
						// Viele Helfer ergeben viele Marken — die Wolke scrollt im eigenen
						// Rahmen, damit Vorschau und Knöpfe im Bild bleiben (Vision §6).
						<div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
							{helpers.map((h) => (
								<NameChip
									key={h.id}
									onSelect={() => onSelectHelper(h.id)}
									selected={h.id === selectedHelperId}>
									{h.last_name} {h.first_name}
								</NameChip>
							))}
						</div>
					)}
				</PaperSheetField>
			)}
		</PaperSheetFields>

		<div className="border-t-2 border-tinte bg-white px-4 py-3">
			{previewText ? (
				<pre className="max-h-44 overflow-y-auto border-2 border-tinte bg-papier p-3 font-mono text-[11.5px] leading-snug">
					{previewText}
				</pre>
			) : (
				<p className="text-xs text-tinte-soft">
					Person wählen — dann steht hier, was rausgeht.
				</p>
			)}
		</div>
	</PaperSheet>
);

export default ShareZettel;
