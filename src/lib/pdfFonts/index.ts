import type jsPDF from 'jspdf';

import { OSWALD_600_TTF_BASE64 } from '@/lib/pdfFonts/oswald600';
import { PUBLIC_SANS_400_TTF_BASE64 } from '@/lib/pdfFonts/publicSans400';
import { PUBLIC_SANS_700_TTF_BASE64 } from '@/lib/pdfFonts/publicSans700';

/**
 * Die zwei Schriftrollen der Werkzeug-Plakat-Handschrift (DESIGN-VISION §4)
 * unter den Namen, mit denen jsPDF sie kennt.
 *
 * - `body` — Arbeitsschrift Public Sans, in `normal` und `bold`.
 * - `accent` — Akzentschrift Oswald 600: Plakat-Titel, Stationsnamen,
 *   Uhrzeiten, Kennzahlen. Nie für Fließtext.
 */
export const POSTER_FONT = {
	body: 'PublicSans',
	accent: 'Oswald'
} as const;

export interface PosterFontFile {
	/** Name im virtuellen Dateisystem von jsPDF. */
	fileName: string;
	/** Schriftfamilie, unter der die Datei angemeldet wird. */
	family: string;
	/** jsPDF-Stil innerhalb der Familie. */
	style: 'normal' | 'bold';
	base64: string;
}

/**
 * Die eingebetteten Schriftschnitte. Latin-Subset (Research #53) — die
 * Icon-Glyphen der Vision (♛ ♪ ✓) sind darin *nicht* enthalten und haben in
 * den PDFs darum nichts zu suchen. Beide Familien stehen unter der SIL OFL
 * 1.1; die Lizenztexte liegen als `public/OFL-public-sans.txt` und
 * `public/OFL-oswald.txt` bei. Erzeugt von `scripts/generate-pdf-fonts.mjs`.
 */
export const POSTER_FONT_FILES: readonly PosterFontFile[] = [
	{
		fileName: 'PublicSans-Regular.ttf',
		family: POSTER_FONT.body,
		style: 'normal',
		base64: PUBLIC_SANS_400_TTF_BASE64
	},
	{
		fileName: 'PublicSans-Bold.ttf',
		family: POSTER_FONT.body,
		style: 'bold',
		base64: PUBLIC_SANS_700_TTF_BASE64
	},
	{
		fileName: 'Oswald-SemiBold.ttf',
		family: POSTER_FONT.accent,
		style: 'normal',
		base64: OSWALD_600_TTF_BASE64
	}
];

type VfsDoc = jsPDF & {
	existsFileInVFS(fileName: string): boolean;
	addFileToVFS(fileName: string, content: string): jsPDF;
};

/**
 * Meldet Public Sans und Oswald im VFS des Dokuments an, damit die PDF-Exporte
 * in der Plakat-Handschrift setzen statt in jsPDFs Helvetica-Ersatz.
 *
 * Muss vor dem ersten `setFont` eines Dokuments laufen; mehrfacher Aufruf am
 * selben Dokument ist harmlos (die Dateien landen nur einmal im VFS).
 */
export function registerPosterFonts(doc: jsPDF): void {
	const vfsDoc = doc as VfsDoc;
	for (const file of POSTER_FONT_FILES) {
		if (vfsDoc.existsFileInVFS(file.fileName)) continue;
		vfsDoc.addFileToVFS(file.fileName, file.base64);
		doc.addFont(file.fileName, file.family, file.style);
	}
}
