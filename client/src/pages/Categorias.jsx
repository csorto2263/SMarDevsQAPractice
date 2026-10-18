import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ConfirmDialog, Field, Modal, PageHeader, Spinner, useToast } from '../components/ui.jsx';

export default function Categorias() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = () => api('/categorias').then(setRows).catch(e => toast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  const eliminar = async () => {
    try {
      await api(`/categorias/${deleting.id}`, { method: 'DELETE' });
      toast('Categoría eliminada');
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader title="Categorías" breadcrumb="Inicio / Catálogo / Categorías">
        <button className="btn btn-primary" onClick={() => setEditing({})} data-testid="btn-nueva-categoria">+ Nueva categoría</button>
      </PageHeader>
      <div className="card">
        {!rows ? <Spinner /> : (
          <div className="table-wrap">
            <table data-testid="tabla-categorias">
              <thead><tr><th>Nombre</th><th>Descripción</th><th className="num">Productos</th><th className="num">Acciones</th></tr></thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.nombre}</strong></td>
                    <td>{c.descripcion || '—'}</td>
                    <td className="num">{c.productos}</td>
                    <td>
                      <div className="actions">
                        <button className="btn-icon" title="Editar" onClick={() => setEditing(c)} data-testid={`editar-cat-${c.id}`}>✎</button>
                        <button className="btn-icon danger" title="Eliminar" onClick={() => setDeleting(c)} data-testid={`eliminar-cat-${c.id}`}>✎</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <CategoriaForm categoria={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && (
        <ConfirmDialog title="Eliminar categoría" danger confirmText="Eliminar"
          message={`¿Deseas eliminar la categoría "${deleting.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={eliminar} onCancel={() => setDeleting(null)} />
      )}
    </>
  );
}

function CategoriaForm({ categoria, onClose, onSaved }) {
  const toast = useToast();
  const [nombre, setNombre] = useState(categoria.nombre || '');
  const [descripcion, setDescripcion] = useState(categoria.descripcion || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = nombre.trim();
    if (n.length < 3 || n.length > 40) { setError('El nombre debe tener entre 3 y 40 caracteres'); return; }
    setSaving(true);
    try {
      if (categoria.id) await api(`/categorias/${categoria.id}`, { method: 'PUT', body: { nombre: n, descripcion } });
      else await api('/categorias', { method: 'POST', body: { nombre: n, descripcion } });
      toast(categoria.id ? 'Categoría actualizada' : 'Categoría creada');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={categoria.id ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose} size="sm">
      <Field label="Nombre" required error={error} htmlFor="c-nombre">
        <input id="c-nombre" value={nombre} onChange={e => setNombre(e.target.value)} data-testid="cat-nombre" />
      </Field>
      <div style={{ height: 12 }} />
      <Field label="Descripción" htmlFor="c-desc">
        <textarea id="c-desc" value={descripcion} onChange={e => setDescripcion(e.target.value)} data-testid="cat-descripcion" />
      </Field>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving} data-testid="cat-guardar">Guardar</button>
      </div>
    </Modal>
  );
}
