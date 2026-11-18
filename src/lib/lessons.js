import Papa from 'papaparse';

export const REFERENCE_NAME = 'LECCIONES APRENDIDAS VEJ 8feb24.csv';
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_RECORDS = 20_000;
export const ASSOCIATED_PROJECT = ':associated';
export const GENERAL_PROJECT = ':general';
export const UNKNOWN_PROJECT = ':unknown';
export const EMPTY_FILTERS = { query: '', component: '', project: '' };

const numberFormat = new Intl.NumberFormat('es-CO');
const percentFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });
const collator = new Intl.Collator('es-CO', { sensitivity: 'base', numeric: true });
export const formatNumber = (value) => numberFormat.format(value);
export const formatPercent = (value) => `${percentFormat.format(value * 100)}\u00a0%`;
export const formatDate = (value) => dateFormat.format(value);
export const compareText = (a, b) => collator.compare(a, b);

const text = (value) => String(value ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
const inline = (value) => text(value).replace(/\s+/g, ' ');
export const fold = (value) => inline(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const words = (value) => fold(value).replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
const headerLimit = 50;
const required = ['component', 'topic', 'recommendation'];

function identifyHeader(value) {
  const key = words(value);
  if (/^(componentes?|categorias?|dimension(?:es)?|areas?)(?:$| )/.test(key)) return 'component';
  if (/^(temas?|tematicas?|problematicas?|asuntos?|titulos?)(?:$| )/.test(key)) return 'topic';
  if (/^(recomendacion(?:es)?|comentarios?|acciones recomendadas|leccion(?:es)? aprendidas?)(?:$| )/.test(key)) return 'recommendation';
  if (/^(proyectos?|corredor(?:es)?|concesiones|concesion)(?:$| )/.test(key)) return 'project';
  if (/^(paginas?|pag|referencias?)(?:$| )/.test(key)) return 'page';
  return null;
}

function headerMap(row) {
  const columns = {};
  for (const [index, value] of row.entries()) {
    const key = identifyHeader(value);
    if (key && columns[key] == null) columns[key] = index;
  }
  return columns;
}

function locateHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, headerLimit); i++) {
    const columns = headerMap(rows[i]);
    if (required.every((field) => columns[field] != null)) return { index: i, columns };
  }
  return null;
}

// Only explicit spelling variants from the reference matrix are joined here.
// Related corridors or phases with different names remain separate.
const aliases = new Map();
for (const [canonical, ...variants] of [
  ['Autopistas del Caribe – Corredor de carga Cartagena – Barranquilla', 'Autopista del Caribe corredor de carga Cartagena - Barranquilla'],
  ['IP Vías del Nus', 'Vías del NUS'],
  ['Transversal del Sisga', 'Proyecto Transversal del Sisga'],
  ['Troncal Magdalena II', 'Troncal del Magdalena II'],
  ['Tercer Carril Doble Calzada Bogotá – Girardot', 'Tercer carril Bogotá - Girardot'],
  ['Autopista Conexión Pacífico 1', 'Pacífico 1', 'Autopista Concesión Pacífico 1'],
  ['IP Chirajara – Fundadores', 'Proyecto Chirajara - Fundadores', 'IP Chirajara – Fundadores (Corredor Bogotá – Villavicencio)'],
]) {
  for (const variant of [canonical, ...variants]) aliases.set(words(variant), canonical);
}

function parseProjects(projectSource) {
  const entries = new Map();
  let general = false;
  for (const entry of projectSource.split(/[\n;|]+/)) {
    const label = inline(entry);
    const key = words(label);
    if (!key || /^(?:n a|na|no aplica|sin dato|sin datos|sin informacion|no disponible|no especificado|sin especificar|no especifica)$/.test(key)) continue;
    if (key === 'general' || /^(?:recomendacion general|recomendaciones generales|(?:de )?alcance general|no se especifica (?:un )?proyecto)(?:$| )/.test(key)) {
      general = true;
      continue;
    }
    // The source lists this event alongside Pacífico 1. Retain it verbatim in the detail, not as a distinct project.
    if (key.startsWith('sinifana derrumbe de gran magnitud')) continue;
    const name = aliases.get(key) ?? label.replace(/[:.]$/, '');
    const canonicalKey = words(name);
    if (!entries.has(canonicalKey)) entries.set(canonicalKey, { key: canonicalKey, name });
  }
  return {
    projectEntries: [...entries.values()],
    projectScope: entries.size ? 'project' : general ? 'general' : 'unknown',
  };
}

