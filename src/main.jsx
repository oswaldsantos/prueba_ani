import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, BookOpenText, CheckCircle2, ChevronRight, Database, FileDown, FileText, LayoutGrid, LoaderCircle, Menu, Upload, X } from 'lucide-react';
import '@fontsource-variable/manrope';
import '@fontsource-variable/inter';
import './styles.css';
import referenceCsv from './data/lecciones-vej.csv?raw';
import { describeFilters, EMPTY_FILTERS, filterRecords, formatNumber, parseCsv, REFERENCE_NAME, summarize } from './lib/lessons.js';
import Dashboard from './components/Dashboard.jsx';
import Explorer from './components/Explorer.jsx';
import Reports from './components/Reports.jsx';
import UploadDialog from './components/UploadDialog.jsx';
import { CloseButton, RoadMark } from './components/ui.jsx';

const reference = parseCsv(referenceCsv, { name: REFERENCE_NAME, isReference: true });
const pages = {
  overview: { href: '#resumen', name: 'Visión general', icon: LayoutGrid },
  explore: { href: '#explorar', name: 'Explorar lecciones', icon: BookOpenText },
  reports: { href: '#reportes', name: 'Reportes PDF', icon: FileText },
};
const routeFromHash = () => Object.keys(pages).find((page) => pages[page].href === window.location.hash) ?? 'overview';

