import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatNumber, formatPercent, formatDate, METRIC_DEFINITIONS, getFindings, summarize } from './lessons.js';

const INK = [28, 50, 39];
const MUTED = [78, 99, 86];
const GREEN = [37, 85, 62];
const PAPER = [239, 246, 237];
const ACCENT = [216, 238, 173];
const MARGIN = 17;
const BOTTOM = 279;
const CONTENT_WIDTH = 176;

const printable = (value) => String(value ?? '').replace(/\u202f|\u00a0/g, ' ').replace(/\t/g, '  ');

export function createReport({ dataset, records, filterLabels = [], includeDetails = false, now = new Date() }) {
  if (!records.length) throw new Error('No hay lecciones para incluir en el informe.');
  const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
  doc.setProperties({ title: 'Lecciones aprendidas de proyectos APP', subject: 'Informe de análisis', author: 'ANI Insights' });
  const metrics = summarize(records);
  let y = 20;

  function ensureSpace(mm) {
    if (y + mm <= BOTTOM) return;
    doc.addPage();
    y = 22;
  }

  function heading(title) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...INK);
    doc.text(title, MARGIN, y);
    y += 7;
  }

  function paragraph(value, { size = 10, color = MUTED, after = 3 } = {}) {
    doc.setFont('helvetica', 'normal').setFontSize(size).setTextColor(...color);
    const lines = doc.splitTextToSize(printable(value), CONTENT_WIDTH);
    const lineH = size * 0.46;
    for (const line of lines) {
      ensureSpace(lineH);
      doc.setFont('helvetica', 'normal').setFontSize(size).setTextColor(...color);
      doc.text(line, MARGIN, y);
      y += lineH;
    }
    y += after;
  }

  function table(head, body, overrides = {}) {
    autoTable(doc, {
      startY: y - 2,
      head: [head],
      body,
      margin: { left: MARGIN, right: MARGIN, top: 19, bottom: 19 },
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 2.4, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PAPER },
      ...overrides,
    });
    y = doc.lastAutoTable.finalY + 11;
  }

  doc.setFillColor(...GREEN).rect(0, 0, 210, 58, 'F');
  doc.setTextColor(...ACCENT).setFont('helvetica', 'bold').setFontSize(10);
  doc.text('ANI INSIGHTS  /  INTELIGENCIA VIAL', MARGIN, 16);
  doc.setTextColor(255, 255, 255).setFontSize(25);
  doc.text('Lecciones aprendidas', MARGIN, 32);
  doc.setFontSize(15);
  doc.text('de proyectos APP', MARGIN, 42);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...ACCENT);
  doc.text('Informe de análisis de la matriz de recomendaciones', MARGIN, 50);

  y = 68;
  paragraph(`Fecha de generación: ${formatDate(now)}`, { after: 2 });
  paragraph(`Fuente: ${dataset.name}`, { after: 2 });
  paragraph(filterLabels.length ? `Filtros: ${filterLabels.join(' | ')}` : 'Alcance: toda la fuente activa', { after: 2 });
  paragraph(`Selección: ${formatNumber(records.length)} de ${formatNumber(dataset.records.length)} lecciones de la fuente.`, { after: 6 });

  ensureSpace(32);
  for (const [i, { key, label }] of METRIC_DEFINITIONS.entries()) {
    const width = (CONTENT_WIDTH - 9) / 4;
    const x = MARGIN + (width + 3) * i;
    doc.setFillColor(...PAPER).roundedRect(x, y, width, 20, 2.5, 2.5, 'F');
    doc.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(17);
    doc.text(formatNumber(metrics[key]), x + 3.5, y + 8.6);
    doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(8.4);
    doc.text(doc.splitTextToSize(label, width - 7), x + 3.5, y + 14);
  }
  y += 31;

  heading('Lecciones por componente');
  table(['Componente', 'Lecciones', 'Participación'], metrics.components.map(({ name, count }) => [
    printable(name), formatNumber(count), printable(formatPercent(count / metrics.total)),
  ]), { columnStyles: { 0: { cellWidth: 114 }, 1: { halign: 'right' }, 2: { halign: 'right' } } });

  heading('Alcance de las lecciones');
  table(['Alcance', 'Lecciones', 'Participación'], [
    ['Con proyecto asociado', metrics.scope.project],
    ['De alcance general', metrics.scope.general],
    ['Sin dato de proyecto', metrics.scope.unknown],
  ].map(([label, count]) => [label, formatNumber(count), printable(formatPercent(count / metrics.total))]), {
    columnStyles: { 0: { cellWidth: 114 }, 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  heading('Hallazgos destacados');
  for (const { title, detail } of getFindings(metrics)) {
    ensureSpace(12);
    paragraph(`${title}. ${detail}`, { color: INK, after: 2 });
  }
  y += 6;

  if (metrics.projects.length) {
    const projectRows = metrics.projects.slice(0, 10).map(({ name, count }) => [printable(name), formatNumber(count)]);
    // Keep short rankings together so that the title and a single row aren't left at the foot of a page.
    doc.setFont('helvetica', 'normal').setFontSize(9);
    const rankingHeight = projectRows.reduce((height, [name]) => height + 4.8 + doc.splitTextToSize(name, 142).length * 3.7, 16);
    if (rankingHeight < 220) ensureSpace(rankingHeight);
    heading('Proyectos con más menciones');
    table(['Proyecto', 'Lecciones'], projectRows, {
      columnStyles: { 0: { cellWidth: 147 }, 1: { halign: 'right' } },
    });
  }

  heading('Notas de lectura');
  paragraph('Cada fila válida representa una lección. Los proyectos se cuentan por nombre, unificando variantes de escritura; una lección puede mencionar varios proyectos. Las frecuencias describen la matriz y no miden la gravedad ni la probabilidad de los riesgos.');
  if (dataset.skipped > 0) paragraph(`Se omitieron ${formatNumber(dataset.skipped)} filas con campos obligatorios vacíos o columnas fuera de la estructura.`);

  if (includeDetails) {
    doc.addPage();
    y = 24;
    heading('Anexo · Recomendaciones registradas');
    paragraph('Texto de la fuente activa con su componente, proyectos y referencia de página.', { after: 4 });
    table(['N.º', 'Tema y recomendación', 'Componente y fuente'], records.map((record) => [
      String(record.id),
      printable(`${record.topic}\n\n${record.recommendation}`),
      printable([record.component, record.projectSource || 'Sin dato de proyecto', record.page && `Pág. ${record.page}`].filter(Boolean).join('\n\n')),
    ]), {
      styles: { font: 'helvetica', fontSize: 8.3, textColor: INK, cellPadding: 2.4, overflow: 'linebreak', valign: 'top' },
      columnStyles: { 0: { cellWidth: 11 }, 1: { cellWidth: 112 }, 2: { cellWidth: 53 } },
      rowPageBreak: 'avoid',
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(218, 228, 220).setLineWidth(0.25).line(MARGIN, 282, 210 - MARGIN, 282);
    doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(8);
    doc.text('ANI Insights  ·  Lecciones de proyectos carreteros APP', MARGIN, 287);
    doc.text(`${i} / ${pages}`, 210 - MARGIN, 287, { align: 'right' });
  }
  return doc;
}

export function downloadReport(options) {
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  createReport({ ...options, now }).save(`informe-lecciones-ani-${date}.pdf`);
}
