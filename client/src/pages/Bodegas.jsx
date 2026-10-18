import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, Modal, PageHeader, Spinner, StatusBadge, useToast } from '../components/ui.jsx';

export default function Bodegas() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api('/bodegas').then(setRows).catch(e => toast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  return (
    <>
      <PageHeader title="Bodegas" breadcrumb="Inicio / Catálogo / Bodegas">
        <button className="btn btn-primary" onClick={() => setEditing({ activo: 1 })} data-testid="btn-nueva-bodega">+ Nueva bodega</button>
      </PageHeader>
      <div className="card">
        {!rows ? <Spinner /> : (
          <div className="table-wrap">
            <table data-testid="tabla-bodegas">
              <thead><tr><th>Nombre</th><th>Ubicación</th><th>Estado</th><th className="num">Acciones</th></tr></thead>
              <tbody>
                {rows.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.nombre}</strong></td>
                    <td>{b.ubicacion || '—'}</td>
                    <td><StatusBadge activo={b.activo} /></td>
                    <td><div className="actions"><button className="btn-icon" title="Editar" onClick={() => setEditing(b)}>✎</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <BodegaForm bodega={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function BodegaForm({ bodega, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ nombre: bodega.nombre || '', ubicacion: bodega.ubicacion || '', activo: !!bodega.activo });
  const [error, setError] = useState('');

  const save = async () => {
    const n = form.nombre.trim();
    if (n.length < 3 || n.length > 50) { setError('El nombre debe tener entre 3 y 50 caracteres'); return; }
    try {
      if (bodega.id) await api(`/bodegas/${bodega.id}`, { method: 'PUT', body: form });
      else await api('/bodegas', { method: 'POST', body: form });
      toast(bodega.id ? 'Bodega actualizada' : 'Bodega creada');
      onSaved();
    } catch (e) { setError(e.message); }
  };

  return (
    <Modal title={bodega.id ? 'Editar bodega' : 'Nueva bodega'} onClose={onClose} size="sm">
      {error && <div className="alert alert-error">{error}</div>}
      <Field label="Nombre" required htmlFor="b-nombre">
        <input id="b-nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} data-testid="bod-nombre" />
      </Field>
      <div style={{ height: 12 }} />
      <Field label="Ubicación" htmlFor="b-ubi">
        <input id="b-ubi" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} data-testid="bod-ubicacion" />
      </Field>
      {bodega.id && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Bodega activa
        </label>
      )}
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} data-testid="bod-guardar">Guardar</button>
      </div>
    </Modal>
  );
}
