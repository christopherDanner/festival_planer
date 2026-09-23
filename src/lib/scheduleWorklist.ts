/** Die Regeln der **Aufgaben-Werkliste**, des linken Papiers am Schreibtisch
(#122, Variante C der DESIGN-VISION mit der Gliederung aus dem Entscheid-
Prototyp `entscheid-ablaufplan-phasen.html`). Reines Logikmodul ohne React:
Gliederung Tag → Phase, die Filter samt ihren Zählern und die Fußzeile.

Gereiht wird hier nichts — die Uhrzeit reiht im Service (ADR 0007). Dieses
Modul wählt aus, gruppiert und zählt. */

import { formatFestDayLong } from '@/lib/festDates';
import { helperName } from '@/lib/helperService';
import { groupEntriesByPhase } from '@/lib/scheduleGrouping';
import type {
	ScheduleDay,
	ScheduleDayWithEntries,
	ScheduleEntryWithHelper,
	SchedulePhase
} from '@/lib/scheduleService';

/** Der Segment-Schalter über der Liste: `Alle · Offen · Erledigt`. */
export type TaskFilter = 'all' | 'open' | 'done';

/** Eine Zeile der Werkliste. */
export interface WorklistTask {
	entry: ScheduleEntryWithHelper;
	/** Erledigt — der Haken, die Durchstreichung und jeder Zähler hängen daran. */
	done: boolean;
	/**
	 * „08:00" — **nur** die Uhrzeit, ohne Tageskürzel: der Tag steht schon als
	 * Zwischentitel darüber. `null` heißt „ohne Zeit".
	 */
	time: string | null;
	/** „Hochauer Franz" (ADR 0005), `null` ohne Verantwortlichen. */
	responsible: string | null;
}

/** Ein Block unter einem Tag; `phase === null` heißt „direkt unter dem Tag"
und trägt darum keinen Zwischentitel. */
export interface WorklistPhaseGroup {
	phase: SchedulePhase | null;
	/** „1/3" am Zwischentitel — über die **gezeigten** Zeilen. */
	done: number;
	total: number;
	tasks: WorklistTask[];
}

/** Ein Tages-Zwischentitel samt seinen Blöcken. */
export interface WorklistDay {
	day: ScheduleDayWithEntries;
	/** „Donnerstag 23. Juli · Aufbau" */
	title: string;
	/** „4 offen" am Zwischentitel — über die **gezeigten** Zeilen. */
	open: number;
	groups: WorklistPhaseGroup[];
}

/** Ein Eintrag des Verantwortlichen-Felds über der Liste. */
export interface WorklistResponsible {
	id: string;
	/** „Hochauer Franz" (ADR 0005). */
	name: string;
}

/** Die Werkliste, wie sie am Bildschirm steht. */
export interface Worklist {
	/** Nur Tage mit gezeigten Aufgaben — ein leerer Zwischentitel sagt nichts (#122). */
	days: WorklistDay[];
	/**
	 * Die Zahlen in den drei Segmenten. Sie zählen **ungefiltert**, also den
	 * Gesamtbestand des Fests: „Offen (9)" ist das Versprechen, was ein Druck auf
	 * den Knopf zeigt — es darf sich nicht ändern, nur weil gerade ein anderer
	 * Knopf gedrückt ist. Die Gruppenköpfe zählen umgekehrt die gezeigten Zeilen
	 * (#122). Dieselben Zahlen tragen das KPI-Maßband und die Fußzeile.
	 */
	counts: Record<TaskFilter, number>;
	/**
	 * Die Auswahl des Verantwortlichen-Felds: jeder Helfer, der irgendeine
	 * Aufgabe dieses Fests trägt, alphabetisch. Sie steht **außerhalb** beider
	 * Filter — sonst verschwände der gerade gewählte Name aus seinem eigenen Feld,
	 * sobald er keine passende Aufgabe mehr hat.
	 */
	responsibles: WorklistResponsible[];
	/** Die beiden Zahlen der Fußzeile; die dritte („x von y erledigt") steht
	in {@link Worklist.counts}. */
	footer: WorklistFooter;
}

/**
 * Was am Fuß der Werkliste steht: „3 offen vor dem Fest · 4 in der
 * Nachbereitung". Beide zählen **ungefiltert** wie die Segmente — es sind
 * Aussagen über das Fest, nicht über den gedrückten Knopf.
 */
export interface WorklistFooter {
	/** Offene Aufgaben an Tagen vor `start_date`. */
	openBefore: number;
	/** Offene Aufgaben an Tagen nach `end_date`. */
	openAfter: number;
}

export interface WorklistInput {
	days: ScheduleDayWithEntries[];
	/** Ohne Angabe steht die Liste auf „Alle". */
	filter?: TaskFilter;
	/** Der gewählte Verantwortliche; ohne Angabe zeigt die Liste alle. */
	responsibleId?: string | null;
	/** `festivals.start_date` — trennt die Vorbereitung von den Festtagen. */
	festivalStart?: string | null;
	/** `festivals.end_date`; ohne Angabe dauert das Fest einen Tag. */
	festivalEnd?: string | null;
}

/** Programmpunkte bleiben draußen — sie stehen auf dem anderen Papier (ADR 0007). */
const isTask = (entry: ScheduleEntryWithHelper): boolean => entry.type === 'task';

