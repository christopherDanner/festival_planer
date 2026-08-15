import { festYear, formatFestDateRange } from '@/lib/festDates';
import type { CopyFestivalOptions } from '@/lib/festivalCopyService';
import type { FestivalData } from '@/lib/festivalService';

import type { QuantitySource } from './materialChoice';

/**
 * Was Schritt 1 des Kopierwerks sammelt, bevor das Fest existiert (#93).
 * Die Vorlage gehört dazu, weil sie in Schritt 1 gewählt wird und darüber
 * entscheidet, ob es Schritt 2 und 3 überhaupt gibt.
 */
export interface FestivalDraft {
	name: string;
	startDate: string;
	/** Leer heißt: eintägiges Fest. */
	endDate: string;
	location: string;
	/** Leer heißt: keine Vorlage — das Fest wird direkt angelegt. */
	templateId: string;
}

/** Frischer Entwurf; `templateId` kommt aus dem Deep-Link `?vorlage=`. */
export function emptyFestivalDraft(templateId = ''): FestivalDraft {
	return { name: '', startDate: '', endDate: '', location: '', templateId };
}

/** Der Umfang einer Vorlage — was die Untertitel-Zeilen der Karte beziffern. */
export interface TemplateScope {
	stations: number;
	shifts: number;
	materials: number;
}

export type KopierwerkStepKey = 'basics' | 'stations' | 'materials';

/** Erledigt (✓, grün), aktiv (gelb hinterlegt), offen (grau). */
export type KopierwerkStepState = 'done' | 'active' | 'open';

export interface KopierwerkStep {
	key: KopierwerkStepKey;
	/** Nummer im Eintrag; erledigte Schritte zeigen stattdessen das Häkchen. */
	number: number;
	title: string;
	/** Kurzform für die waagrechte Schritt-Leiste unter 900px. */
	shortTitle: string;
	/** Untertitel-Zeile; fehlt, solange es nichts zu beziffern gibt. */
	subtitle?: string;
	state: KopierwerkStepState;
}

export interface KopierwerkProgress {
	current: KopierwerkStepKey;
	/** Ohne Vorlage entfallen Stationen und Material — das Fest wird direkt angelegt. */
	hasTemplate: boolean;
	/** Umfang der gewählten Vorlage; fehlt, solange sie lädt. */
	scope?: TemplateScope;
	/** Geplanter Festname — die Untertitel-Zeile von Schritt 1. */
	festivalName?: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Die Schritte des Kopierwerks als Liste (Spec #64): Sponsoring kommt später
 * als Schritt 4 dazu, sobald die Kopier-Semantik aus #63 steht — dann ist das
 * ein Eintrag mehr hier, kein Layout-Umbau in der Stempelkarte.
 */
const STEP_BLUEPRINT: {
	key: KopierwerkStepKey;
	title: string;
	shortTitle: string;
	/** Schritte, die es nur mit Vorlage gibt. */
	needsTemplate: boolean;
	subtitle: (progress: KopierwerkProgress) => string | undefined;
}[] = [
	{
		key: 'basics',
		title: 'Name & Datum',
		shortTitle: 'Name & Datum',
		needsTemplate: false,
		subtitle: (progress) => progress.festivalName || undefined
	},
	{
		key: 'stations',
		title: 'Stationen & Schichten',
		shortTitle: 'Stationen',
		needsTemplate: true,
		subtitle: ({ scope }) =>
			scope &&
			`${plural(scope.stations, 'Station', 'Stationen')} · ${plural(scope.shifts, 'Schicht', 'Schichten')}`
	},
	{
		key: 'materials',
		title: 'Material',
		shortTitle: 'Material',
		needsTemplate: true,
		subtitle: ({ scope }) => scope && `${plural(scope.materials, 'Position', 'Positionen')} · Mengenquelle`
	}
];

/**
 * Die Einträge der Stempelkarte. Ohne Vorlage bleibt Schritt 1 allein übrig;
 * der aktive Schritt rückt dann nach, damit die Karte nie ohne Marke dasteht.
 */
export function kopierwerkSteps(progress: KopierwerkProgress): KopierwerkStep[] {
	const visible = STEP_BLUEPRINT.filter((step) => progress.hasTemplate || !step.needsTemplate);
	const currentIndex = Math.max(
		0,
		visible.findIndex((step) => step.key === progress.current)
	);

	return visible.map((step, index) => ({
		key: step.key,
		number: index + 1,
		title: step.title,
		shortTitle: step.shortTitle,
		subtitle: step.subtitle(progress),
		state: index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'open'
	}));
}

/** Pflichtfelder von Schritt 1: Name und Startdatum. */
export function isDraftReady(draft: FestivalDraft): boolean {
	return draft.name.trim().length > 0 && draft.startDate.length > 0;
}

/**
 * Entwurf → Anlage-Daten des Fests. Ein Enddatum am Starttag fällt weg: ein
 * eintägiges Fest trägt keinen Zeitraum, sonst rechnet der Ablaufplan mit
 * zwei gleichen Tagen.
 */
export function draftToFestivalData(draft: FestivalDraft): FestivalData {
	const endDate = draft.endDate && draft.endDate !== draft.startDate ? draft.endDate : undefined;
	return {
		name: draft.name.trim(),
		location: draft.location.trim(),
		startDate: draft.startDate,
		endDate
	};
}

/**
 * Kopf der Stempelkarte („Musikfest 2027" · „Fr 23. – So 25. Juli 2027 · aus
 * Vorlage Musikfest Steinbach 2026"). Solange ein Feld leer ist, fällt sein
 * Teil weg — der Kopf wächst mit, während Schritt 1 ausgefüllt wird.
 */
export function stampCardHeading(
	draft: FestivalDraft,
	templateName?: string
): { title: string; sub: string } {
	const parts: string[] = [];
	if (draft.startDate) {
		parts.push(
			`${formatFestDateRange(draft.startDate, draft.endDate || undefined)} ${festYear(draft.startDate)}`
		);
	}
	if (templateName) parts.push(`aus Vorlage ${templateName}`);

	return { title: draft.name.trim() || 'Neues Fest', sub: parts.join(' · ') };
}

/** Was die Schritte 2 und 3 zusammengetragen haben. */
export interface CopySelection {
	stationIds: string[];
	copyAssignments: boolean;
	materialIds: ReadonlySet<string>;
	quantitySource: QuantitySource;
}

/**
 * Der Auftrag an `copyFestivalData`: die Auswahl beider Schritte plus die
 * beiden Fest-Startdaten, aus denen der Termin-Versatz der Schichten kommt.
 * Sie stehen hier zusammen, damit Vorlage und neues Fest nicht an einer
 * Aufrufstelle vertauscht werden können.
 */
export function copyFestivalOptions(
	template: { start_date: string },
	draft: FestivalDraft,
	selection: CopySelection
): CopyFestivalOptions {
	return {
		stationIds: selection.stationIds,
		copyAssignments: selection.copyAssignments,
		materialIds: [...selection.materialIds],
		materialQuantitySource: selection.quantitySource,
		sourceFestivalStartDate: template.start_date,
		targetFestivalStartDate: draft.startDate
	};
}

/** Knopf der Schritt-1-Fußzeile: ohne Vorlage wird angelegt, mit Vorlage geht es weiter. */
export function stepSubmitLabel(hasTemplate: boolean): string {
	return hasTemplate ? 'WEITER: STATIONEN →' : 'FEST ANLEGEN';
}
