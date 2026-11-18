import { useEffect, useRef } from 'react';
import { BookOpenText, ChevronDown, FileText, Layers3, Route, Tags, X } from 'lucide-react';
import { ASSOCIATED_PROJECT, compareText, formatNumber, GENERAL_PROJECT, METRIC_DEFINITIONS, UNKNOWN_PROJECT } from '../lib/lessons.js';

export function RoadMark({ className = '' }) {
  return <svg className={className} width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect width="40" height="40" rx="11" fill="currentColor" />
    <path d="M10 30c0-6.7 3.8-10.1 9.7-12.5C24 15.8 26 13.6 26.7 10M17 30c0-4.1 2.1-6.2 6.2-7.9C29 19.7 32 15.7 32 10" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M13.5 30c0-5.3 2.9-8.1 7.9-10.2 5-2.1 7.4-5.2 8-9.8" stroke="#d5eda3" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2.3 3.4" />
  </svg>;
}

export function SelectField({ label, hideLabel = false, icon: Icon, className = '', children, ...props }) {
  return <label className={`select-field ${className}`}>
    <span className={hideLabel ? 'sr-only' : 'field-label'}>{label}</span>
    <span className={`select-control${Icon ? ' with-icon' : ''}`}>
      {Icon && <Icon className="select-leading" size={16} aria-hidden="true" />}
      <select {...props}>{children}</select>
      <ChevronDown className="select-chevron" size={15} aria-hidden="true" />
    </span>
  </label>;
}

export function ComponentOptions({ metrics }) {
  return <>
    <option value="">Todos los componentes</option>
    {[...metrics.components].sort((a, b) => compareText(a.name, b.name)).map(({ key, name }) => <option value={key} key={key}>{name}</option>)}
  </>;
}

export function ProjectOptions({ metrics }) {
  return <>
    <option value="">Todos los proyectos</option>
    {metrics.scope.project > 0 && <option value={ASSOCIATED_PROJECT}>Con proyecto asociado</option>}
    {metrics.scope.general > 0 && <option value={GENERAL_PROJECT}>Recomendaciones generales</option>}
    {metrics.scope.unknown > 0 && <option value={UNKNOWN_PROJECT}>Sin dato de proyecto</option>}
    {[...metrics.projects].sort((a, b) => compareText(a.name, b.name)).map(({ key, name }) => <option value={key} key={key}>{name}</option>)}
  </>;
}

const metricIcons = [BookOpenText, Layers3, Route, Tags];
const tones = ['green', 'blue', 'sand', 'violet'];
export function MetricGrid({ metrics }) {
  return <div className="metric-grid">
    {METRIC_DEFINITIONS.map(({ key, label }, index) => {
      const Icon = metricIcons[index];
      return <div className="panel metric-tile" key={key}>
        <span className={`metric-icon tone-${tones[index]}`}><Icon size={20} strokeWidth={1.85} aria-hidden="true" /></span>
        <dl className="metric-text">
          <dt>{label}</dt>
          <dd>{formatNumber(metrics[key])}</dd>
        </dl>
      </div>;
    })}
  </div>;
}

export function PageIntro({ icon: Icon = FileText, kicker, title, description }) {
  return <div className="page-intro">
    <div className="page-kicker"><Icon size={15} aria-hidden="true" /> {kicker}</div>
    <h1>{title}</h1>
    <p>{description}</p>
  </div>;
}

export function Modal({ labelledBy, className = '', onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={labelledBy}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-inner">{children}</div>
  </dialog>;
}

export function CloseButton({ onClick, label = 'Cerrar' }) {
  return <button className="icon-button close-button" type="button" aria-label={label} onClick={onClick}><X size={19} aria-hidden="true" /></button>;
}
