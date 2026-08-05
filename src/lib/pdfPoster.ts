import jsPDF from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';

import { POSTER_FONT, registerPosterFonts } from '@/lib/pdfFonts';

/**
 * Zeichen-Bausteine für die PDF-Exporte in Plakat-Optik — grüner
 * Halftone-Kopf, harte Tinte-Rahmen, Oswald-Titel, Maßband als Fortschritt,
 * Stempel, getönte Fußzeile (DESIGN-VISION.md §4, Issue #110).
 *
 * Das Gegenstück zu `src/components/toolkit/` auf Papier: alle drei Papiere
 * (Einsatzplan, Programmzettel, Sponsoring-Übersicht) bedrucken dasselbe
 * Papier, damit die Handschrift nicht am Bildschirmrand endet.
 */

export type PosterRgb = readonly [number, number, number];

/**
 * Die OKLCH-Farbrollen der Handschrift in sRGB, weil jsPDF nur RGB kennt.
 * Umgerechnet aus den Tokens in `src/index.css`; wer dort dreht, dreht hier
 * mit.
 */
export const POSTER_COLOR = {
	/** `--papier` — Plakatgrund */
	papier: [247, 245, 239],
	/** `--papier-getoent` — getönte Fläche, etwa Wertmarken */
	papierGetoent: [234, 232, 221],
	/** `--tinte` — Text und Rahmen */
	tinte: [25, 34, 25],
	/** `--tinte-soft` — Sekundärtext */
	tinteSoft: [76, 86, 76],
	/** `--gruen` — Marke, Köpfe, positiv */
	gruen: [0, 87, 52],
	/** `--gruen-tief` */
	gruenTief: [0, 67, 37],
	/** `--gelb` — Auswahl, Maßband-Marke */
	gelb: [244, 205, 75],
	/** Maßband-Füllung: Gelb mit 55 % Deckung, auf Weiß vorgemischt. */
	gelbFill: [249, 228, 156],
	/** `--rot` — Warnung, fehlt */
	rot: [197, 56, 41],
	/** `--linie` — Trennlinien */
	linie: [214, 212, 204],
	/** `--fusszeile` — getönte Fußzeile */
	fusszeile: [241, 240, 233],
	weiss: [255, 255, 255],
	/** Halftone-Punkt: Weiß mit 12 % Deckung, auf Grün vorgemischt. */
	halftone: [31, 107, 76]
} satisfies Record<string, PosterRgb>;

/**
 * Rahmenstärken in mm — die px-Werte der Vision bei 96 dpi umgerechnet
 * (2.5px Container, 2px Karte, 1.5px Maßband, 1px Linie innen).
 */
export const POSTER_LINE = {
	container: 0.66,
	card: 0.53,
	rule: 0.4,
	hair: 0.26
} as const;

/** Seitenrand aller Plakat-Papiere in mm. */
export const POSTER_MARGIN = 12;

/** Halftone-Kachel: 14px bei 96 dpi. */
const HALFTONE_TILE = 3.7;
/** Punktradius: 1.15px bei 96 dpi. */
const HALFTONE_DOT = 0.3;

type Rgb = readonly [number, number, number];

function fill(doc: jsPDF, color: Rgb): void {
	doc.setFillColor(color[0], color[1], color[2]);
}

function stroke(doc: jsPDF, color: Rgb, width: number): void {
	doc.setDrawColor(color[0], color[1], color[2]);
	doc.setLineWidth(width);
}

function ink(doc: jsPDF, color: Rgb): void {
	doc.setTextColor(color[0], color[1], color[2]);
}

/**
 * Sperrung in mm. `setCharSpace` fehlt in den mitgelieferten jsPDF-Typen,
 * existiert aber zur Laufzeit — die Ausnahme steckt darum hier an einer Stelle.
 */
function letterSpace(doc: jsPDF, mm: number): void {
	(doc as jsPDF & { setCharSpace(charSpace: number): jsPDF }).setCharSpace(mm);
}

export interface PosterDocOptions {
	orientation: 'portrait' | 'landscape';
}

/**
 * Legt ein neues Plakat-Papier an: A4 in mm, Plakat-Schriften angemeldet,
 * Arbeitsschrift in Tinte aktiv.
 */