function Sidebar({ dataset, route, mobileOpen, onClose, onUpload }) {
  const closeRef = useRef(null);
  useEffect(() => { if (mobileOpen) closeRef.current?.focus({ preventScroll: true }); }, [mobileOpen]);
  return <>
    {mobileOpen && <button tabIndex={-1} className="sidebar-backdrop" type="button" onClick={onClose} aria-label="Cerrar navegación" />}
    <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`} id="sidebar" aria-label="Navegación principal">
      <div className="sidebar-top"><a className="brand" href={pages.overview.href} onClick={onClose} aria-label="ANI Insights: visión general">
        <RoadMark className="brand-mark" /><div className="brand-type"><strong>ANI Insights</strong><span>INTELIGENCIA VIAL</span></div></a>
        <button ref={closeRef} className="icon-button sidebar-close" type="button" onClick={onClose} aria-label="Cerrar navegación"><X size={20} aria-hidden="true" /></button></div>
      <nav className="side-navigation" aria-label="Secciones de la aplicación">
        <div className="nav-group"><span className="nav-heading">ESPACIO DE TRABAJO</span>
          {Object.entries(pages).map(([key, { href, name, icon: Icon }]) => <a key={key} href={href}
            className={`nav-item${route === key ? ' nav-active' : ''}`} aria-current={route === key ? 'page' : undefined} onClick={onClose}>
            <Icon size={18} strokeWidth={1.85} aria-hidden="true" /><span>{name}</span>{route === key && <span className="nav-active-dot" aria-hidden="true" />}</a>)}
        </div>
        <div className="nav-group data-navigation"><span className="nav-heading">DATOS</span>
          <button type="button" className="nav-item" onClick={onUpload}><Upload size={18} strokeWidth={1.85} aria-hidden="true" /><span>Cargar archivo</span></button>
        </div>
      </nav>
      <div className="sidebar-bottom">
        <div className="source-card" title={dataset.name}>
          <div className="source-heading"><Database size={15} aria-hidden="true" /><span>Fuente activa</span></div>
          <strong>{dataset.isReference ? 'Matriz de lecciones VEJ' : dataset.name}</strong>
          <div className="source-status"><span aria-hidden="true" />{formatNumber(dataset.records.length)} {dataset.records.length === 1 ? 'lección cargada' : 'lecciones cargadas'}</div>
        </div>
        <div className="sidebar-footer"><span className="colombia-mark" aria-hidden="true"><i /><i /><i /></span><span>Agencia Nacional<br />de Infraestructura</span></div>
      </div>
    </aside>
  </>;
}

function Header({ route, onMenu, menuRef, mobileOpen, onUpload, onExport, canExport, exporting }) {
  return <header className="topbar">
    <div className="header-start">
      <button ref={menuRef} className="icon-button mobile-menu" type="button" onClick={onMenu} aria-label="Abrir navegación" aria-expanded={mobileOpen} aria-controls="sidebar"><Menu size={21} aria-hidden="true" /></button>
      <nav className="breadcrumb" aria-label="Ubicación actual"><span className="breadcrumb-parent">Panel de análisis</span><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{pages[route].name}</span></nav>
    </div>
    <div className="header-actions">
      <button className="button button-outline header-upload" type="button" onClick={onUpload}><Upload size={16} aria-hidden="true" /><span>Cargar archivo</span></button>
      <button className="button button-primary" type="button" disabled={!canExport || exporting} onClick={onExport}>
        {exporting ? <LoaderCircle className="spinner" size={17} aria-hidden="true" /> : <FileDown size={17} aria-hidden="true" />} <span>{exporting ? 'Generando…' : 'Exportar PDF'}</span></button>
    </div>
  </header>;
}

function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [lastAnalysisView, setLastAnalysisView] = useState(() => routeFromHash() === 'explore' ? 'explore' : 'overview');
  const [dataset, setDataset] = useState(reference);
  const [overviewComponent, setOverviewComponent] = useState('');
  const [explorerFilters, setExplorerFilters] = useState(EMPTY_FILTERS);
  const [scopeChoice, setScopeChoice] = useState('selection');
  const [includeDetails, setIncludeDetails] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const mainRef = useRef(null);
  const menuRef = useRef(null);
  const exportingRef = useRef(false);

  useEffect(() => {
    function sync() {
      const next = routeFromHash();
      setRoute(next);
      if (next !== 'reports') setLastAnalysisView(next);
      setMobileOpen(false);
      window.scrollTo({ top: 0 });
    }
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const narrow = window.matchMedia('(max-width: 900px)');
    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      requestAnimationFrame(() => menuRef.current?.focus({ preventScroll: true }));
    }
    function closeOnResize(event) { if (!event.matches) setMobileOpen(false); }
    window.addEventListener('keydown', closeOnEscape);
    narrow.addEventListener('change', closeOnResize);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      narrow.removeEventListener('change', closeOnResize);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 5800);
    return () => clearTimeout(timeout);
  }, [toast]);

  const sourceMetrics = useMemo(() => summarize(dataset.records), [dataset]);
  const filterView = route === 'reports' ? lastAnalysisView : route;
  const filters = useMemo(() => filterView === 'explore' ? explorerFilters : { ...EMPTY_FILTERS, component: overviewComponent }, [filterView, explorerFilters, overviewComponent]);
  const filterLabels = useMemo(() => describeFilters(filters, sourceMetrics), [filters, sourceMetrics]);
  const selection = useMemo(() => filterLabels.length > 0 ? filterRecords(dataset.records, filters) : dataset.records, [dataset, filters, filterLabels]);
  const selectionMetrics = useMemo(() => selection === dataset.records ? sourceMetrics : summarize(selection), [selection, dataset, sourceMetrics]);
  const reportScope = scopeChoice === 'selection' && filterLabels.length ? 'selection' : 'all';
  const useSelection = route !== 'reports' || reportScope === 'selection';
  const exportItems = useSelection ? selection : dataset.records;
  const reportMetrics = reportScope === 'selection' ? selectionMetrics : sourceMetrics;

  function navigate(next) {
    const href = pages[next].href;
    if (window.location.hash !== href) window.location.hash = href;
    else window.scrollTo({ top: 0 });
  }

  function openExplorer(changes) {
    setExplorerFilters({ ...EMPTY_FILTERS, ...changes });
    navigate('explore');
  }

  function changeDataset(next) {
    setDataset(next);
    setOverviewComponent('');
    setExplorerFilters(EMPTY_FILTERS);
    setLastAnalysisView('overview');
    setScopeChoice('selection');
    setUploadOpen(false);
    navigate('overview');
    setToast({ title: next.isReference ? 'Archivo de referencia restaurado' : 'Archivo analizado', text: `${formatNumber(next.records.length)} ${next.records.length === 1 ? 'lección disponible' : 'lecciones disponibles'} en el panel.` });
  }

  function closeMenu() {
    if (!mobileOpen) return;
    setMobileOpen(false);
    requestAnimationFrame(() => menuRef.current?.focus({ preventScroll: true }));
  }

  function openUpload() {
    setMobileOpen(false);
    setUploadOpen(true);
  }

  async function exportPdf() {
    if (exportingRef.current || !exportItems.length) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      const { downloadReport } = await import('./lib/report.js');
      downloadReport({ dataset, records: exportItems, filterLabels: useSelection ? filterLabels : [], includeDetails: route === 'reports' && includeDetails });
      setToast({ title: 'Informe generado', text: 'El PDF está listo en tus descargas.' });
    } catch {
      setToast({ title: 'No se pudo generar el PDF', text: 'Intenta descargarlo de nuevo o excluye el anexo si el archivo es muy grande.', error: true });
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }

  return <div className="app-shell">
    <a className="skip-link" tabIndex={mobileOpen ? -1 : undefined} href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>Saltar al contenido</a>
    <Sidebar dataset={dataset} route={route} mobileOpen={mobileOpen} onClose={closeMenu} onUpload={openUpload} />
    <div className="app-main" inert={mobileOpen || undefined}>
      <Header route={route} menuRef={menuRef} onMenu={() => setMobileOpen(true)} mobileOpen={mobileOpen} onUpload={openUpload} onExport={exportPdf} canExport={exportItems.length > 0} exporting={exporting} />
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {route === 'overview' && <Dashboard metrics={selectionMetrics} sourceMetrics={sourceMetrics} component={overviewComponent}
          onFilter={setOverviewComponent} onComponent={(component) => openExplorer({ component })}
          onProject={(project) => openExplorer({ project, component: overviewComponent })} onExplore={() => openExplorer({ component: overviewComponent })} />}
        {route === 'explore' && <Explorer dataset={dataset} sourceMetrics={sourceMetrics} records={selection} filters={explorerFilters} onFilters={setExplorerFilters} />}
        {route === 'reports' && <Reports dataset={dataset} metrics={reportMetrics} selectionTotal={selection.length} labelFilters={filterLabels}
          scope={reportScope} onScope={setScopeChoice} includeDetails={includeDetails} onIncludeDetails={setIncludeDetails} onExport={exportPdf} exporting={exporting} />}
      </main>
    </div>
    {uploadOpen && <UploadDialog isReference={dataset.isReference} onClose={() => setUploadOpen(false)} onApply={changeDataset} onRestore={() => changeDataset(reference)} />}
    {toast && <div className={`toast${toast.error ? ' toast-error' : ''}`} role={toast.error ? 'alert' : 'status'}>
      <span className="toast-icon">{toast.error ? <AlertCircle size={21} aria-hidden="true" /> : <CheckCircle2 size={21} aria-hidden="true" />}</span>
      <div><strong>{toast.title}</strong><p>{toast.text}</p></div><CloseButton label="Cerrar notificación" onClick={() => setToast(null)} />
    </div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
