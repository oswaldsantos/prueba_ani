import { useState } from 'react';
import { ArrowRight, ArrowUpRight, ChartNoAxesColumnIncreasing, Info, Lightbulb, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ASSOCIATED_PROJECT, formatNumber, formatPercent, GENERAL_PROJECT, getFindings, UNKNOWN_PROJECT } from '../lib/lessons.js';
import { ComponentOptions, MetricGrid, SelectField } from './ui.jsx';

function Hero() {
  return <section className="hero" aria-labelledby="dashboard-title">
    <div className="hero-body">
      <div className="hero-eyebrow"><Sparkles size={13} strokeWidth={1.9} aria-hidden="true" /> INTELIGENCIA DE PROYECTOS</div>
      <h1 id="dashboard-title">Lecciones aprendidas<br /><span>de proyectos APP</span></h1>
      <p>Explora las recomendaciones de la ANI para la estructuración de futuros proyectos carreteros.</p>
    </div>
    <div className="hero-caption"><MapPin size={13} aria-hidden="true" /> RED VIAL · COLOMBIA</div>
  </section>;
}

function chartScale(highest) {
  const roughStep = highest / 5;
  const order = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const step = Math.ceil(roughStep / order) * order || 1;
  const max = Math.ceil(highest / step) * step || step;
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}

function ComponentChart({ metrics, onComponent }) {
  const [limit, setLimit] = useState('6');
  const { max, ticks } = chartScale(metrics.components[0]?.count ?? 0);
  const rows = limit === 'all' ? metrics.components : metrics.components.slice(0, 6);
  return <article className="panel chart-panel component-chart">
    <header className="panel-heading">
      <div><h3>Lecciones por componente</h3><p>Número de recomendaciones en cada componente.</p></div>
      {metrics.componentCount > 6 && <SelectField label="Componentes visibles en la gráfica" hideLabel className="select-small" value={limit} onChange={(event) => setLimit(event.target.value)}>
        <option value="6">Top 6</option><option value="all">Todos</option>
      </SelectField>}
    </header>
    {rows.length > 0 ? <div className="bar-chart">
      <div className="bar-rows">
        {rows.map(({ key, name, count }) => <button className="bar-row" type="button" key={key} onClick={() => onComponent(key)}
          aria-label={`${name}: ${formatNumber(count)} ${count === 1 ? 'lección' : 'lecciones'}. Ver en el explorador.`}>
          <span className="bar-label" title={name}>{name}</span>
          <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ width: `${count / max * 100}%` }} /></span>
          <span className="bar-value" aria-hidden="true">{formatNumber(count)}</span>
        </button>)}
      </div>
      <div className="bar-axis" aria-hidden="true"><span /><div>{ticks.map((tick) => <span key={tick}>{formatNumber(tick)}</span>)}</div><span /></div>
    </div> : <div className="chart-empty"><ChartNoAxesColumnIncreasing size={25} aria-hidden="true" /> No hay lecciones para mostrar.</div>}
  </article>;
}

const scopeGroups = [
  { key: 'project', filter: ASSOCIATED_PROJECT, label: 'Con proyecto', color: '#2c684c' },
  { key: 'general', filter: GENERAL_PROJECT, label: 'De alcance general', color: '#b6d49a' },
  { key: 'unknown', filter: UNKNOWN_PROJECT, label: 'Sin dato de proyecto', color: '#dce5e2' },
];

