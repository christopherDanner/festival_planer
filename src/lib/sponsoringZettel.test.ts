import { describe, it, expect } from 'vitest';
import { buildSponsoringOverviewRows } from './sponsoringTotals';
import { applyZettel, buildZettel, canApplyZettel, clearZettel } from './sponsoringZettel';
import { makeAssignment, makeCategory, makeSponsoring } from './__tests__/sponsoringFactories';

describe('buildZettel — Kategorie-Zelle', () => {
	it('belegt eine leere Zelle mit dem Standardwert vor und bietet kein Entfernen', () => {
		const plakat = makeCategory('Plakat', 200);
		const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const zettel = buildZettel(row, { kind: 'category', category: plakat });

		expect(zettel.title).toBe('Plakat');
		expect(zettel.valueInput).toBe('200');
		expect(zettel.hint).toBe('Standardwert € 200');
		expect(zettel.recorded).toBe(false);
	});

	it('sagt über einer leeren Zelle, dass noch nichts zugewiesen ist', () => {
		// Sonst ist der Zettel über einer leeren Zelle von dem über einer zum
		// Standardwert belegten nicht zu unterscheiden — beide zeigen „200".
		const plakat = makeCategory('Plakat', 200);
		const [leer] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);
		const [belegt] = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Taxi Brandl',
				assignments: [makeAssignment({ category: plakat })]
			})
		]);

		expect(buildZettel(leer, { kind: 'category', category: plakat }).stateLabel).toBe(
			'noch nicht zugewiesen'
		);
		expect(buildZettel(belegt, { kind: 'category', category: plakat }).stateLabel).toBeNull();
	});

	it('zeigt bei belegter Zelle den zugewiesenen Wert und lässt Entfernen zu', () => {
		const plakat = makeCategory('Plakat', 200);
		const [row] = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Brauerei Wieselburger',
				assignments: [makeAssignment({ category: plakat, value: 350 })]
			})
		]);

		const zettel = buildZettel(row, { kind: 'category', category: plakat });

		expect(zettel.valueInput).toBe('350');
		expect(zettel.hint).toBe('Standardwert € 200');
		expect(zettel.recorded).toBe(true);
	});

	it('nennt eine Kategorie ohne Standardwert als solche, statt einen zu erfinden', () => {
		const sonstiges = makeCategory('Sonstiges', null);
		const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const zettel = buildZettel(row, { kind: 'category', category: sonstiges });

		expect(zettel.valueInput).toBe('');
		expect(zettel.hint).toBe('Kein Standardwert — freier Betrag.');
	});
});

describe('buildZettel — Freibetrag', () => {
	it('hat keinen Standardwert und sagt das', () => {
		const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const zettel = buildZettel(row, { kind: 'freeAmount' });

		expect(zettel.title).toBe('Freibetrag');
		expect(zettel.valueInput).toBe('');
		expect(zettel.hint).toBe('Kein Standardwert — freier Betrag.');
		expect(zettel.recorded).toBe(false);
	});

	it('belegt einen erfassten Freibetrag vor', () => {
		const [row] = buildSponsoringOverviewRows([
			makeSponsoring({ companyName: 'Gasthaus Zur Linde', freeAmount: 150 })
		]);

		const zettel = buildZettel(row, { kind: 'freeAmount' });

		expect(zettel.valueInput).toBe('150');
		expect(zettel.recorded).toBe(true);
	});
});

describe('buildZettel — Sachleistung', () => {
	it('führt Bezeichnung und Schätzwert und hält fest, dass sie nie ins Geld zählt', () => {
		const [row] = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Fleischerei Berger',
				inKindDescription: 'Geschenkkorb Tombola',
				inKindValue: 80
			})
		]);

		const zettel = buildZettel(row, { kind: 'inKind' });

		expect(zettel.title).toBe('Sachleistung');
		expect(zettel.descriptionInput).toBe('Geschenkkorb Tombola');
		expect(zettel.valueInput).toBe('80');
		expect(zettel.hint).toBe('Zählt nie in die Geldsumme.');
		expect(zettel.recorded).toBe(true);
	});

	it('öffnet ohne Sachleistung mit zwei leeren Feldern', () => {
		const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		const zettel = buildZettel(row, { kind: 'inKind' });

		expect(zettel.descriptionInput).toBe('');
		expect(zettel.valueInput).toBe('');
		expect(zettel.recorded).toBe(false);
		expect(zettel.stateLabel).toBe('noch nicht erfasst');
	});
});

