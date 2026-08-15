import { describe, it, expect } from 'vitest';
import {
	buildSponsoringOverviewFooter,
	buildSponsoringOverviewRows,
	festivalInKindTotal,
	festivalSponsoringTotal,
	sponsoringInKindValue,
	sponsoringTotal
} from '../sponsoringTotals';
import { makeAssignment, makeCategory, makeSponsoring } from './sponsoringFactories';

describe('sponsoringTotal', () => {
	it('returns the free amount for a pure money sponsor without categories', () => {
		const sponsoring = makeSponsoring({ freeAmount: 500 });
		expect(sponsoringTotal(sponsoring)).toBe(500);
	});

	it('sums assigned category values when no free amount is set', () => {
		const sponsoring = makeSponsoring({
			assignments: [
				makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200 }),
				makeAssignment({ categoryName: 'Social-Media-Beitrag', categoryValue: 100 })
			]
		});
		expect(sponsoringTotal(sponsoring)).toBe(300);
	});

	it('prefers the overridden assignment value over the category default', () => {
		const sponsoring = makeSponsoring({
			assignments: [
				makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200, value: 150 }),
				makeAssignment({ categoryName: 'Logo in Speisekarte', categoryValue: 50 })
			]
		});
		expect(sponsoringTotal(sponsoring)).toBe(200);
	});

	it('adds the free amount on top of assigned categories', () => {
		const sponsoring = makeSponsoring({
			freeAmount: 100,
			assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200 })]
		});
		expect(sponsoringTotal(sponsoring)).toBe(300);
	});

	it('counts a valueless category without override as 0', () => {
		const sponsoring = makeSponsoring({
			assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: null })]
		});
		expect(sponsoringTotal(sponsoring)).toBe(0);
	});

	it('returns 0 for a sponsoring without categories and without free amount', () => {
		expect(sponsoringTotal(makeSponsoring({}))).toBe(0);
	});
});

describe('Sachwert', () => {
	it('lässt Sponsoring- und Fest-Geldsumme vom Sachwert unberührt — für immer geld-only', () => {
		const ohneSachleistung = makeSponsoring({
			freeAmount: 250,
			assignments: [makeAssignment({ categoryName: 'Speisekarte', categoryValue: 150 })]
		});
		const mitSachleistung = makeSponsoring({
			freeAmount: 250,
			assignments: [makeAssignment({ categoryName: 'Speisekarte', categoryValue: 150 })],
			inKindDescription: 'Geschenkkorb Tombola',
			inKindValue: 9999
		});

		expect(sponsoringTotal(mitSachleistung)).toBe(sponsoringTotal(ohneSachleistung));
		expect(festivalSponsoringTotal([mitSachleistung])).toBe(
			festivalSponsoringTotal([ohneSachleistung])
		);
		expect(festivalInKindTotal([mitSachleistung])).toBe(9999);
	});

	it('lässt die Geldsumme eines Sponsorings von der Sachleistung unberührt', () => {
		const sponsoring = makeSponsoring({
			freeAmount: 250,
			assignments: [makeAssignment({ categoryName: 'Speisekarte', categoryValue: 150 })],
			inKindDescription: 'Geschenkkorb Tombola',
			inKindValue: 80
		});
		expect(sponsoringTotal(sponsoring)).toBe(400);
		expect(sponsoringInKindValue(sponsoring)).toBe(80);
	});

	it('zählt ein Sponsoring ohne Sachleistung mit 0 Sachwert', () => {
		expect(sponsoringInKindValue(makeSponsoring({ freeAmount: 100 }))).toBe(0);
	});

	it('zählt eine Sachleistung ohne Schätzwert mit 0 Sachwert', () => {
		const sponsoring = makeSponsoring({ inKindDescription: '3 Warengutscheine' });
		expect(sponsoringInKindValue(sponsoring)).toBe(0);
	});

	it('summiert die Sachwerte eines Fests, ohne sie ins Geld zu addieren', () => {
		const sponsorings = [
			makeSponsoring({ freeAmount: 200, inKindDescription: 'Brotkorb', inKindValue: 40 }),
			makeSponsoring({ freeAmount: 150, inKindDescription: '6 Fl. Wein', inKindValue: 60 }),
			makeSponsoring({ freeAmount: 100 })
		];
		expect(festivalInKindTotal(sponsorings)).toBe(100);
		expect(festivalSponsoringTotal(sponsorings)).toBe(450);
	});

	it('liefert 0 Sachwert für ein Fest ohne Sponsorings', () => {
		expect(festivalInKindTotal([])).toBe(0);
	});
});

describe('festivalSponsoringTotal', () => {
	it('returns 0 for a festival without sponsorings', () => {
		expect(festivalSponsoringTotal([])).toBe(0);
	});

	it('sums the totals of all sponsorings of the festival', () => {
		const sponsorings = [
			makeSponsoring({
				freeAmount: 100,
				assignments: [makeAssignment({ categoryName: 'Werbeplakat', categoryValue: 200 })]
			}),
			makeSponsoring({ freeAmount: 50 })
		];
		expect(festivalSponsoringTotal(sponsorings)).toBe(350);
	});
});

