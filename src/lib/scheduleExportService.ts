import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';

export interface ScheduleExportOptions {
  festivalName: string;
  days: ScheduleDayWithPhases[];
  selectedDayIds: Set<string>;
  selectedPhaseIds: Set<string>;
  entryTypeFilter: 'all' | 'task' | 'program';
}

export function exportScheduleToPdf(options: ScheduleExportOptions): void {
  const { festivalName, days, selectedDayIds, selectedPhaseIds, entryTypeFilter } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 15;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(festivalName, pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Ablaufplan', pageWidth / 2, y, { align: 'center' });
  y += 12;

  const filteredDays = days.filter(d => selectedDayIds.has(d.id));

  for (const day of filteredDays) {
    // Check if we need a new page (leave enough space for at least a header + a few rows)
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 15;
    }

    // Day header
    const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('de-AT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const dayLabel = day.label ? `${formattedDate} (${day.label})` : formattedDate;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(dayLabel, margin, y);
    y += 2;
    // Draw a line under the day header
    doc.setDrawColor(100, 100, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const filteredPhases = day.phases.filter(p => selectedPhaseIds.has(p.id));

    for (const phase of filteredPhases) {
      // Filter entries by type
      const entries = phase.entries.filter(e => {
        if (entryTypeFilter === 'all') return true;
        return e.type === entryTypeFilter;
      });

      if (entries.length === 0) continue;

      // Check page space
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = 15;
      }

      // Phase header
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(phase.name, margin, y);
      y += 5;

      // Build table data
      const head = [['Zeit', 'Typ', 'Eintrag', 'Verantwortlich']];
      const body = entries.map(entry => {
        let timeStr = '\u2014';
        if (entry.start_time) {
          timeStr = entry.start_time.slice(0, 5);
          if (entry.end_time) timeStr += ` \u2013 ${entry.end_time.slice(0, 5)}`;
        }

        const typeStr = entry.type === 'task' ? 'Aufgabe' : 'Programm';

        const responsible = entry.responsible_member
          ? `${entry.responsible_member.last_name} ${entry.responsible_member.first_name}`
          : '\u2014';

        return [timeStr, typeStr, entry.title, responsible];
      });

      autoTable(doc, {
        startY: y,
        head: head,
        body: body,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          overflow: 'linebreak',
          valign: 'middle',
          lineWidth: 0.15,
          lineColor: [200, 200, 200],
        },
        headStyles: {
          fillColor: [55, 65, 81],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2.5,
        },
        columnStyles: {
          0: { cellWidth: 28, halign: 'center', font: 'courier' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 38 },
        },
        margin: { left: margin, right: margin },
        didParseCell: (hookData) => {
          if (hookData.section === 'body') {
            const text = hookData.cell.raw as string;
            // Color type badges
            if (hookData.column.index === 1) {
              if (text === 'Aufgabe') {
                hookData.cell.styles.fillColor = [236, 253, 245]; // emerald-50
                hookData.cell.styles.textColor = [4, 120, 87]; // emerald-700
                hookData.cell.styles.fontStyle = 'bold';
              } else if (text === 'Programm') {
                hookData.cell.styles.fillColor = [245, 243, 255]; // violet-50
                hookData.cell.styles.textColor = [109, 40, 217]; // violet-700
                hookData.cell.styles.fontStyle = 'bold';
              }
            }
            // Strikethrough for done entries
            if (hookData.column.index === 2 && hookData.row.index < body.length) {
              const entry = entries[hookData.row.index];
              if (entry && entry.status === 'done') {
                hookData.cell.styles.textColor = [156, 163, 175];
                hookData.cell.styles.fontStyle = 'italic';
              }
            }
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    y += 4; // Extra space between days
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${festivalName} \u2014 Ablaufplan \u2014 Seite ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const safeName = festivalName.replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df _-]/g, '').trim();
  doc.save(`${safeName}_Ablaufplan.pdf`);
}
