import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialListHeader from './MaterialListHeader';

const noop = () => {};

const renderHeader = () =>
	renderToStaticMarkup(
		<MaterialListHeader
			onAddMaterial={noop}
			onExport={noop}
			onExportOrderList={noop}
			onTransfer={noop}
		/>
	);

describe('MaterialListHeader', () => {
	it('benennt den Materiallisten-Export-Button "Materialliste"', () => {
		const html = renderHeader();
		expect(html).toContain('>Materialliste</span>');
		expect(html).not.toContain('>Export</span>');
	});

	it('bietet einen eigenen Bestelllisten-Export-Button neben der Materialliste', () => {
		const html = renderHeader();
		expect(html).toContain('>Bestellliste</span>');
		expect(html).toContain('>Materialliste</span>');
	});

	it('zeigt weder "Import" noch "Abgleich", aber "Übernehmen" und "Neu"', () => {
		const html = renderHeader();
		expect(html).not.toContain('>Import</span>');
		expect(html).not.toContain('>Abgleich</span>');
		expect(html).toContain('>Übernehmen</span>');
		expect(html).toContain('>Neu</span>');
	});
});
