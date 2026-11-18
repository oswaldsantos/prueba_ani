import { CircleHelp, FileDown, FileSpreadsheet, FileText, LoaderCircle, ShieldCheck } from 'lucide-react';
import { formatNumber, METRIC_DEFINITIONS } from '../lib/lessons.js';
import { PageIntro, RoadMark } from './ui.jsx';

export default function Reports({ dataset, metrics, labelFilters, selectionTotal, scope, onScope, includeDetails, onIncludeDetails, onExport, exporting }) {
  const hasSelection = labelFilters.length > 0;
  const filtersUsed = scope === 'selection' ? labelFilters : [];
  return <div className="page secondary-page reports-page">
    <PageIntro icon={FileText} kicker="DOCUMENTOS DE ANÁLISIS" title="Reportes PDF"
      description="Descarga un informe con los indicadores y hallazgos de la fuente activa. Puedes añadir las recomendaciones como anexo." />
    <div className="reports-grid">
      <section className="panel report-controls" aria-labelledby="config-title">
        <header className="panel-heading"><div><h2 id="config-title">Configurar informe</h2><p>Elige qué quieres incluir en el PDF.</p></div></header>
        <div className="report-source"><span className="report-source-icon"><FileSpreadsheet size={19} aria-hidden="true" /></span>
          <div><span>Fuente activa</span><strong title={dataset.name}>{dataset.name}</strong></div></div>
        <fieldset className="report-options">
          <legend>Alcance del informe</legend>
          <label className="option-card"><input type="radio" name="report-scope" checked={scope === 'all'} onChange={() => onScope('all')} />
            <span><strong>Toda la fuente</strong><span>{formatNumber(dataset.records.length)} {dataset.records.length === 1 ? 'lección' : 'lecciones'} de la matriz activa</span></span></label>
          <label className={`option-card${!hasSelection ? ' option-disabled' : ''}`}><input type="radio" name="report-scope" checked={scope === 'selection'} disabled={!hasSelection} onChange={() => onScope('selection')} />
            <span><strong>Selección filtrada</strong><span>{hasSelection ? `${formatNumber(selectionTotal)} ${selectionTotal === 1 ? 'lección coincide' : 'lecciones coinciden'} con los filtros activos` : 'Aplica filtros en el panel o en el explorador'}</span></span></label>
        </fieldset>
        <label className="option-card append-option"><input type="checkbox" checked={includeDetails} onChange={(event) => onIncludeDetails(event.target.checked)} />
          <span><strong>Incluir anexo de recomendaciones</strong><span>Añade el texto, los proyectos y las páginas de cada lección del informe.</span></span></label>
        {metrics.total === 0 && <p className="report-empty"><CircleHelp size={16} aria-hidden="true" /> La selección no tiene resultados. Elige toda la fuente o cambia los filtros.</p>}
        <button type="button" className="button button-primary report-download" disabled={!metrics.total || exporting} onClick={onExport}>
          {exporting ? <LoaderCircle size={17} className="spinner" aria-hidden="true" /> : <FileDown size={17} aria-hidden="true" />}{exporting ? 'Generando informe…' : 'Descargar informe PDF'}</button>
        <p className="private-note"><ShieldCheck size={15} aria-hidden="true" /> El PDF se genera en tu navegador.</p>
      </section>
      <section className="panel report-preview" aria-labelledby="preview-title">
        <header className="panel-heading"><div><h2 id="preview-title">Contenido del PDF</h2><p>Resumen de lo que incluirá tu descarga.</p></div><span className="file-badge">PDF</span></header>
        <div className="report-preview-stage">
          <article className="report-sheet" aria-label="Vista previa del contenido">
            <div className="sheet-heading"><RoadMark /><div><span>ANI INSIGHTS</span><strong>Lecciones de proyectos APP</strong></div></div>
            <div className="sheet-content">
              <p className="sheet-kicker">INFORME DE ANÁLISIS</p>
              <h3>{filtersUsed.length ? 'Selección filtrada' : 'Resumen de la fuente activa'}</h3>
              {filtersUsed.length > 0 && <ul className="sheet-filters">{filtersUsed.map((filter) => <li key={filter}>{filter}</li>)}</ul>}
              <dl className="sheet-metrics">{METRIC_DEFINITIONS.map(({ label, key }) => <div key={key}><dt>{label}</dt><dd>{formatNumber(metrics[key])}</dd></div>)}</dl>
              <ul className="sheet-sections">
                <li>Distribución por componente y alcance</li>
                <li>Hallazgos destacados y proyectos mencionados</li>
                <li>Fuente, filtros y notas de lectura</li>
                {includeDetails && <li>Anexo de recomendaciones registradas</li>}
              </ul>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>;
}
