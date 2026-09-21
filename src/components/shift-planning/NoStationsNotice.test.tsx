import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import NoStationsNotice from './NoStationsNotice';

/** Der Leerzustand des Schichtplans (#102): ohne Stationen gibt es weder
Reiter noch Fokus — nur den einen Satz und den Weg heraus. */

const html = () => renderToStaticMarkup(<NoStationsNotice onAddStation={() => {}} />);

describe('NoStationsNotice', () => {
	it('sagt in einem Satz, was fehlt', () => {
		expect(html()).toContain('Noch keine Station');
	});

	it('bietet den Weg heraus an', () => {
		expect(html()).toContain('+ STATION');
	});

	it('steht als gestrichelter Rahmen im Stempel-Ton', () => {
		const markup = html();

		expect(markup).toContain('border-dashed');
		expect(markup).toContain('text-rot');
	});
});