export function createPosterDoc({ orientation }: PosterDocOptions): jsPDF {
	// Das Halftone-Raster kostet tausende Zeichenbefehle. Mit jsPDFs
	// 16-Stellen-Standardpräzision und ungepackten Strömen wächst ein Plakat
	// dadurch auf über ein halbes MB — für ein Papier, das laut Vision auch per
	// WhatsApp herumgeht, zu viel. Zwei Nachkommastellen sind bei mm feiner als
	// jeder Drucker auflöst.
	const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', precision: 2, compress: true });
	registerPosterFonts(doc);
	doc.setFont(POSTER_FONT.body, 'normal');
	ink(doc, POSTER_COLOR.tinte);
	return doc;
}

/** Halftone-Punktraster auf einer grünen Fläche (weiße Punkte, 12 % Deckung). */
function drawHalftone(doc: jsPDF, x: number, y: number, width: number, height: number): void {
	fill(doc, POSTER_COLOR.halftone);
	for (let dx = 0; dx < width; dx += HALFTONE_TILE) {
		for (let dy = 0; dy < height; dy += HALFTONE_TILE) {
			for (const [ox, oy] of [
				[0.8, 0.8],
				[2.65, 2.65]
			]) {
				const cx = x + dx + ox;
				const cy = y + dy + oy;
				if (cx > x + width - HALFTONE_DOT || cy > y + height - HALFTONE_DOT) continue;
				doc.circle(cx, cy, HALFTONE_DOT, 'F');
			}
		}
	}
}

export interface PosterHeadOptions {
	/** Plakat-Titel, wird in Versalien gesetzt (Akzentschrift). */
	title: string;
	/** Zeile unter dem Titel — welches Papier das ist. */
	subtitle?: string;
	/** Rechte Randnotiz, z. B. das Druckdatum. */
	note?: string;
	/** Höhe der Kopf-Fläche in mm. */
	height?: number;
}

/**
 * Grüner Halftone-Kopf mit hartem Tinte-Rahmen und Oswald-Titel.
 *
 * @returns y-Kante unter dem Kopf, ab der der Inhalt weitergeht.
 */
export function drawPosterHead(doc: jsPDF, options: PosterHeadOptions): number {
	const { title, subtitle, note, height = 24 } = options;
	const x = POSTER_MARGIN;
	const y = POSTER_MARGIN;
	const width = doc.internal.pageSize.getWidth() - POSTER_MARGIN * 2;

	fill(doc, POSTER_COLOR.gruen);
	doc.rect(x, y, width, height, 'F');
	drawHalftone(doc, x, y, width, height);
	stroke(doc, POSTER_COLOR.tinte, POSTER_LINE.container);
	doc.rect(x, y, width, height, 'S');

	doc.setFont(POSTER_FONT.accent, 'normal');
	doc.setFontSize(subtitle ? 22 : 24);
	ink(doc, POSTER_COLOR.weiss);
	letterSpace(doc, 0.2);
	doc.text(title.toUpperCase(), x + 6, y + (subtitle ? height / 2 + 1 : height / 2 + 3));
	letterSpace(doc, 0);

	if (subtitle) {
		doc.setFont(POSTER_FONT.body, 'bold');
		doc.setFontSize(9);
		letterSpace(doc, 0.35);
		doc.text(subtitle.toUpperCase(), x + 6, y + height - 6);
		letterSpace(doc, 0);
	}

	if (note) {
		doc.setFont(POSTER_FONT.body, 'bold');
		doc.setFontSize(9);
		ink(doc, POSTER_COLOR.gelb);
		doc.text(note, x + width - 6, y + height - 6, { align: 'right' });
	}

	doc.setFont(POSTER_FONT.body, 'normal');
	doc.setFontSize(9);
	ink(doc, POSTER_COLOR.tinte);
	return y + height + 8;
}

/**
 * Ist-Anteil am Soll für das Maßband: gedeckelt auf 0…1, ein Soll von 0 gilt
 * als voll (nichts zu besetzen ist nichts offen — dieselbe Regel wie
 * `<Ruler>`).
 */
export function rulerFillFraction(value: number, max: number): number {
	if (max <= 0) return 1;
	return Math.min(1, Math.max(0, value / max));
}

export interface PosterRulerOptions {
	x: number;
	y: number;
	width: number;
	/** Ist-Wert, z. B. besetzte Plätze. */
	value: number;
	/** Soll-Wert. */
	max: number;
	/** Höhe in mm; Standard entspricht der 19px-Variante der Vision. */
	height?: number;
}

