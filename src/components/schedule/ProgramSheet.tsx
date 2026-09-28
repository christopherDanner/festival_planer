import React from 'react';

import { cn } from '@/lib/utils';
import { ActionMenu } from '@/components/toolkit/ActionMenu';
import { Poster } from '@/components/toolkit/Poster';
import { SectionHeading } from '@/components/toolkit/SectionHeading';
import type { ProgramSheet as Sheet, ProgramSheetRow } from '@/lib/scheduleProgramSheet';
import type { ScheduleEntryWithHelper } from '@/lib/scheduleService';

export interface ProgramSheetProps {
	sheet: Sheet;
	/** Steht in Gelb über „PROGRAMM" — der Aushang nennt sein Fest. */
	festivalName?: string;
	/** Legt einen Punkt für **diesen** Tag an; der Dialog fragt den Tag dann
	nicht mehr (#123). */
	onAddProgram: (dayId: string) => void;
	onEditProgram: (entry: ScheduleEntryWithHelper) => void;
	onDeleteProgram: (entry: ScheduleEntryWithHelper) => void;
}

/**
 * Leise Griffe: der Aushang bleibt Aushang, ⋮ und „+" treten erst hervor, wenn
 * man sie sucht (#123). Voll sichtbar werden sie bei Hover **und** bei Fokus —
 * mit der Tastatur gäbe es sonst keinen Weg zu ihnen.
 */
const LEISE = 'text-tinte-soft transition-colors hover:text-tinte focus-visible:text-tinte';

/**
 * Der **Programmzettel**, das rechte Papier des Schreibtischs (#123, Variante C
 * der DESIGN-VISION): grüner Halftone-Kopf mit Festname und „PROGRAMM", darunter
 * je Ablauf-Tag ein Zwischentitel mit gepunktetem Lineal und die Punkte als
 * `Zeit · Titel · Beschreibung`, am Fuß Zweck und Anzahl.
 *
 * Er ist **zugleich der Aushang und die Eingabe**: der Fächer-Prototyp zeigte
 * ihn als reines Anzeige-Papier, entschieden wurde bedienbar (Wayfinder #67) —
 * sonst wäre eines der beiden Papiere eine Attrappe.
 *
 * Keine Phasen, keine Haken, keine Verantwortlichen (ADR 0007): das alles ist
 * Planungssprache und steht auf der Werkliste nebenan. Was auf den Zettel kommt,
 * entscheidet `buildProgramSheet`; dieses Papier zeichnet nur.
 */
const ProgramSheet: React.FC<ProgramSheetProps> = ({
	sheet,
	festivalName,
	onAddProgram,
	onEditProgram,
	onDeleteProgram
}) => (
	// Am Desktop klebt der Zettel beim Scrollen oben — die Werkliste links ist
	// länger, und der Aushang soll dabei im Blick bleiben (#123). Unter 900px
	// steht er unter der Werkliste und klebt nicht.
	<aside className="border-2.5 border-tinte bg-white min-[900px]:sticky min-[900px]:top-3">
		<Poster className="border-0 border-b-2.5 px-3.5 py-4 text-center">
			{festivalName && (
				<div className="font-display text-xs uppercase tracking-[.1em] text-gelb">
					{festivalName}
				</div>
			)}
			<h3 className="mt-0.5 font-display text-[21px] font-semibold uppercase tracking-[.03em]">
				Programm
			</h3>
		</Poster>

		{sheet.days.map((sheetDay) => (
			<React.Fragment key={sheetDay.day.id}>
				<SectionHeading
					as="h4"
					className="gap-2.5 px-4 pb-1 pt-2.5 font-display text-[13px] font-semibold uppercase tracking-[.05em] text-gruen">
					{sheetDay.title}
				</SectionHeading>

				{sheetDay.rows.map((row) => (
					<ProgramRow
						key={row.entry.id}
						row={row}
						onEdit={() => onEditProgram(row.entry)}
						onDelete={() => onDeleteProgram(row.entry)}
					/>
				))}

				{/* Der tagesbezogene Griff: er legt ohne Umweg über die Tagesauswahl
				für genau diesen Tag an. Der Knopf der Werkzeugleiste bleibt der Weg
				für einen Tag, der noch gar kein Programm hat (#122). */}
				<button
					type="button"
					data-tag-anlegen={sheetDay.day.id}
					onClick={() => onAddProgram(sheetDay.day.id)}
					className={cn(
						'mb-1 w-full px-4 py-1.5 text-left text-[11px] font-extrabold uppercase tracking-[.06em]',
						LEISE,
						'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tinte'
					)}>
					+ Programmpunkt
				</button>
			</React.Fragment>
		))}

		{sheet.days.length === 0 && (
			<p className="px-4 py-4 text-[13px] text-tinte-soft">
				Noch kein Programmpunkt in diesem Fest. Angelegt wird er über „+ PROGRAMMPUNKT" in der
				Werkzeugleiste.
			</p>
		)}

		<div className="flex flex-wrap justify-between gap-2.5 border-t-2 border-tinte px-4 py-2.5 text-[11px] text-tinte-soft">
			<span>Druckt als Aushang</span>
			<span>{sheet.count === 1 ? '1 Punkt' : `${sheet.count} Punkte`}</span>
		</div>
	</aside>
);

/**
 * Eine Zeile des Aushangs: Uhrzeit in fester Spalte (Akzentschrift), Titel, die
 * Beschreibung leise darunter — und rechts das ⋮.
 *
 * Titel und ⋮ sind zwei Knöpfe nebeneinander statt ineinander (ein Knopf im
 * Knopf wäre kein gültiges HTML); der Klick auf den Titel öffnet den Eintrag,
 * derselbe Griff wie in der Werkliste.
 *
 * Ohne Uhrzeit bleibt die Spalte **leer**: die Werkliste vermerkt „ohne Zeit",
 * weil dort eine Aufgabe ohne Termin eine Auskunft ist — auf einem Aushang wäre
 * der Vermerk nur Lärm für die Gäste.
 */
function ProgramRow({
	row,
	onEdit,
	onDelete
}: {
	row: ProgramSheetRow;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const { entry, time } = row;

	return (
		<div className="flex items-baseline gap-3 px-4 text-[13px]">
			<button
				type="button"
				onClick={onEdit}
				className="flex min-w-0 flex-1 items-baseline gap-3 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte">
				<span className="w-[52px] shrink-0 font-display text-sm font-semibold tabular-nums">
					{time}
				</span>
				<span className="min-w-0 flex-1">
					<span className="font-bold">{entry.title}</span>
					{entry.description && (
						<span className="block text-[11px] font-normal text-tinte-soft">
							{entry.description}
						</span>
					)}
				</span>
			</button>

			<ActionMenu
				menuLabel={`Menü des Programmpunkts ${entry.title}`}
				editLabel="Bearbeiten …"
				deleteLabel="Programmpunkt löschen"
				confirmTitle="Programmpunkt löschen"
				confirmMessage={`„${entry.title}" wird vom Programmzettel entfernt.`}
				onEdit={onEdit}
				onDelete={onDelete}
				className={cn('h-8 w-8 shrink-0 self-center', LEISE)}
			/>
		</div>
	);
}

export default ProgramSheet;