describe('canApplyZettel', () => {
	it('sperrt Übernehmen, solange die Sachleistung keine Bezeichnung hat', () => {
		const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);
		const zettel = buildZettel(row, { kind: 'inKind' });

		expect(canApplyZettel(zettel, { value: '80', description: ' ' })).toBe(false);
		expect(canApplyZettel(zettel, { value: '80', description: 'Brotkorb' })).toBe(true);
	});

	it('lässt Kategorie und Freibetrag immer übernehmen', () => {
		const plakat = makeCategory('Plakat', 200);
		const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);

		expect(
			canApplyZettel(buildZettel(row, { kind: 'category', category: plakat }), { value: '' })
		).toBe(true);
		expect(canApplyZettel(buildZettel(row, { kind: 'freeAmount' }), { value: '' })).toBe(true);
	});
});

describe('applyZettel — Kategorie', () => {
	it('speichert den Standardwert als geerbten Wert, nicht als eigenen', () => {
		// Sonst sähe die 94-%-Zuweisung wie ein abweichender Wert aus (rot) und
		// würde einer späteren Standardwert-Änderung nicht mehr folgen.
		const plakat = makeCategory('Plakat', 200);
		const sponsoring = makeSponsoring({ companyName: 'Taxi Brandl' });

		const write = applyZettel(sponsoring, { kind: 'category', category: plakat }, { value: '200' });

		expect(write.assignments).toEqual([{ category_id: plakat.id, value: null }]);
		expect(write.updates).toEqual({});
	});

	it('speichert einen abweichenden Wert als eigenen Wert', () => {
		const plakat = makeCategory('Plakat', 200);
		const sponsoring = makeSponsoring({ companyName: 'Brauerei Wieselburger' });

		const write = applyZettel(sponsoring, { kind: 'category', category: plakat }, { value: '350' });

		expect(write.assignments).toEqual([{ category_id: plakat.id, value: 350 }]);
	});

	it('nimmt einen Betrag mit deutschem Komma an', () => {
		const sonstiges = makeCategory('Sonstiges', null);
		const sponsoring = makeSponsoring({ companyName: 'Taxi Brandl' });

		const write = applyZettel(
			sponsoring,
			{ kind: 'category', category: sonstiges },
			{ value: '120,50' }
		);

		expect(write.assignments).toEqual([{ category_id: sonstiges.id, value: 120.5 }]);
	});

	it('lässt die übrigen Zuweisungen der Firma stehen', () => {
		// `updateSponsoring` ersetzt die Zuweisungen vollständig — wer hier
		// vergisst mitzuschreiben, löscht die anderen Kategorien still.
		const plakat = makeCategory('Plakat', 200);
		const social = makeCategory('Social', 100);
		const sponsoring = makeSponsoring({
			companyName: 'Elektro Pöchhacker',
			assignments: [makeAssignment({ category: social, value: 90 })]
		});

		const write = applyZettel(sponsoring, { kind: 'category', category: plakat }, { value: '200' });

		expect(write.assignments).toContainEqual({ category_id: social.id, value: 90 });
		expect(write.assignments).toHaveLength(2);
	});

	it('legt bei leerem Feld und fehlendem Standardwert keine Null-Euro-Zuweisung an', () => {
		// Ohne Standardwert gibt es nichts zu übernehmen; eine Zuweisung über € 0
		// sähe wie eine echte Zusage aus.
		const sonstiges = makeCategory('Sonstiges', null);
		const sponsoring = makeSponsoring({ companyName: 'Taxi Brandl' });

		const write = applyZettel(sponsoring, { kind: 'category', category: sonstiges }, { value: '' });

		expect(write.assignments).toEqual([]);
	});

	it('ändert eine bereits zugewiesene Kategorie, statt sie ein zweites Mal anzulegen', () => {
		const plakat = makeCategory('Plakat', 200);
		const sponsoring = makeSponsoring({
			companyName: 'Brauerei Wieselburger',
			assignments: [makeAssignment({ category: plakat })]
		});

		const write = applyZettel(sponsoring, { kind: 'category', category: plakat }, { value: '350' });

		expect(write.assignments).toEqual([{ category_id: plakat.id, value: 350 }]);
	});
});

