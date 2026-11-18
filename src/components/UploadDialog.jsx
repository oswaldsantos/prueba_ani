import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Download, FileSpreadsheet, LoaderCircle, RotateCcw, ShieldCheck, UploadCloud } from 'lucide-react';
import { downloadTemplate, formatNumber, readDataFile } from '../lib/lessons.js';
import { CloseButton, Modal } from './ui.jsx';

export default function UploadDialog({ isReference, onClose, onApply, onRestore }) {
  const inputRef = useRef(null);
  const ticket = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  useEffect(() => () => { ticket.current++; }, []);

  async function inspect(file) {
    if (!file) return;
    const id = ++ticket.current;
    setFilename(file.name);
    setReading(true);
    setError('');
    setCandidate(null);
    try {
      const result = await readDataFile(file);
      if (id === ticket.current) setCandidate(result);
    } catch (reason) {
      if (id === ticket.current) setError(reason instanceof Error ? reason.message : 'No pudimos leer el archivo. Intenta con otro.');
    } finally {
      if (id === ticket.current) setReading(false);
    }
  }

  function drop(event) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 1) {
      ticket.current++;
      setReading(false);
      setCandidate(null);
      setFilename('');
      setError('Selecciona un solo archivo a la vez.');
      return;
    }
    inspect(event.dataTransfer.files[0]);
  }

  return <Modal labelledBy="upload-title" className="upload-modal" onClose={onClose}>
    <header className="upload-header">
      <span className="modal-badge"><FileSpreadsheet size={21} aria-hidden="true" /></span><CloseButton onClick={onClose} />
      <h2 id="upload-title">Cargar archivo</h2>
      <p>Importa una matriz de lecciones aprendidas para actualizar el análisis.</p>
    </header>
    <div className="upload-body">
      <input ref={inputRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" tabIndex={-1} hidden
        onChange={(event) => { inspect(event.target.files?.[0]); event.target.value = ''; }} />
      <div className={`drop-zone${dragging ? ' is-dragging' : ''}${candidate ? ' has-candidate' : ''}`}
        onDragOver={(event) => { event.preventDefault(); if (event.dataTransfer.types.includes('Files')) setDragging(true); }}
        onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={drop} aria-busy={reading}>
        {reading ? <><LoaderCircle className="spinner drop-icon" size={27} aria-hidden="true" /><strong>Leyendo el archivo…</strong><span>{filename}</span></>
          : candidate ? <><Check className="drop-icon" size={27} aria-hidden="true" /><strong title={candidate.name}>{candidate.name}</strong>
            <span>{formatNumber(candidate.records.length)} {candidate.records.length === 1 ? 'lección detectada' : 'lecciones detectadas'}</span>
            <button className="text-button" type="button" onClick={() => inputRef.current?.click()}>Elegir otro archivo</button></>
          : <><UploadCloud className="drop-icon" size={28} aria-hidden="true" /><strong>Arrastra tu archivo aquí</strong>
            <button className="button button-outline" type="button" onClick={() => inputRef.current?.click()}>Examinar archivos</button><span>CSV o Excel (.xlsx) · máximo 10 MB</span></>}
      </div>
      {error && <div className="upload-message is-error" role="alert"><AlertCircle size={17} aria-hidden="true" /><span>{error}</span></div>}
      {candidate?.skipped > 0 && <div className="upload-message is-warning" role="status"><AlertCircle size={17} aria-hidden="true" /><span>Se omitirán {formatNumber(candidate.skipped)} {candidate.skipped === 1 ? 'fila incompleta o mal formada' : 'filas incompletas o mal formadas'}.</span></div>}
      {candidate && !candidate.hasProjectColumn && <div className="upload-message is-info" role="status"><AlertCircle size={17} aria-hidden="true" /><span>No se encontró la columna Proyectos. El análisis mostrará estas lecciones como «Sin dato de proyecto».</span></div>}
      <div className="format-note">
        <strong>Columnas requeridas</strong>
        <p>Componente, Tema y Recomendación. Proyectos y Página son opcionales. Para Excel se usa la primera hoja.</p>
        <button className="text-button" type="button" onClick={downloadTemplate}><Download size={15} aria-hidden="true" /> Descargar plantilla CSV</button>
      </div>
      <div className="upload-privacy"><ShieldCheck size={15} aria-hidden="true" /> El archivo se procesa en tu navegador.</div>
    </div>
    <footer className="modal-actions">
      {!isReference && <button className="text-button restore-button" type="button" onClick={onRestore}><RotateCcw size={15} aria-hidden="true" /> Restaurar referencia</button>}
      <div className="modal-action-group"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button>
        <button className="button button-primary" type="button" disabled={!candidate || reading} onClick={() => { if (candidate) onApply(candidate); }}>Analizar archivo</button></div>
    </footer>
  </Modal>;
}