describe('buildSponsoringOverviewRows', () => {
	it('builds one row per sponsor with category positions, free amount and total, sorted by company name', () => {
		const werbeplakat = makeAssignment({
			categoryName: 'Werbeplakat',
			categoryValue: 200,
			value: 150
		});
		const sponsorings = [
			makeSponsoring({ companyName: 'Raiffeisen', freeAmount: 100, assignments: [werbeplakat] }),
			makeSponsoring({ companyName: 'Brauerei Schremser', freeAmount: 50 })
		];

		const rows = buildSponsoringOverviewRows(sponsorings);

		expect(rows.map((r) => r.companyName)).toEqual(['Brauerei Schremser', 'Raiffeisen']);
		expect(rows[1].positions).toEqual([
			{ categoryId: werbeplakat.category_id, label: 'Werbeplakat', value: 150, overridden: true }
		]);
		expect(rows[1].freeAmount).toBe(100);
		expect(rows[1].total).toBe(250);
		expect(rows[0].positions).toEqual([]);
		expect(rows[0].total).toBe(50);
	});

	it('macht die zugewiesenen Werte je Kategorie-Id greifbar', () => {
		const plakat = makeAssignment({ categoryName: 'Plakat', categoryValue: 200 });
		const social = makeAssignment({ categoryName: 'Social', categoryValue: 100 });
		const rows = buildSponsoringOverviewRows([makeSponsoring({ assignments: [plakat, social] })]);

		expect(Object.keys(rows[0].positionsByCategoryId).sort()).toEqual(
			[plakat.category_id, social.category_id].sort()
		);
		expect(rows[0].positionsByCategoryId[plakat.category_id].value).toBe(200);
		expect(rows[0].positionsByCategoryId[social.category_id]?.label).toBe('Social');
	});

	it('markiert nur die Zuweisung, die vom Standardwert der Kategorie abweicht', () => {
		const abweichend = makeAssignment({ categoryName: 'Plakat', categoryValue: 200, value: 350 });
		const standard = makeAssignment({ categoryName: 'Social', categoryValue: 100 });
		const gleich = makeAssignment({ categoryName: 'Durchsage', categoryValue: 80, value: 80 });
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({ assignments: [abweichend, standard, gleich] })
		]);
		const byId = rows[0].positionsByCategoryId;

		expect(byId[abweichend.category_id].overridden).toBe(true);
		expect(byId[standard.category_id].overridden).toBe(false);
		expect(byId[gleich.category_id].overridden).toBe(false);
	});

	it('meldet keine Abweichung, wo die Kategorie gar keinen Standardwert hat', () => {
		const ohneStandardwert = makeAssignment({
			categoryName: 'Durchsage',
			categoryValue: null,
			value: 80
		});
		const rows = buildSponsoringOverviewRows([makeSponsoring({ assignments: [ohneStandardwert] })]);
		expect(rows[0].positionsByCategoryId[ohneStandardwert.category_id].overridden).toBe(false);
	});

	it('trägt die Sachleistung als Beschreibung mit Schätzwert, ohne sie in die Summe zu nehmen', () => {
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({
				freeAmount: 250,
				inKindDescription: 'Geschenkkorb Tombola',
				inKindValue: 80
			})
		]);

		expect(rows[0].inKind).toEqual({ description: 'Geschenkkorb Tombola', value: 80 });
		expect(rows[0].total).toBe(250);
	});

	it('lässt die Sachleistung leer, wenn keine erfasst ist', () => {
		expect(buildSponsoringOverviewRows([makeSponsoring({})])[0].inKind).toBeNull();
	});

	it('trägt den Vorjahresbeitrag aus dem Quellfest je Sponsoring ein', () => {
		const uebernommen = makeSponsoring({ companyName: 'Brauerei Wieselburger', freeAmount: 900 });
		const handeingetragen = makeSponsoring({ companyName: 'Taxi Brandl', freeAmount: 150 });

		const rows = buildSponsoringOverviewRows([uebernommen, handeingetragen], {
			[uebernommen.id]: 500
		});

		expect(rows.find((r) => r.sponsoringId === uebernommen.id)?.previousTotal).toBe(500);
	});

	it('lässt den Vorjahresbeitrag eines handeingetragenen Sponsorings leer', () => {
		const handeingetragen = makeSponsoring({ companyName: 'Taxi Brandl', freeAmount: 150 });
		const rows = buildSponsoringOverviewRows([handeingetragen], {});
		expect(rows[0].previousTotal).toBeNull();
	});
});

describe('buildSponsoringOverviewFooter', () => {
	it('summiert je Kategorie, den Freibetrag und das Geld — den Sachwert daneben', () => {
		const plakat = makeCategory('Plakat', 200);
		const socialKategorie = makeCategory('Social', 100);
		const categories = [plakat, socialKategorie, makeCategory('Durchsage', 80)];
		const plakatA = makeAssignment({ category: plakat });
		const plakatB = makeAssignment({ category: plakat, value: 350 });
		const social = makeAssignment({ category: socialKategorie });

		const rows = buildSponsoringOverviewRows([
			makeSponsoring({
				assignments: [plakatA, social],
				freeAmount: 100,
				inKindDescription: 'Geschenkkorb',
				inKindValue: 80
			}),
			makeSponsoring({
				assignments: [plakatB],
				freeAmount: 50,
				inKindDescription: 'Brotkorb',
				inKindValue: 40
			})
		]);
		const footer = buildSponsoringOverviewFooter(rows, categories);

		expect(footer.perCategoryId[plakat.id]).toBe(550);
		expect(footer.perCategoryId[socialKategorie.id]).toBe(100);
		expect(footer.freeAmount).toBe(150);
		expect(footer.inKindValue).toBe(120);
		expect(footer.total).toBe(800);
	});

	it('führt eine Kategorie ohne Zuweisung mit 0 statt sie wegzulassen', () => {
		const ungenutzt = makeCategory('Durchsage', 80);
		const footer = buildSponsoringOverviewFooter([], [ungenutzt]);
		expect(footer.perCategoryId).toEqual({ [ungenutzt.id]: 0 });
		expect(footer.total).toBe(0);
		expect(footer.inKindValue).toBe(0);
	});
});