/**
 * Maßband als Fortschrittsanzeige (DESIGN-VISION §4 „Maßband-Ruler"):
 * Tinte-Rahmen, gelbe Füllung, Zehntel-Skala, Ist-Marke als harter Strich.
 */
export function drawRuler(doc: jsPDF, options: PosterRulerOptions): void {
	const { x, y, width, value, max, height = 5 } = options;
	const fraction = rulerFillFraction(value, max);
	const filled = width * fraction;

	fill(doc, POSTER_COLOR.weiss);
	doc.rect(x, y, width, height, 'F');

	if (filled > 0) {
		fill(doc, POSTER_COLOR.gelbFill);
		doc.rect(x, y, filled, height, 'F');
	}

	// Zehntel-Striche der Skala, von der Unterkante herauf.
	stroke(doc, POSTER_COLOR.linie, POSTER_LINE.hair);
	for (let i = 1; i < 10; i++) {
		const tx = x + (width * i) / 10;
		doc.line(tx, y + height, tx, y + height - height * 0.45);
	}

	stroke(doc, POSTER_COLOR.tinte, POSTER_LINE.rule);
	doc.rect(x, y, width, height, 'S');

	// Ist-Marke: harter Tinte-Strich am erreichten Stand.
	stroke(doc, POSTER_COLOR.tinte, POSTER_LINE.container);
	const markX = Math.min(x + width - POSTER_LINE.container / 2, x + filled);
	doc.line(markX, y, markX, y + height);
}

export interface PosterStampOptions {
	x: number;
	y: number;
	label: string;
	/** Rahmen- und Textfarbe; Standard Grün. */
	tone?: 'gruen' | 'rot' | 'tinte';
	/** Schriftgröße in pt. */
	fontSize?: number;
}

/** Dreht einen Punkt um `deg` gegen den Uhrzeigersinn um `(cx, cy)`. */
function rotate(px: number, py: number, cx: number, cy: number, deg: number): [number, number] {
	const rad = (deg * Math.PI) / 180;
	const dx = px - cx;
	const dy = py - cy;
	// y wächst im PDF nach unten, darum das gespiegelte Vorzeichen.
	return [cx + dx * Math.cos(rad) + dy * Math.sin(rad), cy - dx * Math.sin(rad) + dy * Math.cos(rad)];
}

/** Neigung des Stempels in Grad (`.stamp--tilt-left` der Handschrift). */
const STAMP_TILT = 2;

/**
 * Stempel: Versalien in der Rahmenfarbe, leicht schräg in einem harten Rahmen
 * (DESIGN-VISION §4). `x`/`y` sind die linke obere Ecke des Rahmens.
 */
export function drawStamp(doc: jsPDF, options: PosterStampOptions): void {
	const { x, y, label, tone = 'gruen', fontSize = 9 } = options;
	const text = label.toUpperCase();
	const color = POSTER_COLOR[tone];

	doc.setFont(POSTER_FONT.accent, 'normal');
	doc.setFontSize(fontSize);
	letterSpace(doc, 0.3);

	const textWidth = doc.getTextWidth(text) + text.length * 0.3;
	const padX = 1.8;
	const padY = 1.2;
	const width = textWidth + padX * 2;
	// pt → mm (1pt = 0.3528mm); die Versalhöhe genügt als Zeilenmaß.
	const height = fontSize * 0.353 + padY * 2;

	// `rect` kann nicht schräg — der Rahmen entsteht darum als gedrehtes Viereck.
	const [start, ...corners] = (
		[
			[x, y],
			[x + width, y],
			[x + width, y + height],
			[x, y + height]
		] as [number, number][]
	).map(([px, py]) => rotate(px, py, x, y + height / 2, STAMP_TILT));

	stroke(doc, color, POSTER_LINE.card);
	let previous = start;
	const deltas = corners.map((corner) => {
		const delta: [number, number] = [corner[0] - previous[0], corner[1] - previous[1]];
		previous = corner;
		return delta;
	});
	doc.lines(deltas, start[0], start[1], [1, 1], 'S', true);

	ink(doc, color);
	const [tx, ty] = rotate(x + padX, y + height - padY - 0.4, x, y + height / 2, STAMP_TILT);
	doc.text(text, tx, ty, { angle: STAMP_TILT });

	letterSpace(doc, 0);
	doc.setFont(POSTER_FONT.body, 'normal');
	ink(doc, POSTER_COLOR.tinte);
}

