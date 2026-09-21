import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Festival } from '@/lib/festivalService';
import HandoverSourceBar, { type HandoverSourceBarProps } from './HandoverSourceBar';

/* Seam dieses Tests (aus #118 vor dem ersten Test festgehalten): `HandoverSourceBar`
   ist die Fest-Zeile der Übernahme — **Quellfest wählbar, Zielfest fest**. Das
   Zielfest kommt aus der Route und ist kein Feld mehr (Entscheidung 2 in #118,
   `CONTEXT.md`: „Zielfest — das aktuelle Fest in der Material-Liste"). */

const noop = () => {};

const SOURCES: Festival[] = [
	{ id: 's25', user_id: 'u1', name: 'Musikfest Steinbach', start_date: '2025-07-24', created_at: '', updated_at: '' },
	{ id: 's24', user_id: 'u1', name: 'Musikfest Steinbach', start_date: '2024-07-25', created_at: '', updated_at: '' }
];

const render = (over: Partial<HandoverSourceBarProps> = {}) =>
	renderToStaticMarkup(
		<HandoverSourceBar
			sources={SOURCES}
			sourceId="s25"
			onSourceChange={noop}
			targetName="Musikfest Steinbach 2026"
			{...over}
		/>
	);

const parse = (html: string) => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

describe('HandoverSourceBar — Quellfest wählbar, Zielfest fest', () => {
	it('nennt das gewählte Quellfest mit seinem Jahr', () => {
		const html = render();

		expect(html).toContain('Quellfest');
		expect(html).toContain('Musikfest Steinbach · 2025');
	});

	it('zeigt das Zielfest an, ohne es zur Wahl zu stellen', () => {
		const host = parse(render());

		expect(host.textContent).toContain('Zielfest');
		expect(host.textContent).toContain('Musikfest Steinbach 2026');
		// Genau ein Auswahlfeld in der Zeile — und das ist das Quellfest.
		expect(host.querySelectorAll('[role="combobox"]')).toHaveLength(1);
		expect(host.querySelector('[role="combobox"]')?.id).toBe('handover-source');
	});

	it('sagt an der Zeile, dass die Wunschmenge von selbst speichert', () => {
		expect(parse(render()).textContent).toContain('speichert automatisch');
	});

	it('steht in Plakat-Optik: Tinte-Rahmen, keine runden Ecken', () => {
		const html = render();

		expect(html).toContain('border-tinte');
		expect(html).not.toContain('rounded');
	});
});
