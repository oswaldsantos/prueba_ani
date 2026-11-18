import { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpenText, ChevronLeft, ChevronRight, FileText, MapPin, Search, SearchX, X } from 'lucide-react';
import { compareText, EMPTY_FILTERS, formatNumber } from '../lib/lessons.js';
import { CloseButton, ComponentOptions, Modal, PageIntro, ProjectOptions, SelectField } from './ui.jsx';

const PAGE_SIZE = 10;

function ProjectCell({ record }) {
  if (record.projectScope === 'general') return <span className="general-label">Alcance general</span>;
  if (record.projectScope === 'unknown') return <span className="missing">—</span>;
  const [first, ...rest] = record.projectEntries;
  return <span className="project-cell" title={record.projectEntries.map(({ name }) => name).join('\n')}>
    <span>{first.name}</span>{rest.length > 0 && <span className="project-extra">+{formatNumber(rest.length)}</span>}
  </span>;
}

function LessonDetail({ record, dataset, onClose }) {
  return <Modal labelledBy="detail-title" className="detail-modal" onClose={onClose}>
    <header className="detail-top"><span><BookOpenText size={17} aria-hidden="true" /> LECCIÓN {String(record.id).padStart(2, '0')}</span><CloseButton onClick={onClose} /></header>
    <div className="detail-body">
      <h2 id="detail-title">{record.topic}</h2>
      <div className="detail-tags"><span className="component-tag">{record.component}</span>{record.page && <span className="page-tag"><FileText size={14} aria-hidden="true" /> Pág. {record.page}</span>}</div>
      <section><h3>Recomendación</h3><p className="verbatim">{record.recommendation}</p></section>
      <section><h3><MapPin size={17} aria-hidden="true" /> Proyectos en la fuente</h3><p className="verbatim">{record.projectSource || 'La fuente no especifica un proyecto para esta lección.'}</p></section>
      <div className="detail-source"><FileText size={16} aria-hidden="true" /><div><strong>Archivo de origen</strong><span>{dataset.name}</span></div></div>
    </div>
  </Modal>;
}

export default function Explorer({ dataset, sourceMetrics, records, filters, onFilters }) {
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState('source');
  const [detail, setDetail] = useState(null);
  const sorted = useMemo(() => {
    if (order === 'source') return records;
    const field = order === 'topic' ? 'topic' : 'component';
    return [...records].sort((a, b) => compareText(a[field], b[field]) || a.id - b.id);
  }, [records, order]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(pageCount, page);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);
  const filtered = Boolean(filters.component || filters.project || filters.query.trim());

  function change(changes) {
    setPage(1);
    onFilters({ ...filters, ...changes });
  }
  function clear() {
    setPage(1);
    onFilters(EMPTY_FILTERS);
  }

  return <div className="page secondary-page explorer-page">
    <PageIntro icon={BookOpenText} kicker="MATRIZ DE RECOMENDACIONES" title="Explorar lecciones"
      description="Busca en la matriz por tema, componente o proyecto y consulta las recomendaciones de cada lección." />
    <section className="panel explorer-panel" aria-label="Matriz de lecciones">
      <div className="explorer-filters">
        <label className="search-field">
          <span className="field-label">Búsqueda</span>
          <span className="search-control"><Search size={17} aria-hidden="true" />
            <input type="search" maxLength={160} value={filters.query} onChange={(event) => change({ query: event.target.value })} placeholder="Buscar en las lecciones…" />
          </span>
        </label>
        <SelectField label="Componente" value={filters.component} onChange={(event) => change({ component: event.target.value })}><ComponentOptions metrics={sourceMetrics} /></SelectField>
        <SelectField label="Proyecto o alcance" value={filters.project} onChange={(event) => change({ project: event.target.value })}><ProjectOptions metrics={sourceMetrics} /></SelectField>
      </div>
      <div className="table-toolbar">
        <div className="result-summary"><strong aria-live="polite">{formatNumber(records.length)} {records.length === 1 ? 'lección' : 'lecciones'}</strong>
          {filtered && <button className="text-button clear-filters" type="button" onClick={clear}><X size={14} aria-hidden="true" /> Limpiar filtros</button>}
        </div>
        <SelectField label="Orden de las lecciones" hideLabel className="select-small sort-field" value={order} onChange={(event) => { setOrder(event.target.value); setPage(1); }}>
          <option value="source">Orden de la fuente</option><option value="topic">Tema (A–Z)</option><option value="component">Componente (A–Z)</option>
        </SelectField>
      </div>
      {visible.length ? <>
        <div className="table-wrap"><table className="lesson-table">
          <thead><tr><th scope="col">Tema</th><th scope="col">Componente</th><th scope="col" className="col-project">Proyecto o alcance</th><th scope="col" className="col-page">Pág.</th><th scope="col" className="col-open"><span className="sr-only">Detalle</span></th></tr></thead>
          <tbody>{visible.map((record) => <tr key={record.id}>
            <td className="topic-cell"><button className="lesson-title" type="button" onClick={() => setDetail(record)} aria-label={`Lección ${record.id}: ${record.topic}`}>
              <span>{record.topic}</span><small className="recommendation-preview">{record.recommendation}</small></button><span className="component-mobile">{record.component}</span></td>
            <td className="col-component"><span className="component-tag">{record.component}</span></td>
            <td className="col-project"><ProjectCell record={record} /></td>
            <td className="col-page"><span className="page-cell">{record.page || '—'}</span></td>
            <td className="col-open"><button className="icon-button lesson-open" type="button" onClick={() => setDetail(record)} aria-label={`Ver detalle de la lección ${record.id}`}><ArrowUpRight size={16} aria-hidden="true" /></button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="pagination">
          <span>Mostrando {formatNumber(start + 1)}–{formatNumber(start + visible.length)} de {formatNumber(records.length)}</span>
          <div className="pagination-controls"><button className="icon-button" type="button" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
            <span>Página {formatNumber(currentPage)} de {formatNumber(pageCount)}</span>
            <button className="icon-button" type="button" aria-label="Página siguiente" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} aria-hidden="true" /></button></div>
        </div>
      </> : <div className="empty-state"><div className="empty-icon"><SearchX size={25} aria-hidden="true" /></div><h2>No encontramos lecciones</h2><p>Prueba con otra palabra clave o elimina los filtros para ver más resultados.</p><button type="button" className="button button-outline" onClick={clear}>Limpiar filtros</button></div>}
    </section>
    {detail && <LessonDetail record={detail} dataset={dataset} onClose={() => setDetail(null)} />}
  </div>;
}
