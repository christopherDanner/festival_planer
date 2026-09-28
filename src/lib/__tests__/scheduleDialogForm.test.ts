import { describe, it, expect } from 'vitest';

import { scheduleDay as day, schedulePhase as phase, scheduleEntry } from './scheduleFactories';
import {
	canSaveDay,
	canSaveEntry,
	canSavePhase,
	changeDay,
	dayFormFrom,
	dayPayload,
	dayUpdate,
	emptyDayForm,
	emptyEntryForm,
	emptyPhaseForm,
	entryFormFrom,
	entryPayload,
	phaseFormFrom,
	phasePayload,
	phaseUpdate,
	phasesOfDay,
	showsResponsible,
	timeProblem
} from '../scheduleDialogForm';

/**
 * Seam dieses Tests (aus den Akzeptanzkriterien von #124 abgeleitet, vor dem
 * ersten Test festgehalten): `scheduleDialogForm` trägt die Regeln der drei
 * Dialoge als reine Logik — was ein leeres Blatt zeigt, was ein bestehender
 * Satz hineinträgt, wann gespeichert werden darf und was dabei abgegeben wird.
 *
 * Die beiden Kriterien, die hier hängen:
 * - „Eine Aufgabe lässt sich in drei Klicks anlegen, ohne vorher eine Phase zu
 *   erfinden" → `emptyEntryForm` kommt ohne Phase aus, `canSaveEntry` verlangt
 *   nur Titel und Tag.
 * - „Art-Wechsel räumt Status und Verantwortlichen sauber ab" → `entryPayload`
 *   schreibt bei `program` beide auf `null` (ADR 0007).
 */

const HEUTE = { type: 'task' as const, schedule_day_id: 'd1' };

describe('emptyEntryForm — das leere Blatt', () => {
	it('kommt ohne Phase aus — sie ist der optionale Feinschnitt (ADR 0007)', () => {
		expect(emptyEntryForm(HEUTE).schedule_phase_id).toBe('');
	});

	it('übernimmt Art und Tag aus dem Kontext des Griffs', () => {
		const form = emptyEntryForm({ type: 'program', schedule_day_id: 'd7' });

		expect(form.type).toBe('program');
		expect(form.schedule_day_id).toBe('d7');
	});

	it('lässt Titel, Zeiten, Verantwortlichen und Beschreibung leer', () => {
		const form = emptyEntryForm(HEUTE);

		expect(form.title).toBe('');
		expect(form.start_time).toBe('');
		expect(form.end_time).toBe('');
		expect(form.responsible_helper_id).toBe('');
		expect(form.description).toBe('');
	});
});

describe('entryFormFrom — ein bestehender Eintrag im Blatt', () => {
	const EINTRAG = scheduleEntry({
		schedule_day_id: 'd2',
		schedule_phase_id: 'p1',
		title: 'Zelt-Anlieferung',
		type: 'task',
		start_time: '08:00:00',
		end_time: '10:30:00',
		responsible_helper_id: 'h1',
		status: 'done',
		description: 'Zufahrt freihalten'
	});

	it('trägt jedes Feld in das Formular', () => {
		expect(entryFormFrom(EINTRAG)).toEqual({
			title: 'Zelt-Anlieferung',
			type: 'task',
			schedule_day_id: 'd2',
			schedule_phase_id: 'p1',
			start_time: '08:00',
			end_time: '10:30',
			responsible_helper_id: 'h1',
			description: 'Zufahrt freihalten'
		});
	});

	it('kürzt die Sekunde der Datenbank weg — das Zeitfeld kennt sie nicht', () => {
		expect(entryFormFrom(scheduleEntry({ start_time: '08:00:00' })).start_time).toBe('08:00');
	});

	it('macht aus fehlenden Werten leere Felder, nicht „null"', () => {
		const form = entryFormFrom(scheduleEntry({}));

		expect(form.schedule_phase_id).toBe('');
		expect(form.start_time).toBe('');
		expect(form.end_time).toBe('');
		expect(form.responsible_helper_id).toBe('');
		expect(form.description).toBe('');
	});
});

