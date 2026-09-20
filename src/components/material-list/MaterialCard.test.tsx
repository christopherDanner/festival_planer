import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { editRowDraft, startRowDraft, type RowDraft } from '@/lib/materialRowEdit';

import MaterialCard from './MaterialCard';

const noop = () => {};

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'mat1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Stk',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

/** 4 Fass à 50 Liter bestellt, 3 verbraucht — dieselbe Position wie in den
Tabellen-Tests aus #114. */
const fass = {
	unit: 'Liter',
	packaging_unit: 'Fass',
	amount_per_packaging: 50,
	ordered_quantity: 4,
	actual_quantity: 3
};

function render(
	m: FestivalMaterialWithStation,
	{ showStation = false, draft = null }: { showStation?: boolean; draft?: RowDraft | null } = {}
) {
	return renderToStaticMarkup(
		<MaterialCard
			material={m}
			showStation={showStation}
			draft={draft}
			onStartEdit={noop}
			onDraftChange={noop}
			onSave={noop}
			onCancel={noop}
			onEdit={noop}
			onCopy={noop}
			onDelete={noop}
		/>
	);
}

function text(html: string): string {
	return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

describe('MaterialCard — der Kopf (#116)', () => {
	it('nennt Name, Kategorie-Marke und Lieferant', () => {
		const html = render(material({ name: 'Bier', category: 'Getränke', supplier: 'Metro' }));

		expect(html).toContain('font-bold');
		expect(text(html)).toContain('Bier');
		expect(text(html)).toContain('Getränke');
		expect(text(html)).toContain('Metro');
	});

	it('zeigt die Station nur, wo die Arbeitsliste nicht nach Station gruppiert', () => {
		const row = material({ station: { id: 's1', name: 'Ausschank' } });

		expect(render(row, { showStation: true })).toContain('Ausschank');
		expect(render(row, { showStation: false })).not.toContain('Ausschank');
	});

	it('trägt ✎ für den Zeilenmodus und ⋮ für die Stammdaten', () => {
		const html = render(material());

		expect(html).toContain('Werte von Bier bearbeiten');
		expect(html).toContain('Menü für Bier');
	});
});

describe('MaterialCard — die Kacheln, lesend (#116)', () => {
	it('stellt Bestellt, Verbraucht und Δ über MwSt, Netto und Brutto', () => {
		const html = text(render(material({ ...fass, unit_price: 2, tax_rate: 20, price_is_net: true })));

		for (const label of ['Bestellt', 'Verbraucht', 'Δ', 'MwSt', 'Netto', 'Brutto', 'Gesamt']) {
			expect(html).toContain(label);
		}
	});

	it('zeigt Mengen in Basiseinheiten mit der Gebinde-Umrechnung darunter', () => {
		const html = text(render(material(fass)));

		expect(html).toContain('200'); // 4 Fass à 50 Liter
		expect(html).toContain('→ 4 × Fass');
		expect(html).toContain('150');
		expect(html).toContain('→ 3 × Fass');
	});

	it('färbt Mehrverbrauch rot und Minderverbrauch grün', () => {
		const mehr = render(material({ ordered_quantity: 30, actual_quantity: 35 }));
		const weniger = render(material({ ordered_quantity: 30, actual_quantity: 25 }));

		expect(text(mehr)).toContain('+5');
		expect(mehr).toContain('text-rot');
		expect(text(weniger)).toContain('-5');
		expect(weniger).toContain('text-gruen');
	});

	it('trennt Netto und Brutto — ohne Steuersatz steht zweimal derselbe Betrag', () => {
		const html = text(render(material({ ordered_quantity: 1, unit_price: 10, tax_rate: 20, price_is_net: true })));

		expect(html).toContain('10,00');
		expect(html).toContain('12,00');
		expect(html).toContain('20 %');
	});

	it('nennt eine Position ohne Steuersatz „keine"', () => {
		expect(text(render(material({ tax_rate: null })))).toContain('keine');
	});

	it('trägt die Gesamtsumme der Position im Fuß, dazu das Gebinde', () => {
		const html = text(render(material({ ...fass, unit_price: 2, tax_rate: null })));

		expect(html).toContain('50 Liter pro Fass');
		expect(html).toContain('6,00'); // 2 € × 3 Fass verbraucht
	});

	it('macht lesend keine Kachel tippbar — dafür gibt es ✎', () => {
		const html = render(material({ ordered_quantity: 10, unit_price: 2 }));

		expect(html).not.toContain('<input');
		expect(html).not.toContain('<select');
	});
});

describe('MaterialCard — Preislücke (#116)', () => {
	it('setzt Netto und Brutto als rote gestrichelte Kachel', () => {
		const html = render(material({ unit_price: null, ordered_quantity: 4 }));

		expect(text(html).match(/Fehlt/g)).toHaveLength(2);
		expect(html).toContain('border-dashed');
		expect(html).toContain('border-rot');
	});

	it('lässt Gesamt leer — die Position verfälscht keine Summe', () => {
		// Alles andere ist gefüllt, damit der Strich nur von Gesamt kommen kann.
		const html = text(
			render(
				material({
					unit_price: null,
					ordered_quantity: 4,
					actual_quantity: 4,
					category: 'Getränke',
					supplier: 'Metro',
					tax_rate: 20
				})
			)
		);

		expect(html).toContain('–');
	});
});

describe('MaterialCard — der Zeilenmodus auf der Karte (#116)', () => {
	const row = material({ ...fass, unit_price: 2, tax_rate: 20, price_is_net: true });
	const draft = startRowDraft(row);

	it('macht die fünf Wert-Kacheln zu Eingabefeldern', () => {
		const html = render(row, { draft });

		expect(html).toContain('Bestellt (Liter) für Bier');
		expect(html).toContain('Verbraucht (Liter) für Bier');
		expect(html).toContain('MwSt für Bier');
		expect(html).toContain('Netto € für Bier');
		expect(html).toContain('Brutto € für Bier');
		expect(html.match(/<input/g)).toHaveLength(4);
		expect(html.match(/<select/g)).toHaveLength(1);
	});

	it('stellt ✓ und ✕ in die Kartenkopfzeile, statt ✎ und ⋮ stehen zu lassen', () => {
		const html = render(row, { draft });

		expect(html).toContain('Werte von Bier speichern');
		expect(html).toContain('Bearbeiten von Bier abbrechen');
		expect(html).not.toContain('Werte von Bier bearbeiten');
		expect(html).not.toContain('Menü für Bier');
	});

	it('lässt Δ und Gesamt lesend — sie werden gerechnet, nicht getippt', () => {
		const html = render(row, { draft });

		expect(html).not.toContain('Δ für Bier');
		expect(html).not.toContain('Gesamt für Bier');
	});

	it('rechnet Δ und Gesamt aus dem Entwurf mit, nicht aus dem Gespeicherten', () => {
		// 200 Liter bestellt, jetzt 300 verbraucht getippt → +100 und 2,40 × 6 Fass
		const html = text(render(row, { draft: editRowDraft(draft, 'consumed', '300') }));

		expect(html).toContain('+100');
		expect(html).toContain('14,40');
	});

	it('zeigt die Gebinde-Umrechnung der getippten Menge, nicht der gespeicherten', () => {
		const html = text(render(row, { draft: editRowDraft(draft, 'ordered', '300') }));

		expect(html).toContain('→ 6 × Fass');
		expect(html).not.toContain('→ 4 × Fass');
	});

	it('legt die Karte in Gelb, solange sie offen ist', () => {
		expect(render(row, { draft })).toContain('bg-gelb');
		expect(render(row)).not.toContain('bg-gelb');
	});
});

describe('MaterialCard — nichts scrollt horizontal (#116)', () => {
	it('hat keine Fläche, die quer scrollt, und keine Mindestbreite', () => {
		const html = render(material({ ...fass, name: 'Bier Fass 50 l', supplier: 'Brauerei Zipf' }));

		expect(html).not.toContain('overflow-x-auto');
		expect(html).not.toContain('min-width');
		expect(html).not.toContain('min-w-[');
	});
});
