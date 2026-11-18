import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/lib/lessons.js';
import { createReport } from '../src/lib/report.js';

const dataset = parseCsv('Componente;Tema;Recomendación;Página\nSocial;Gestión predial;Revisar y documentar los acuerdos;12', { name: 'Prueba.csv' });

test('genera un PDF válido y el anexo aumenta el número de páginas', () => {
  const doc = createReport({ dataset, records: dataset.records, filterLabels: ['Componente: Social'] });
  const withAnnex = createReport({ dataset, records: dataset.records, includeDetails: true });
  assert.equal(doc.output('arraybuffer').byteLength > 1000, true);
  assert.match(doc.output(), /^%PDF-1\.3/);
  assert.ok(withAnnex.getNumberOfPages() > doc.getNumberOfPages());
  assert.throws(() => createReport({ dataset, records: [] }), /No hay lecciones/);
});