describe('changeDay — die Phase gehört ihrem Tag', () => {
	const form = { ...emptyEntryForm(HEUTE), schedule_phase_id: 'p1' };

	it('lässt die Phase zurück, wenn der Eintrag auf einen anderen Tag zieht', () => {
		expect(changeDay(form, 'd2')).toEqual({
			schedule_day_id: 'd2',
			schedule_phase_id: ''
		});
	});

	it('behält sie, wenn derselbe Tag noch einmal gewählt wird', () => {
		expect(changeDay(form, 'd1').schedule_phase_id).toBe('p1');
	});
});

describe('phasesOfDay — zur Wahl stehen nur die Phasen des gewählten Tages', () => {
	const tage = [
		day({ id: 'd1', phases: [phase({ id: 'p1', name: 'Anlieferung' })] }),
		day({ id: 'd2', phases: [phase({ id: 'p2', name: 'Abbau' })] })
	];

	it('nennt die Phasen des gewählten Tages', () => {
		expect(phasesOfDay(tage, 'd2').map((p) => p.name)).toEqual(['Abbau']);
	});

	it('kommt mit einem unbekannten Tag ohne Phasen zurück', () => {
		expect(phasesOfDay(tage, '')).toEqual([]);
	});
});

describe('timeProblem und canSaveEntry — Titel, Tag, Start vor Ende', () => {
	it('verlangt einen Titel', () => {
		expect(canSaveEntry(emptyEntryForm(HEUTE))).toBe(false);
		expect(canSaveEntry({ ...emptyEntryForm(HEUTE), title: 'Fassanstich' })).toBe(true);
	});

	it('verlangt keine Phase — drei Klicks, ohne eine zu erfinden', () => {
		const form = { ...emptyEntryForm(HEUTE), title: 'Zelt stellen' };

		expect(form.schedule_phase_id).toBe('');
		expect(canSaveEntry(form)).toBe(true);
	});

	it('verlangt einen Tag — er ist die einzige Pflichtebene (ADR 0007)', () => {
		expect(
			canSaveEntry({ ...emptyEntryForm(HEUTE), title: 'Zelt stellen', schedule_day_id: '' })
		).toBe(false);
	});

	it('nennt das Problem, wenn die Startzeit nicht vor der Endzeit liegt', () => {
		const form = { ...emptyEntryForm(HEUTE), title: 'Fassanstich' };

		expect(timeProblem({ ...form, start_time: '18:00', end_time: '17:00' })).toBe(
			'Die Startzeit muss vor der Endzeit liegen.'
		);
		expect(canSaveEntry({ ...form, start_time: '18:00', end_time: '17:00' })).toBe(false);
	});

	it('lässt das Ende offen — es ist optional', () => {
		const form = { ...emptyEntryForm(HEUTE), title: 'Fassanstich', start_time: '18:00' };

		expect(timeProblem(form)).toBeNull();
		expect(canSaveEntry(form)).toBe(true);
	});

	it('nimmt es auch ohne Startzeit nicht krumm', () => {
		expect(timeProblem({ ...emptyEntryForm(HEUTE), end_time: '17:00' })).toBeNull();
	});
});

describe('showsResponsible — der Verantwortliche hängt an der Aufgabe', () => {
	it('steht bei einer Aufgabe im Blatt', () => {
		expect(showsResponsible(emptyEntryForm(HEUTE))).toBe(true);
	});

	it('verschwindet beim Programmpunkt — er steht auf keinem Papier, das ihn zeigt', () => {
		expect(showsResponsible(emptyEntryForm({ type: 'program', schedule_day_id: 'd1' }))).toBe(
			false
		);
	});
});