describe('clearZettel — Kategorie', () => {
	it('nimmt die Zuweisung heraus und rührt Freibetrag und Sachleistung nicht an', () => {
		const plakat = makeCategory('Plakat', 200);
		const social = makeCategory('Social', 100);
		const sponsoring = makeSponsoring({
			companyName: 'Elektro Pöchhacker',
			assignments: [makeAssignment({ category: plakat }), makeAssignment({ category: social })],
			freeAmount: 150,
			inKindDescription: 'Brotkorb',
			inKindValue: 40
		});

		const write = clearZettel(sponsoring, { kind: 'category', category: plakat });

		expect(write.assignments).toEqual([{ category_id: social.id, value: null }]);
		expect(write.updates).toEqual({});
	});
});

describe('applyZettel / clearZettel — Freibetrag', () => {
	it('schreibt den Betrag und lässt die Zuweisungen unangetastet', () => {
		const plakat = makeCategory('Plakat', 200);
		const sponsoring = makeSponsoring({
			companyName: 'Gasthaus Zur Linde',
			assignments: [makeAssignment({ category: plakat })]
		});

		const write = applyZettel(sponsoring, { kind: 'freeAmount' }, { value: '150' });

		expect(write.updates).toEqual({ free_amount: 150 });
		expect(write.assignments).toEqual([{ category_id: plakat.id, value: null }]);
	});

	it('entfernt den Freibetrag', () => {
		const sponsoring = makeSponsoring({ companyName: 'Gasthaus Zur Linde', freeAmount: 150 });

		expect(clearZettel(sponsoring, { kind: 'freeAmount' }).updates).toEqual({ free_amount: null });
	});

	it('nimmt ein leeres Feld als „kein Freibetrag" statt als Null-Euro-Zusage', () => {
		const sponsoring = makeSponsoring({ companyName: 'Gasthaus Zur Linde', freeAmount: 150 });

		expect(applyZettel(sponsoring, { kind: 'freeAmount' }, { value: '' }).updates).toEqual({
			free_amount: null
		});
	});
});

describe('applyZettel / clearZettel — Sachleistung', () => {
	it('schreibt Bezeichnung und Schätzwert gemeinsam', () => {
		const sponsoring = makeSponsoring({ companyName: 'Fleischerei Berger' });

		const write = applyZettel(
			sponsoring,
			{ kind: 'inKind' },
			{ value: '80', description: 'Geschenkkorb Tombola' }
		);

		expect(write.updates).toEqual({
			in_kind_description: 'Geschenkkorb Tombola',
			in_kind_value: 80
		});
	});

	it('rührt eine erfasste Sachleistung nicht an, wenn die Bezeichnung geleert wird', () => {
		// Entfernen ist nie ein Nebeneffekt (ADR 0009): eine geleerte Bezeichnung
		// darf die Sachleistung nicht löschen — dafür gibt es den Entfernen-Knopf.
		const sponsoring = makeSponsoring({
			companyName: 'Fleischerei Berger',
			inKindDescription: 'Geschenkkorb',
			inKindValue: 80
		});

		const write = applyZettel(sponsoring, { kind: 'inKind' }, { value: '80', description: '  ' });

		expect(write.updates).toEqual({});
	});

	it('legt ohne Bezeichnung keinen einsamen Schätzwert an', () => {
		// Ein Wert ohne Bezeichnung wäre in der Matrix unsichtbar, zählte aber im
		// Sachwert des Fests weiter — eine Zahl, die niemand zuordnen kann.
		const sponsoring = makeSponsoring({ companyName: 'Fleischerei Berger' });

		const write = applyZettel(sponsoring, { kind: 'inKind' }, { value: '80', description: '' });

		expect(write.updates).toEqual({});
	});

	it('entfernt Bezeichnung und Schätzwert gemeinsam', () => {
		const sponsoring = makeSponsoring({
			companyName: 'Fleischerei Berger',
			inKindDescription: 'Geschenkkorb',
			inKindValue: 80
		});

		expect(clearZettel(sponsoring, { kind: 'inKind' }).updates).toEqual({
			in_kind_description: null,
			in_kind_value: null
		});
	});
});
