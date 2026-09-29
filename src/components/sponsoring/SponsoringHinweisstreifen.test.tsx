import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { buttonByLabel } from '@/lib/__tests__/domTesting';
import SponsoringHinweisstreifen from './SponsoringHinweisstreifen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
});

const render = (className?: string) =>
	renderToStaticMarkup(
		<SponsoringHinweisstreifen
			lead="Preisliste steht."
			text="Jetzt die Firmen dazu — einzeln oder aus einem früheren Fest."
			actionLabel="SPONSOREN ÜBERNEHMEN"
			onAction={() => {}}
			className={className}
		/>
	);

describe('SponsoringHinweisstreifen', () => {
	it('stellt voran, was schon gilt, und sagt dann, was fehlt', () => {
		const html = render();
		expect(html).toContain('Preisliste steht.');
		expect(html).toContain('Jetzt die Firmen dazu');
	});

	it('trägt den Griff auf den nächsten Schritt', () => {
		const html = render();
		expect(html).toContain('SPONSOREN ÜBERNEHMEN');
	});

	it('meldet den Klick an den Aufrufer', async () => {
		const onAction = vi.fn();
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		roots.push(root);
		await act(async () => {
			root.render(
				<SponsoringHinweisstreifen
					lead="Es fehlt die Preisliste."
					text="Ohne Kategorien lässt sich keiner dieser Firmen etwas zuweisen."
					actionLabel="KATEGORIEN ÜBERNEHMEN"
					onAction={onAction}
				/>
			);
		});

		await act(async () => {
			buttonByLabel(container, 'KATEGORIEN ÜBERNEHMEN').click();
		});

		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it('hebt sich als Streifen ab, statt als weiterer Kasten daneben zu stehen', () => {
		const html = render();
		expect(html).toContain('bg-gelb');
		expect(html).toContain('border-2.5 border-tinte');
	});

	it('lässt den Aufrufer die Kante wegnehmen, an der er ihn anschweißt', () => {
		expect(render('border-t-0')).toContain('border-t-0');
	});
});
