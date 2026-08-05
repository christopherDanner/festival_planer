import { describe, expect, it } from 'vitest';
import jsPDF from 'jspdf';
import { POSTER_FONT, POSTER_FONT_FILES, registerPosterFonts } from '@/lib/pdfFonts';

/**
 * Zeichen, die die drei Exporte über ASCII hinaus aufs Papier bringen. Der
 * Latin-Subset deckt sie ab; die Icon-Glyphen der Vision (♛ ♪ ✓) liegen
 * außerhalb und bleiben darum aus den PDFs heraus.
 */
const EXPORT_VOCABULARY = 'äöüÄÖÜß–—€·';

describe('registerPosterFonts', () => {
	it('meldet Arbeits- und Akzentschrift bei jsPDF an', () => {
		const doc = new jsPDF();

		registerPosterFonts(doc);

		const fonts = doc.getFontList();
		expect(Object.keys(fonts.PublicSans ?? {}).length).toBeGreaterThan(0);
		expect(fonts[POSTER_FONT.body]).toEqual(expect.arrayContaining(['normal', 'bold']));
		expect(fonts[POSTER_FONT.accent]).toEqual(expect.arrayContaining(['normal']));
	});

	it('setzt die eingebettete Schrift, nicht die Helvetica-Ersatzschrift', () => {
		const doc = new jsPDF();
		registerPosterFonts(doc);

		doc.setFont(POSTER_FONT.accent, 'normal');

		const active = (
			doc as unknown as {
				getFont(): { fontName: string; isStandardFont?: boolean; metadata: unknown };
			}
		).getFont();
		expect(active.fontName).toBe(POSTER_FONT.accent);
		expect(active.isStandardFont).toBe(false);
		// Nur eine wirklich geparste TTF bringt eigene Glyphenmetrik mit.
		expect(active.metadata).toHaveProperty('widthOfString', expect.any(Function));
	});

	it('vermisst deutsche Umlaute, Gedankenstriche und das Euro-Zeichen', () => {
		const doc = new jsPDF();
		registerPosterFonts(doc);

		for (const style of ['normal', 'bold'] as const) {
			doc.setFont(POSTER_FONT.body, style);
			for (const char of EXPORT_VOCABULARY) {
				expect(doc.getTextWidth(char), `${POSTER_FONT.body}/${style} kennt "${char}"`).toBeGreaterThan(0);
			}
		}

		doc.setFont(POSTER_FONT.accent, 'normal');
		for (const char of EXPORT_VOCABULARY) {
			expect(doc.getTextWidth(char), `${POSTER_FONT.accent} kennt "${char}"`).toBeGreaterThan(0);
		}
	});

	it('legt jede Schriftdatei nur einmal ins VFS, auch bei Doppelanmeldung', () => {
		const doc = new jsPDF();

		registerPosterFonts(doc);
		registerPosterFonts(doc);

		const vfs = (doc as unknown as { existsFileInVFS(name: string): boolean });
		for (const file of POSTER_FONT_FILES) {
			expect(vfs.existsFileInVFS(file.fileName)).toBe(true);
		}
		const styles = doc.getFontList()[POSTER_FONT.body];
		expect(styles.filter((style) => style === 'normal')).toHaveLength(1);
	});
});
