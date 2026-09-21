/**
 * Erzeugt die base64-Schriftmodule für die PDF-Exporte (`src/lib/pdfFonts/`).
 *
 * jsPDF kann nur TrueType lesen und braucht die Schrift als base64 im VFS —
 * die woff2-Dateien der Fontsource-Pakete taugen dafür nicht. Google Fonts
 * liefert unter der v1-CSS-API pro Gewicht eine **statische, latin-gesubsettete**
 * TTF (~27–31 kB); das ist genau der Subset, den Research #53 als ausreichend
 * festgehalten hat. Die URLs sind auf die geprüften Versionen gepinnt.
 *
 * Aufruf: `node scripts/generate-pdf-fonts.mjs` (braucht Netz).
 * Die erzeugten Dateien sind eingecheckt — das Skript ist Nachweis der
 * Herkunft und Weg zum Nachziehen, kein Build-Schritt.
 *
 * Lizenz: beide Familien stehen unter der SIL OFL 1.1; die Lizenztexte liegen
 * als `public/OFL-public-sans.txt` und `public/OFL-oswald.txt` bei.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(import.meta.dirname, '../src/lib/pdfFonts');

const FONTS = [
	{
		module: 'publicSans400',
		constant: 'PUBLIC_SANS_400_TTF_BASE64',
		family: 'Public Sans',
		weight: '400 (normal)',
		url: 'https://fonts.gstatic.com/s/publicsans/v21/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymuFpmJxAct.ttf'
	},
	{
		module: 'publicSans700',
		constant: 'PUBLIC_SANS_700_TTF_BASE64',
		family: 'Public Sans',
		weight: '700 (bold)',
		url: 'https://fonts.gstatic.com/s/publicsans/v21/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymu8Z6JxAct.ttf'
	},
	{
		module: 'oswald600',
		constant: 'OSWALD_600_TTF_BASE64',
		family: 'Oswald',
		weight: '600 (Akzentschrift, DESIGN-VISION §4)',
		url: 'https://fonts.gstatic.com/s/oswald/v57/TK3_WkUHHAIjg75cFRf3bXL8LICs1y9osUZiYA.ttf'
	}
];

for (const font of FONTS) {
	const response = await fetch(font.url, { headers: { 'User-Agent': 'Mozilla/4.0' } });
	if (!response.ok) throw new Error(`${font.url}: HTTP ${response.status}`);
	const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
	const contents = `/**
 * ${font.family} ${font.weight} — statische TTF, Latin-Subset, base64 für das jsPDF-VFS.
 * Erzeugt von \`scripts/generate-pdf-fonts.mjs\`; nicht von Hand bearbeiten.
 * Quelle: ${font.url}
 * Lizenz: SIL OFL 1.1 (\`public/OFL-*.txt\`).
 */
export const ${font.constant} =
	'${base64}';
`;
	await writeFile(path.join(OUT_DIR, `${font.module}.ts`), contents, 'utf8');
	console.log(`${font.module}.ts — ${base64.length} base64-Zeichen`);
}
