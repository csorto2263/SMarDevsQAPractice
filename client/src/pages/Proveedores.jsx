import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, Modal, PageHeader, Pagination, Spinner, StatusBadge, usePaged, useToast } from '../components/ui.jsx';

export default function Proveedores() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api('/proveedores', { query: { search } }).then(setRows).catch(e => toast(e.message, 'error'));
  }, [search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const { page, setPage, slice, total, pageSize } = usePaged(rows || [], 10);

  const cambiarEstado = async p => {
    try {
      await api(`/proveedores/${p.id}/estado`, { method: 'PATCH', body: { activo: !p.activo } });
      toast(p.activo ? 'Proveedor desactivado' : 'Proveedor activado');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Proveedores" breadcrumb="Inicio / Terceros / Proveedores">
        <button className="btn btn-primary" onClick={() => setEditing({ dias_credito: 0 })} data-testid="btn-nuevo-proveedor">+ Nuevo proveedor</button>
      </PageHeader>
      <div className="card">
        <div className="toolbar">
          <input className="grow" placeholder="Buscar por razón social o NIT..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="buscar-proveedor" />
        </div>
        {!rows ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table data-testid="tabla-proveedores">
                <thead><tr><th>Razón social</th><th>NIT</th><th>Contacto</th><th>Email</th><th>Teléfono</th><th className="num">Días crédito</th><th>Estado</th><th className="num">Acciones</th></tr></thead>
                <tbody>
                  {slice.length === 0 && <tr><td colSpan="8" className="empty">No se encontraron proveedores</td></tr>}
                  {slice.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.razon_social}</strong></td>
                      <td className="nowrap">{p.nit}</td>
                      <td>{p.contacto || '—'}</td>
                      <td>{p.email}</td>
                      <td className="nowrap">{p.telefono}</td>
                      <td className="num">{p.dias_credito}</td>
                      <td><StatusBadge activo={p.activo} /></td>
                      <td>
                        <div className="actions">
                          <button className="btn-icon" title="Editar" onClick={() => setEditing(p)} data-testid={`editar-proveedor-${p.id}`}>✎</button>
                          <button className={`btn-icon ${p.activo ? 'danger' : ''}`} title={p.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => cambiarEstado(p)} data-testid={`estado-proveedor-${p.id}`}>{p.activo ? '⏻' : '↺'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
          </>
        )}
      </div>
      {editing && <ProveedorForm proveedor={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function ProveedorForm({ proveedor, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !proveedor.id;
  const [form, setForm] = useState({
    razon_social: proveedor.razon_social || '', nit: proveedor.nit || '', contacto: proveedor.contacto || '',
    email: proveedor.email || '', telefono: proveedor.telefono || '', direccion: proveedor.direccion || '',
    dias_credito: proveedor.dias_credito ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (form.razon_social.trim().length < 3) e.razon_social = 'La razón social debe tener entre 3 y 100 caracteres';
    if (!/^\d{4}-\d{6}-\d{3}-\d$/.test(form.nit)) e.nit = 'El NIT debe tener el formato 0000-000000-000-0';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = 'Ingresa un correo electrónico válido';
    if (!/^\d{4}-\d{4}$/.test(form.telefono)) e.telefono = 'El teléfono debe tener el formato 0000-0000';
    if (form.dias_credito === '' || Number(form.dias_credito) < 0) e.dias_credito = 'Los días de crédito deben estar entre 0 y 90';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setServerError('');
    if (!validate()) return;
    try {
      const body = { ...form, dias_credito: Number(form.dias_credito) };
      if (isNew) await api('/proveedores', { method: 'POST', body });
      else await api(`/proveedores/${proveedor.id}`, { method: 'PUT', body });
      toast(isNew ? 'Proveedor creado correctamente' : 'Proveedor actualizado correctamente');
      onSaved();
    } catch (e) { setServerError(e.message); }
  };

  return (
    <Modal title={isNew ? 'Nuevo proveedor' : 'Editar proveedor'} onClose={onClose} testId="modal-proveedor">
      {serverError && <div className="alert alert-error" data-testid="form-error">{serverError}</div>}
      <div className="form-grid">
        <Field label="Razón social" required error={errors.razon_social} full htmlFor="pv-rs">
          <input id="pv-rs" maxLength={100} value={form.razon_social} onChange={e => set('razon_social', e.target.value)} className={errors.razon_social ? 'invalid' : ''} data-testid="pv-razon" />
        </Field>
        <Field label="NIT" required error={errors.nit} hint="Formato 0000-000000-000-0" htmlFor="pv-nit">
          <input id="pv-nit" value={form.nit} onChange={e => set('nit', e.target.value)} className={errors.nit ? 'invalid' : ''} data-testid="pv-nit" />
        </Field>
        <Field label="Persona de contacto" htmlFor="pv-contacto">
          <input id="pv-contacto" value={form.contacto} onChange={e => set('contacto', e.target.value)} data-testid="pv-contacto" />
        </Field>
        <Field label="Correo electrónico" required error={errors.email} htmlFor="pv-email">
          <input id="pv-email" value={form.email} onChange={e => set('email', e.target.value)} className={errors.email ? 'invalid' : ''} data-testid="pv-email" />
        </Field>
        <Field label="Teléfono" required error={errors.telefono} htmlFor="pv-tel">
          <input id="pv-tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="0000-0000" className={errors.telefono ? 'invalid' : ''} data-testid="pv-telefono" />
        </Field>
        <Field label="Días de crédito" required error={errors.dias_credito} hint="Entre 0 y 90 días" htmlFor="pv-dias">
          <input id="pv-dias" type="number" min="0" step="1" value={form.dias_credito} onChange={e => set('dias_credito', e.target.value)} className={errors.dias_credito ? 'invalid' : ''} data-testid="pv-dias" />
        </Field>
        <Field label="Dirección" full htmlFor="pv-dir">
          <input id="pv-dir" value={form.direccion} onChange={e => set('direccion', e.target.value)} data-testid="pv-direccion" />
        </Field>
      </div>
      <div className="form-actions" style={{ alignItems: 'flex-start' }}>
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-secondary" style={{ marginTop: 6 }} onClick={save} data-testid="pv-guardar">Guardar</button>
      </div>
    </Modal>
  );
}
