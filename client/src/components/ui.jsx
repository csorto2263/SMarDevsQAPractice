import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" data-testid="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`} role="status">{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function Modal({ title, onClose, children, size, testId }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size || ''}`} role="dialog" aria-modal="true" data-testid={testId}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmText = 'Confirmar', danger, onConfirm, onCancel, children, busy }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm" testId="confirm-dialog">
      <p style={{ marginTop: 0 }}>{message}</p>
      {children}
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onCancel} data-testid="confirm-cancel">Cancelar</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy} data-testid="confirm-ok">{confirmText}</button>
      </div>
    </Modal>
  );
}

export function PageHeader({ title, breadcrumb, children }) {
  return (
    <div className="page-header">
      <div>
        {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
        <h1>{title}</h1>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums = [];
  for (let i = 1; i <= pages; i++) nums.push(i);
  return (
    <div className="pagination" data-testid="pagination">
      <span>Mostrando {from}-{to} de {total} registros</span>
      <div className="pages">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Anterior">‹</button>
        {nums.map(n => (
          <button key={n} className={n === page ? 'active' : ''} onClick={() => onChange(n)}>{n}</button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Siguiente">›</button>
      </div>
    </div>
  );
}

export function StatusBadge({ activo }) {
  return activo ? <span className="badge green">Activo</span> : <span className="badge gray">Inactivo</span>;
}

export function Spinner() {
  return <div className="spinner" aria-label="Cargando" />;
}

export function Field({ label, required, error, hint, children, full, htmlFor }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      {label && <label htmlFor={htmlFor}>{label} {required && <span className="req">*</span>}</label>}
      {children}
      {hint && !error && <div className="hint">{hint}</div>}
      {error && <div className="err" role="alert">{error}</div>}
    </div>
  );
}

export function usePaged(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const slice = items.slice((current - 1) * pageSize, current * pageSize);
  return { page: current, setPage, slice, total, pageSize };
}