export function buildDataset(rows, { name = 'Archivo importado', isReference = false, strictColumns = false } = {}) {
  const header = locateHeader(rows);
  if (!header) {
    throw new Error('No encontramos las columnas Componente, Tema y Recomendación. Verifica los encabezados o usa la plantilla CSV.');
  }
  const { index: headerIndex, columns } = header;
  const headings = rows[headerIndex].map(words);
  const records = [];
  const componentNames = new Map();
  const projectNames = new Map();
  let skipped = 0;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((value) => text(value))) continue;
    if (required.every((field) => words(row[columns[field]]) === headings[columns[field]])) continue;
    const componentText = inline(row[columns.component]);
    const componentKey = fold(componentText);
    const topic = inline(row[columns.topic]);
    const recommendation = text(row[columns.recommendation]);
    if (!componentText || !topic || !recommendation || (strictColumns && row.slice(rows[headerIndex].length).some(text))) {
      skipped++;
      continue;
    }
    if (records.length >= MAX_RECORDS) throw new Error('El archivo supera el límite de 20.000 lecciones. Divídelo en varios archivos e importa uno a la vez.');
    if (!componentNames.has(componentKey)) componentNames.set(componentKey, componentText);
    const component = componentNames.get(componentKey);
    const projectSource = text(row[columns.project]);
    const { projectEntries, projectScope } = parseProjects(projectSource);
    for (const entry of projectEntries) {
      if (!projectNames.has(entry.key)) projectNames.set(entry.key, entry.name);
      entry.name = projectNames.get(entry.key);
    }
    const page = inline(row[columns.page]);
    records.push({
      id: records.length + 1,
      component, componentKey, topic, recommendation, projectSource, projectEntries, projectScope, page,
      searchText: words([component, topic, recommendation, projectSource, ...projectEntries.map(({ name: label }) => label), page].join(' ')),
    });
  }
  if (!records.length) throw new Error('No encontramos lecciones completas. Incluye al menos una fila con Componente, Tema y Recomendación.');
  return { name, records, isReference, skipped, hasProjectColumn: columns.project != null, hasPageColumn: columns.page != null };
}

