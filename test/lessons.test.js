import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ASSOCIATED_PROJECT, buildDataset, decodeCsv, describeFilters, filterRecords, GENERAL_PROJECT, getFindings, MAX_FILE_SIZE,
  parseCsv, readDataFile, REFERENCE_NAME, summarize, UNKNOWN_PROJECT,
} from '../src/lib/lessons.js';

const matrix = readFileSync(new URL('../src/data/lecciones-vej.csv', import.meta.url), 'utf8');
const reference = parseCsv(matrix, { name: REFERENCE_NAME, isReference: true });

test('la referencia mantiene sus cifras y los proyectos no incluyen recomendaciones generales', () => {
  const analysis = summarize(reference.records);
  assert.equal(reference.skipped, 0);
  assert.equal(analysis.total, 115);
  assert.equal(analysis.componentCount, 10);
  assert.equal(analysis.projectCount, 39);
  assert.equal(analysis.topicCount, 99);
  assert.deepEqual(analysis.scope, { project: 81, general: 34, unknown: 0 });
  assert.equal(analysis.components[0].count, 22);
  assert.equal(analysis.topTopic.count, 9);
  assert.equal(analysis.projects[0].name, 'Antioquia – Bolívar');
  assert.equal(analysis.projects[0].count, 12);
  assert.equal(analysis.leadCount, 61);
  assert.match(getFindings(analysis)[0].detail, /61 de 115/);
});

test('admite CSV de Excel Windows-1252, campos multilínea y una fila de título', () => {
  const csv = 'Introducción a la estructuración;;;;\r\nComponente;Tema;Recomendación;Proyectos;Página\r\nSocial;Consulta;"Revisión;\nAcción";"Corredor A\nCorredor B";5\r\n';
  const result = parseCsv(decodeCsv(Buffer.from(csv, 'latin1')));
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].recommendation, 'Revisión;\nAcción');
  assert.equal(result.records[0].projectEntries.length, 2);
  assert.equal(result.records[0].page, '5');
});

test('admite CSV UTF-8 con BOM y delimitadores coma o tabulación', () => {
  for (const delimiter of [',', '\t']) {
    const rows = [['Categoría', 'Temática', 'Lección aprendida'], ['Ambiental', 'Licenciamiento', 'Anotar razón']];
    const csv = rows.map((row) => row.join(delimiter)).join('\n');
    const result = parseCsv(decodeCsv(Buffer.from('\uFEFF' + csv)));
    assert.equal(result.records[0].recommendation, 'Anotar razón');
    assert.equal(result.records[0].projectScope, 'unknown');
    assert.equal(result.hasProjectColumn, false);
  }
});

test('admite UTF-16 con BOM', () => {
  const csv = '\uFEFFComponente;Tema;Recomendación\r\nSocial;Consulta;Planear reunión';
  const result = parseCsv(decodeCsv(Buffer.from(csv, 'utf16le')));
  assert.equal(result.records[0].recommendation, 'Planear reunión');
});

test('informa sobre filas incompletas/no estructuradas y rechaza archivos inválidos', () => {
  const result = parseCsv('Componente;Tema;Recomendación;Proyectos\nSocial;Bien;Texto;Bosque\nSocial;;Sin tema;\nAmbiental;Otro;Desborde;Corredor;Datos de más');
  assert.equal(result.records.length, 1);
  assert.equal(result.skipped, 2);
  assert.throws(() => parseCsv('Foo,Bar\n1,2'), /Componente, Tema y Recomendación/);
  assert.throws(() => parseCsv('Componente;Tema;Recomendación\nSocial;X;"incompleta'), /comillas mal formadas/);
  assert.throws(() => parseCsv('Componente;Tema;Recomendación\nSocial;;vacía'), /lecciones completas/);
});

test('combina proyecto, componente y términos de búsqueda insensibles a tildes', () => {
  const selected = filterRecords(reference.records, { component: 'social', project: 'antioquia bolivar', query: 'instalacion peajes' });
  assert.ok(selected.length > 0 && selected.length < 12);
  assert.ok(selected.every(({ component, projectScope, topic }) => component === 'Social' && projectScope === 'project' && topic.startsWith('Instalación')));
  assert.equal(filterRecords(reference.records, { project: ASSOCIATED_PROJECT }).length, 81);
  assert.equal(filterRecords(reference.records, { project: GENERAL_PROJECT }).length, 34);
  assert.equal(filterRecords(reference.records, { project: UNKNOWN_PROJECT }).length, 0);
  assert.equal(filterRecords(reference.records, { query: 'una-tarea-que-no-existe' }).length, 0);
  assert.deepEqual(describeFilters({ component: 'social', project: 'antioquia bolivar', query: 'peajes' }, summarize(reference.records)),
    ['Componente: Social', 'Proyecto: Antioquia – Bolívar', 'Búsqueda: «peajes»']);
});

test('cuenta un proyecto como máximo una vez por lección y separa sin dato de alcance general', () => {
  const result = buildDataset([
    ['Componente', 'Tema', 'Recomendación', 'Proyecto'],
    ['Social', 'Alcance', 'Texto', 'Santa Fe – Bogotá\nSanta Fe - Bogota'],
    ['social', 'General', 'Texto', 'Recomendación general, no se especifica un proyecto en particular.'],
    ['SOCIAL', 'Sin dato', 'Texto', 'N/A'],
    ['SOCIAL', 'Otro proyecto', 'Texto', 'General Santander'],
  ]);
  const analysis = summarize(result.records);
  assert.equal(analysis.componentCount, 1);
  assert.equal(analysis.projectCount, 2);
  assert.equal(analysis.projects[0].count, 1);
  assert.deepEqual(analysis.scope, { project: 2, general: 1, unknown: 1 });
  assert.deepEqual(summarize([]).scope, { project: 0, general: 0, unknown: 0 });
});

test('valida el tipo y el tamaño de archivos importados', async () => {
  await assert.rejects(readDataFile({ name: 'a.csv', size: MAX_FILE_SIZE + 1 }), /10 MB/);
  await assert.rejects(readDataFile({ name: 'a.xlsx', size: 0 }), /vacío/);
  await assert.rejects(readDataFile({ name: 'a.txt', size: 42 }), /Formato no compatible/);
});
