import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { POSTER_FONT } from '@/lib/pdfFonts';
import {
  POSTER_COLOR,
  POSTER_MARGIN,
  createPosterDoc,
  drawPosterFooter,
  drawPosterHead,
  drawSectionHeading,
  drawStamp,
  posterTableEnd,
  posterTableTheme
} from '@/lib/pdfPoster';
import type { ScheduleDayWithPhases, ScheduleEntryWithMember } from '@/lib/scheduleService';

export interface ScheduleExportOptions {
  festivalName: string;
  days: ScheduleDayWithPhases[];
  selectedDayIds: Set<string>;
  selectedPhaseIds: Set<string>;
  entryTypeFilter: 'all' | 'task' | 'program';
}

/**
 * Wie das Papier heißt: „Ablaufplan", unabhängig vom Filter.
 *
 * Der Ablaufplan besteht laut CONTEXT.md aus zwei Papieren — der internen
 * Aufgaben-Werkliste und dem Programmzettel zum Aushang. Dieses Papier ist
 * keins von beiden: es zeigt Phasen und Verantwortliche, die der Programmzettel
 * ausdrücklich nicht tragen darf (ADR 0007). Es „Programmzettel" zu nennen, nur
 * weil auf Programmpunkte gefiltert ist, wäre eine falsche Aufschrift. Das
 * Aufspalten in die zwei echten Papiere gehört in den Bereich Ablaufplan (#67).
 */
const PAPER_TITLE = 'Ablaufplan';

/** Baut den Ablaufplan als Plakat; das Speichern macht {@link exportScheduleToPdf}. */
export function buildSchedulePdf(options: ScheduleExportOptions): jsPDF {
  const { festivalName, days, selectedDayIds, selectedPhaseIds, entryTypeFilter } = options;

  const doc = createPosterDoc({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = POSTER_MARGIN;
  const width = pageWidth - margin * 2;
  let y = drawPosterHead(doc, {
    title: festivalName,
    subtitle: PAPER_TITLE
  });

  const filteredDays = days.filter(d => selectedDayIds.has(d.id));

  for (const day of filteredDays) {
    // Check if we need a new page (leave enough space for at least a header + a few rows)
    if (y > doc.internal.pageSize.getHeight() - 45) {
      doc.addPage();
      y = POSTER_MARGIN;
    }

    // Day header
    const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('de-AT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    y = drawSectionHeading(doc, {
      x: margin,
      y: y + 2,
      width,
      label: formattedDate,
      note: day.label ?? undefined
    }) + 3;

    const filteredPhases = day.phases.filter(p => selectedPhaseIds.has(p.id));

    for (const phase of filteredPhases) {
      // Filter entries by type
      const entries = phase.entries.filter(e => {
        if (entryTypeFilter === 'all') return true;
        return e.type === entryTypeFilter;
      });

      if (entries.length === 0) continue;

      // Check page space
      if (y > doc.internal.pageSize.getHeight() - 35) {
        doc.addPage();
        y = POSTER_MARGIN;
      }

      // Phase header — Akzentschrift, davor der Stempel, wenn alles steht.
      const done = entries.filter(e => e.status === 'done').length;
      doc.setFont(POSTER_FONT.accent, 'normal');
      doc.setFontSize(12);
      doc.setTextColor(...POSTER_COLOR.tinte);
      doc.text(phase.name.toUpperCase(), margin, y);
      if (done === entries.length) {
        // Rechts am Seitenrand angeschlagen — ein langer Phasenname würde den
        // Stempel sonst über den Rahmen hinausschieben.
        drawStamp(doc, {
          x: margin + width,
          y: y - 3.6,
          label: 'Erledigt',
          tone: 'gruen',
          align: 'right'
        });
      }
      y += 3;

      // Build table data
      const head = [['Zeit', 'Typ', 'Eintrag', 'Verantwortlich']];
      const body = entries.map(entry => {
        let timeStr = '—';
        if (entry.start_time) {
          timeStr = entry.start_time.slice(0, 5);
          if (entry.end_time) timeStr += ` – ${entry.end_time.slice(0, 5)}`;
        }

        const typeStr = entry.type === 'task' ? 'Aufgabe' : 'Programm';

        const responsible = entry.responsible_helper
          ? `${entry.responsible_helper.last_name} ${entry.responsible_helper.first_name}`
          : '\u2014';

        return [timeStr, typeStr, entry.title, responsible];
      });

      const theme = posterTableTheme();
      autoTable(doc, {
        ...theme,
        startY: y,
        head: head,
        body: body,
        columnStyles: {
          // Uhrzeiten sind ein Fall für die Akzentschrift (Vision §4).
          0: { cellWidth: 28, halign: 'center', font: POSTER_FONT.accent, fontSize: 10 },
          1: { cellWidth: 24, halign: 'center', fontSize: 7.5 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 38 }
        },
        didParseCell: (hookData) => {
          if (hookData.section !== 'body') return;
          const entry: ScheduleEntryWithMember | undefined = entries[hookData.row.index];
          // Typ als Wertmarke: Aufgabe getönt, Programm in Gelb. Der Ton muss
          // dunkler sein als die Wechselzeile, sonst verschwindet die Marke.
          if (hookData.column.index === 1) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor =
              hookData.cell.raw === 'Aufgabe'
                ? [...POSTER_COLOR.papierGetoent]
                : [...POSTER_COLOR.gelb];
          }
          // Erledigtes tritt zurück, statt zu verschwinden.
          if (entry?.status === 'done') {
            hookData.cell.styles.textColor = [...POSTER_COLOR.tinteSoft];
          }
        }
      });

      y = posterTableEnd(doc) + 7;
    }

    y += 3; // Extra space between days
  }

  drawPosterFooter(doc, `${festivalName} — ${PAPER_TITLE}`);
  return doc;
}

export function exportScheduleToPdf(options: ScheduleExportOptions): void {
  const safeName = options.festivalName.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
  buildSchedulePdf(options).save(`${safeName}_Ablaufplan.pdf`);
}
