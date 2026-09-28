import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getFestival: vi.fn(),
	getStations: vi.fn(),
	getStationShifts: vi.fn(),
	getMaterials: vi.fn(),
	getScheduleDays: vi.fn(),
	getUserFestivals: vi.fn()
}));

vi.mock('@/lib/festivalService', () => ({
	getFestival: mocks.getFestival,
	getUserFestivals: mocks.getUserFestivals
}));
vi.mock('@/lib/shiftService', () => ({
	getStations: mocks.getStations,
	getStationShifts: mocks.getStationShifts
}));
vi.mock('@/lib/materialService', () => ({ getMaterials: mocks.getMaterials }));
vi.mock('@/lib/scheduleService', () => ({ getScheduleDays: mocks.getScheduleDays }));

import { loadTemplate } from './loadTemplate';

const QUELLFEST = { id: 'fest-2026', name: 'Musikfest Steinbach 2026', start_date: '2026-07-24' };

describe('loadTemplate', () => {
	beforeEach(() => {
		mocks.getFestival.mockResolvedValue(QUELLFEST);
		mocks.getStations.mockResolvedValue([{ id: 's1' }]);
		mocks.getStationShifts.mockResolvedValue([{ id: 'sh1' }, { id: 'sh2' }]);
		mocks.getMaterials.mockResolvedValue([{ id: 'm1' }]);
		mocks.getScheduleDays.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }]);
	});

	// Das Quellfest trägt das Startdatum, mit dem `copyFestivalData` die Termine
	// versetzt. Es aus der Auswahl-Liste zu fischen ginge schief, sobald die Liste
	// scheitert oder der Deep-Link auf ein Fest zeigt, das nicht in ihr steht —
	// das Fest entstünde dann still ohne Kopie.
	it('holt das Quellfest selbst, nicht bloß seinen Inhalt', async () => {
		const template = await loadTemplate('fest-2026');

		expect(mocks.getFestival).toHaveBeenCalledWith('fest-2026');
		expect(template.festival).toEqual(QUELLFEST);
		expect(template.stations).toHaveLength(1);
		expect(template.shifts).toHaveLength(2);
		expect(template.materials).toHaveLength(1);
	});

	// Schritt 4 stellt je Ablauf-Tag alten und neuen Termin gegenüber (#127) —
	// dafür muss der Ablaufplan der Vorlage mit der Vorlage geladen sein.
	it('bringt den Ablaufplan der Vorlage mit', async () => {
		const template = await loadTemplate('fest-2026');

		expect(mocks.getScheduleDays).toHaveBeenCalledWith('fest-2026');
		expect(template.scheduleDays).toHaveLength(3);
	});

	it('verweigert eine Vorlage, die es nicht (mehr) gibt', async () => {
		mocks.getFestival.mockResolvedValue(null);

		await expect(loadTemplate('geloescht')).rejects.toThrow();
	});

	it('reicht einen Fehler der Inhalts-Abfragen weiter', async () => {
		mocks.getMaterials.mockRejectedValue(new Error('Netz weg'));

		await expect(loadTemplate('fest-2026')).rejects.toThrow('Netz weg');
	});
});