/** Offen ist jede Aufgabe, die keinen Haken trägt — auch eine ohne Status.
Maßband, Tageszähler und Fußzeile fragen hier, damit sie dasselbe zählen. */
const isOpenTask = (entry: ScheduleEntryWithHelper): boolean =>
	isTask(entry) && entry.status !== 'done';

const matchesFilter = (entry: ScheduleEntryWithHelper, filter: TaskFilter): boolean =>
	filter === 'all' || (filter === 'done') === (entry.status === 'done');

/** Aus dem Eintrag wird eine Zeile: Haken, Uhrzeit, Titel, Verantwortlicher. */
function toTask(entry: ScheduleEntryWithHelper): WorklistTask {
	return {
		entry,
		done: entry.status === 'done',
		// Die Datenbank liefert „08:00:00"; die Sekunde hat auf dem Papier nichts
		// verloren (dieselbe Kürzung wie im Schichtplan).
		time: entry.start_time ? entry.start_time.slice(0, 5) : null,
		responsible: entry.responsible_helper ? helperName(entry.responsible_helper) : null
	};
}

/**
 * Die beiden Zahlen der Fußzeile. Ein Ablauf-Tag liegt vor dem Fest, wenn sein
 * Datum vor `start_date` liegt, und in der Nachbereitung, wenn es nach
 * `end_date` liegt — beide Grenzen zählen zum Fest (CONTEXT.md, *Ablauf-Tag*).
 *
 * Ohne Fest-Datum wird nicht geteilt: „vor dem Fest" hätte dann keinen Bezug.
 */
function footerOf(
	days: ScheduleDayWithEntries[],
	festivalStart: string | null,
	festivalEnd: string | null
): WorklistFooter {
	if (!festivalStart) return { openBefore: 0, openAfter: 0 };
	// Ohne Enddatum dauert das Fest einen Tag — dieselbe Annahme wie im Mast.
	const last = festivalEnd || festivalStart;
	const openOn = (matches: (date: string) => boolean) =>
		days
			.filter((day) => matches(day.date))
			.flatMap((day) => day.entries)
			.filter(isOpenTask).length;

	return {
		openBefore: openOn((date) => date < festivalStart),
		openAfter: openOn((date) => date > last)
	};
}

/** Die Helfer, die Aufgaben tragen — jeder einmal, nach Namen geordnet. */
function responsiblesOf(tasks: ScheduleEntryWithHelper[]): WorklistResponsible[] {
	const byId = new Map<string, WorklistResponsible>();
	for (const entry of tasks) {
		const helper = entry.responsible_helper;
		if (helper && !byId.has(helper.id)) {
			byId.set(helper.id, { id: helper.id, name: helperName(helper) });
		}
	}
	return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/**
 * Die Aufschrift eines Ablauf-Tags: ausgeschriebenes Datum wie im Schichtplan
 * (#68), dahinter das freie Label — „Donnerstag 23. Juli · Aufbau".
 *
 * Das Label entfällt, wenn es nur den Wochentag wiederholt: die automatisch
 * angelegten Festtage tragen genau den (`initializeScheduleDays`), und
 * „Donnerstag 23. Juli · Donnerstag" wäre Lärm.
 *
 * Steht hier und nicht in der Ansicht, weil der Zwischentitel der Werkliste und
 * das Tag-Auswahlfeld des Dialogs denselben Tag gleich nennen müssen.
 */
export function scheduleDayTitle(day: Pick<ScheduleDay, 'date' | 'label'>): string {
	const title = formatFestDayLong(day.date);
	const label = day.label?.trim();
	// Verglichen wird gegen das *ganze* erste Wort: ein Label „Do" ist eine
	// eigene Aufschrift und soll stehen bleiben, „Donnerstag" nicht.
	const weekday = title.split(' ')[0];
	return label && label !== weekday ? `${title} · ${label}` : title;
}

/**
 * Baut die Werkliste: die Aufgaben des Fests, gegliedert nach Tag → Phase.
 *
 * Programmpunkte bleiben draußen — sie stehen auf dem Programmzettel und
 * tragen weder Status noch Verantwortlichen (ADR 0007).
 */
export function buildWorklist({
	days,
	filter = 'all',
	responsibleId = null,
	festivalStart = null,
	festivalEnd = null
}: WorklistInput): Worklist {
	const all = days.flatMap((day) => day.entries.filter(isTask));
	const open = all.filter(isOpenTask).length;
	const shows = (entry: ScheduleEntryWithHelper) =>
		isTask(entry) &&
		matchesFilter(entry, filter) &&
		(responsibleId === null || entry.responsible_helper_id === responsibleId);

	return {
		days: days
			.map((day) => {
				const groups = groupEntriesByPhase({ ...day, entries: day.entries.filter(shows) })
					// Ein Zwischentitel ohne Zeile sagt nichts — anders als in der
					// Gruppierung selbst, die leere Phasen benennbar hält.
					.filter((group) => group.entries.length > 0)
					.map((group) => {
						const tasks = group.entries.map(toTask);
						return {
							phase: group.phase,
							done: tasks.filter((task) => task.done).length,
							total: tasks.length,
							tasks
						};
					});

				return {
					day,
					title: scheduleDayTitle(day),
					open: groups.reduce((sum, group) => sum + (group.total - group.done), 0),
					groups
				};
			})
			.filter((day) => day.groups.length > 0),
		counts: { all: all.length, open, done: all.length - open },
		responsibles: responsiblesOf(all),
		footer: footerOf(days, festivalStart, festivalEnd)
	};
}