export function decodeCsv(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function parseCsv(csv, options) {
  if (!text(csv)) throw new Error('El archivo está vacío. Selecciona un CSV con lecciones registradas.');
  for (const delimiter of [';', ',', '\t']) {
    const config = { delimiter, skipEmptyLines: 'greedy' };
    const preview = Papa.parse(csv, { ...config, preview: headerLimit });
    if (!locateHeader(preview.data)) continue;
    const parsed = Papa.parse(csv, config);
    if (parsed.errors.length) throw new Error('El CSV contiene campos con comillas mal formadas. Guarda de nuevo el archivo como CSV e inténtalo otra vez.');
    return buildDataset(parsed.data, { ...options, strictColumns: true });
  }
  return buildDataset([], options);
}

export async function readDataFile(file) {
  if (!file) return null;
  if (file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite de 10 MB. Reduce su tamaño y vuelve a intentarlo.');
  if (!file.size) throw new Error('El archivo está vacío. Selecciona un archivo con lecciones registradas.');
  const options = { name: file.name };
  if (/\.csv$/i.test(file.name)) return parseCsv(decodeCsv(await file.arrayBuffer()), options);
  if (/\.xlsx$/i.test(file.name)) {
    let rows;
    try {
      const { readSheet } = await import('read-excel-file/browser');
      rows = await readSheet(file, 1);
    } catch {
      throw new Error('No se pudo leer la primera hoja del Excel. Asegúrate de que sea un archivo .xlsx válido y no esté protegido.');
    }
    return buildDataset(rows, options);
  }
  throw new Error('Formato no compatible. Selecciona un archivo CSV o Excel (.xlsx).');
}

function bump(map, key, name) {
  if (!map.has(key)) map.set(key, { key, name, count: 0 });
  map.get(key).count++;
}

const ranking = (map) => [...map.values()].sort((a, b) => b.count - a.count || compareText(a.name, b.name));

export function summarize(records) {
  const byComponent = new Map();
  const byProject = new Map();
  const byTopic = new Map();
  const scope = { project: 0, general: 0, unknown: 0 };
  for (const record of records) {
    bump(byComponent, record.componentKey, record.component);
    bump(byTopic, fold(record.topic).replace(/[.?!]+$/, ''), record.topic);
    for (const { key, name } of record.projectEntries) bump(byProject, key, name);
    scope[record.projectScope]++;
  }
  const components = ranking(byComponent);
  const projects = ranking(byProject);
  const total = records.length;
  const lead = components.slice(0, 3);
  const leadCount = lead.reduce((sum, { count }) => sum + count, 0);
  return {
    total, components, projects, scope, lead, leadCount,
    componentCount: components.length, projectCount: projects.length, topicCount: byTopic.size,
    projectShare: total ? scope.project / total : 0,
    leadShare: total ? leadCount / total : 0,
    topTopic: ranking(byTopic)[0] ?? null,
  };
}

export function filterRecords(records, { query = '', component = '', project = '' } = {}) {
  const terms = words(query).split(' ').filter(Boolean);
  const scope = project === ASSOCIATED_PROJECT ? 'project' : project === GENERAL_PROJECT ? 'general' : project === UNKNOWN_PROJECT ? 'unknown' : '';
  return records.filter((record) =>
    (!component || record.componentKey === component) &&
    (!project || (scope ? record.projectScope === scope : record.projectEntries.some(({ key }) => key === project))) &&
    terms.every((term) => record.searchText.includes(term))
  );
}

export function describeFilters(filters, metrics) {
  const labels = [];
  if (filters?.component) labels.push(`Componente: ${metrics.components.find(({ key }) => key === filters.component)?.name ?? filters.component}`);
  if (filters?.project === ASSOCIATED_PROJECT) labels.push('Alcance: lecciones con proyecto asociado');
  else if (filters?.project === GENERAL_PROJECT) labels.push('Alcance: recomendaciones generales');
  else if (filters?.project === UNKNOWN_PROJECT) labels.push('Alcance: sin dato de proyecto');
  else if (filters?.project) labels.push(`Proyecto: ${metrics.projects.find(({ key }) => key === filters.project)?.name ?? filters.project}`);
  if (filters?.query?.trim()) labels.push(`Búsqueda: «${filters.query.trim()}»`);
  return labels;
}

export function getFindings(metrics) {
  if (!metrics.total) return [];
  const { lead, leadCount, leadShare, topTopic, projects } = metrics;
  const list = new Intl.ListFormat('es-CO');
  const findings = [];
  if (lead.length > 1) {
    findings.push({
      title: `${formatPercent(leadShare)} de las lecciones en ${lead.length} componentes`,
      detail: `${list.format(lead.map(({ name }) => name))} reúnen ${formatNumber(leadCount)} de ${formatNumber(metrics.total)} lecciones en este análisis.`,
    });
  } else {
    findings.push({
      title: `Componente ${lead[0].name}`,
      detail: `El análisis incluye ${formatNumber(leadCount)} ${leadCount === 1 ? 'lección' : 'lecciones'} de este componente.`,
    });
  }
  if (topTopic?.count > 1) findings.push({ title: 'Tema más recurrente', detail: `«${topTopic.name}» aparece en ${formatNumber(topTopic.count)} lecciones.` });
  if (projects[0]) {
    const top = projects[0];
    const tied = projects.filter(({ count }) => count === top.count).length;
    findings.push({
      title: tied === 1 ? 'Proyecto con más menciones' : 'Proyectos con más menciones',
      detail: tied === 1 ? `${top.name} aparece en ${formatNumber(top.count)} ${top.count === 1 ? 'lección' : 'lecciones'}.` : `${formatNumber(tied)} proyectos aparecen en ${formatNumber(top.count)} ${top.count === 1 ? 'lección' : 'lecciones'} cada uno, la frecuencia más alta de esta selección.`,
    });
  }
  return findings;
}

export const METRIC_DEFINITIONS = [
  { key: 'total', label: 'Lecciones registradas' },
  { key: 'componentCount', label: 'Componentes' },
  { key: 'projectCount', label: 'Proyectos mencionados' },
  { key: 'topicCount', label: 'Temas identificados' },
];

export function downloadTemplate() {
  const csv = '\uFEFFComponente;Tema;Recomendación;Proyectos;Página\r\nSocial;Socialización con comunidades;Documentar los acuerdos antes de iniciar las obras.;Corredor de ejemplo;3\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla-lecciones-ani.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