describe('entryPayload — was der Dialog abgibt', () => {
	const KONTEXT = { festivalId: 'f1', status: null };

	const aufgabe = {
		...emptyEntryForm(HEUTE),
		title: '  Zelt stellen  ',
		start_time: '08:00',
		end_time: '10:00',
		responsible_helper_id: 'h1',
		description: 'Zufahrt freihalten'
	};

	it('gibt die volle Aufgabe ab, Titel getrimmt', () => {
		expect(entryPayload(aufgabe, KONTEXT)).toEqual({
			schedule_day_id: 'd1',
			schedule_phase_id: null,
			festival_id: 'f1',
			title: 'Zelt stellen',
			type: 'task',
			start_time: '08:00',
			end_time: '10:00',
			responsible_helper_id: 'h1',
			status: 'open',
			description: 'Zufahrt freihalten'
		});
	});

	it('macht aus leeren Feldern „null", nicht ""', () => {
		const payload = entryPayload({ ...emptyEntryForm(HEUTE), title: 'Kurz' }, KONTEXT);

		expect(payload.start_time).toBeNull();
		expect(payload.end_time).toBeNull();
		expect(payload.responsible_helper_id).toBeNull();
		expect(payload.description).toBeNull();
		expect(payload.schedule_phase_id).toBeNull();
	});

	it('gibt eine gewählte Phase weiter', () => {
		expect(
			entryPayload({ ...aufgabe, schedule_phase_id: 'p1' }, KONTEXT).schedule_phase_id
		).toBe('p1');
	});

	it('behält den Status einer bestehenden Aufgabe', () => {
		expect(entryPayload(aufgabe, { festivalId: 'f1', status: 'done' }).status).toBe('done');
	});

	it('legt eine neue Aufgabe offen an', () => {
		expect(entryPayload(aufgabe, KONTEXT).status).toBe('open');
	});

	it('räumt beim Programmpunkt Status und Verantwortlichen ab (ADR 0007)', () => {
		const payload = entryPayload(
			{ ...aufgabe, type: 'program' },
			{ festivalId: 'f1', status: 'done' }
		);

		expect(payload.status).toBeNull();
		expect(payload.responsible_helper_id).toBeNull();
	});
});

describe('Der Tag-Dialog: Datum und Label', () => {
	it('öffnet leer', () => {
		expect(emptyDayForm()).toEqual({ date: '', label: '' });
	});

	it('trägt einen bestehenden Tag hinein', () => {
		expect(dayFormFrom({ date: '2026-07-23', label: 'Aufbau' })).toEqual({
			date: '2026-07-23',
			label: 'Aufbau'
		});
	});

	it('macht aus einem fehlenden Label ein leeres Feld', () => {
		expect(dayFormFrom({ date: '2026-07-23', label: null }).label).toBe('');
	});

	it('verlangt ein Datum, sonst nichts', () => {
		expect(canSaveDay({ date: '', label: 'Aufbau' })).toBe(false);
		expect(canSaveDay({ date: '2026-07-23', label: '' })).toBe(true);
	});

	it('erlaubt Daten vor und nach dem Fest — es gibt keine Grenze zu prüfen', () => {
		expect(canSaveDay({ date: '2020-01-01', label: '' })).toBe(true);
		expect(canSaveDay({ date: '2099-12-31', label: '' })).toBe(true);
	});

	it('gibt beim Ändern nur Datum und Label ab', () => {
		expect(dayUpdate({ date: '2026-07-23', label: '  Aufbau  ' })).toEqual({
			date: '2026-07-23',
			label: 'Aufbau'
		});
	});

	it('macht aus einem leeren Label „null"', () => {
		expect(dayUpdate({ date: '2026-07-23', label: '   ' }).label).toBeNull();
	});

	it('legt einen Tag von Hand an — nie automatisch erzeugt', () => {
		expect(dayPayload({ date: '2026-07-22', label: 'Aufbau' }, { festivalId: 'f1', sortOrder: 3 })).toEqual({
			festival_id: 'f1',
			date: '2026-07-22',
			label: 'Aufbau',
			is_auto_generated: false,
			sort_order: 3
		});
	});
});

describe('Der Phasen-Dialog: nur ein Name', () => {
	it('öffnet leer', () => {
		expect(emptyPhaseForm()).toEqual({ name: '' });
	});

	it('trägt eine bestehende Phase hinein', () => {
		expect(phaseFormFrom({ name: 'Anlieferung' })).toEqual({ name: 'Anlieferung' });
	});

	it('verlangt einen Namen', () => {
		expect(canSavePhase({ name: '   ' })).toBe(false);
		expect(canSavePhase({ name: 'Anlieferung' })).toBe(true);
	});

	it('gibt beim Umbenennen nur den Namen ab, getrimmt', () => {
		expect(phaseUpdate({ name: '  Abbau  ' })).toEqual({ name: 'Abbau' });
	});

	it('hängt eine neue Phase an ihren Tag und ans Ende der Reihe', () => {
		expect(
			phasePayload({ name: 'Abbau' }, { festivalId: 'f1', scheduleDayId: 'd1', sortOrder: 2 })
		).toEqual({
			schedule_day_id: 'd1',
			festival_id: 'f1',
			name: 'Abbau',
			sort_order: 2
		});
	});
});