function ScopeChart({ metrics, onScope }) {
  const groups = scopeGroups.filter(({ key }) => metrics.scope[key] > 0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <article className="panel chart-panel scope-chart">
    <header className="panel-heading"><div><h3>Alcance de las lecciones</h3><p>Vinculación con proyectos específicos.</p></div></header>
    <div className="scope-body">
      <div className="donut" aria-hidden="true">
        <svg viewBox="0 0 144 144" width="144" height="144">
          <circle cx="72" cy="72" r={radius} fill="none" stroke="#edf1ed" strokeWidth="18" />
          {groups.map(({ key, color }) => {
            const length = metrics.scope[key] / metrics.total * circumference;
            const gap = groups.length > 1 ? Math.min(4, length / 2) : 0;
            const dash = length - gap;
            const start = offset + gap / 2;
            offset += length;
            return <circle key={key} cx="72" cy="72" r={radius} fill="none" transform="rotate(-90 72 72)" stroke={color} strokeWidth="18"
              strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-start} />;
          })}
        </svg>
        <div className="donut-center"><strong>{formatNumber(metrics.total)}</strong><span>{metrics.total === 1 ? 'lección' : 'lecciones'}</span></div>
      </div>
      <ul className="scope-legend" aria-label={`Distribución de ${formatNumber(metrics.total)} lecciones`}>
        {(groups.length ? groups : scopeGroups.slice(0, 2)).map(({ key, filter, label, color }) => <li key={key}>
          <button className="legend-button" type="button" onClick={() => onScope(filter)} disabled={metrics.scope[key] === 0}
            aria-label={`${label}: ${formatNumber(metrics.scope[key])}. Ver en el explorador.`}>
            <span className="legend-dot" style={{ backgroundColor: color }} aria-hidden="true" />
            <span><span className="legend-label">{label}</span>
              <span className="legend-value"><strong>{formatNumber(metrics.scope[key])}</strong><span className="legend-percent">{formatPercent(metrics.total ? metrics.scope[key] / metrics.total : 0)}</span></span>
            </span>
          </button>
        </li>)}
      </ul>
    </div>
    <footer className="chart-footnote"><Info size={15} aria-hidden="true" /><span>Una lección puede mencionar varios proyectos.</span></footer>
  </article>;
}

function Insights({ metrics, onProject, onExplore }) {
  const findings = getFindings(metrics);
  const primary = findings[0];
  const topic = findings.find(({ title }) => title === 'Tema más recurrente');
  return <section className="insights" aria-labelledby="findings-heading">
    <header className="section-heading">
      <div><h2 id="findings-heading">Hallazgos destacados</h2><p>Patrones para orientar la revisión de las lecciones.</p></div>
      <button className="button button-outline" type="button" onClick={onExplore}>Explorar lecciones <ArrowRight size={16} aria-hidden="true" /></button>
    </header>
    <div className="insights-grid">
      <article className="panel finding-card">
        <div className="finding-label"><Lightbulb size={16} aria-hidden="true" /> PATRÓN PRINCIPAL</div>
        <h3>{primary?.title ?? 'Sin lecciones en esta selección'}</h3>
        <p>{primary?.detail ?? 'Cambia el filtro para explorar otra parte de la fuente activa.'}</p>
        {topic && <div className="finding-topic"><strong>{topic.title}</strong><p>{topic.detail}</p></div>}
      </article>
      <article className="panel project-card">
        <header className="panel-heading"><div><h3>Proyectos más mencionados</h3><p>Proyectos que aparecen en más lecciones.</p></div></header>
        {metrics.projects.length ? <ul className="project-ranking">
          {metrics.projects.slice(0, 5).map(({ key, name, count }, index) => <li key={key}>
            <button type="button" onClick={() => onProject(key)} aria-label={`${name}: ${formatNumber(count)} ${count === 1 ? 'lección' : 'lecciones'}. Ver en el explorador.`}>
              <span className="rank-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="rank-name">{name}</span>
              <span className="rank-count" aria-hidden="true">{formatNumber(count)}</span><ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </li>)}
        </ul> : <p className="project-empty">No hay proyectos asociados a esta selección.</p>}
      </article>
    </div>
    <p className="method-note"><Info size={15} aria-hidden="true" /> Cada fila válida cuenta como una lección. Las frecuencias no indican la severidad ni la probabilidad de un riesgo.</p>
  </section>;
}

export default function Dashboard({ metrics, sourceMetrics, component, onFilter, onComponent, onProject, onExplore }) {
  return <div className="page dashboard-page">
    <Hero />
    <section className="overview-summary" aria-labelledby="summary-heading">
      <header className="section-heading">
        <div><h2 id="summary-heading">Resumen del análisis</h2><p>Indicadores de la fuente de datos activa.</p></div>
        <SelectField label="Filtrar el resumen por componente" hideLabel icon={SlidersHorizontal} className="overview-filter"
          value={component} onChange={(event) => onFilter(event.target.value)}><ComponentOptions metrics={sourceMetrics} /></SelectField>
      </header>
      <MetricGrid metrics={metrics} />
    </section>
    <div className="charts-grid">
      <ComponentChart metrics={metrics} onComponent={onComponent} />
      <ScopeChart metrics={metrics} onScope={onProject} />
    </div>
    <Insights metrics={metrics} onProject={onProject} onExplore={onExplore} />
  </div>;
}