export interface PosterSectionHeadingOptions {
	x: number;
	y: number;
	width: number;
	label: string;
	/** Rechte Beisatz-Zeile, z. B. eine Zählung. */
	note?: string;
}

/**
 * Sektionsüberschrift: Public Sans 700 in Versalien mit Sperrung, dahinter die
 * Punktraster-Linie (DESIGN-VISION §4).
 *
 * @returns y-Kante unter der Zeile.
 */
export function drawSectionHeading(doc: jsPDF, options: PosterSectionHeadingOptions): number {
	const { x, y, width, label, note } = options;
	const text = label.toUpperCase();

	doc.setFont(POSTER_FONT.body, 'bold');
	doc.setFontSize(10.5);
	letterSpace(doc, 0.3);
	ink(doc, POSTER_COLOR.tinte);
	const textWidth = doc.getTextWidth(text) + text.length * 0.3;
	doc.text(text, x, y);
	letterSpace(doc, 0);

	let ruleEnd = x + width;
	if (note) {
		doc.setFont(POSTER_FONT.body, 'normal');
		doc.setFontSize(8.5);
		ink(doc, POSTER_COLOR.tinteSoft);
		doc.text(note, x + width, y, { align: 'right' });
		ruleEnd = x + width - doc.getTextWidth(note) - 2;
	}

	// Punktraster-Linie im 8px-Raster (2.1mm) auf Grundlinienhöhe.
	fill(doc, POSTER_COLOR.linie);
	for (let dx = x + textWidth + 2; dx < ruleEnd; dx += 2.1) {
		doc.circle(dx, y - 1, 0.29, 'F');
	}

	doc.setFont(POSTER_FONT.body, 'normal');
	doc.setFontSize(9);
	ink(doc, POSTER_COLOR.tinte);
	return y + 4;
}

/**
 * Stil-Bündel für `autoTable`, damit alle drei Papiere dieselbe
 * Frachtbrief-Tabelle zeigen: eingebettete Schriften, Tinte-Gitter, grüner
 * Kopf, getönte Wechselzeilen.
 */
export function posterTableTheme(): UserOptions {
	return {
		theme: 'grid',
		styles: {
			font: POSTER_FONT.body,
			fontStyle: 'normal',
			fontSize: 8.5,
			textColor: [...POSTER_COLOR.tinte],
			fillColor: [...POSTER_COLOR.weiss],
			lineColor: [...POSTER_COLOR.tinte],
			lineWidth: POSTER_LINE.hair,
			cellPadding: { top: 1.4, right: 2, bottom: 1.4, left: 2 },
			overflow: 'linebreak',
			valign: 'top'
		},
		headStyles: {
			font: POSTER_FONT.body,
			fontStyle: 'bold',
			fontSize: 9,
			textColor: [...POSTER_COLOR.weiss],
			fillColor: [...POSTER_COLOR.gruen],
			lineColor: [...POSTER_COLOR.tinte],
			lineWidth: POSTER_LINE.card,
			cellPadding: { top: 2, right: 2, bottom: 2, left: 2 }
		},
		alternateRowStyles: { fillColor: [...POSTER_COLOR.fusszeile] },
		margin: { left: POSTER_MARGIN, right: POSTER_MARGIN }
	};
}

/**
 * Getönte Fußzeile mit Seitenzähler auf jeder Seite (DESIGN-VISION §4:
 * „grüner Halftone-Kopf → weiße Werkzeugfläche → getönte Fußzeile").
 */
export function drawPosterFooter(doc: jsPDF, label: string): void {
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const pages = (doc as jsPDF & { getNumberOfPages(): number }).getNumberOfPages();
	const height = 8;
	const top = pageHeight - height;

	for (let page = 1; page <= pages; page++) {
		doc.setPage(page);
		fill(doc, POSTER_COLOR.fusszeile);
		doc.rect(0, top, pageWidth, height, 'F');
		stroke(doc, POSTER_COLOR.linie, POSTER_LINE.hair);
		doc.line(0, top, pageWidth, top);

		doc.setFont(POSTER_FONT.body, 'normal');
		doc.setFontSize(7.5);
		ink(doc, POSTER_COLOR.tinteSoft);
		doc.text(`${label} — Seite ${page}/${pages}`, pageWidth / 2, top + 5.2, { align: 'center' });
	}

	ink(doc, POSTER_COLOR.tinte);
}
