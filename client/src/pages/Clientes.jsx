import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { fmtMoney } from '../format.js';
import { ConfirmDialog, Field, Modal, PageHeader, Pagination, Spinner, StatusBadge, usePaged, useToast } from '../components/ui.jsx';

export default function Clientes() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    api('/clientes', { query: { search } }).then(setRows).catch(e => { setRows([]); toast(e.message, 'error'); });
  }, [search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = (rows || []).filter(c => !tipo || c.tipo === tipo);
  const { page, setPage, slice, total, pageSize } = usePaged(filtered, 10);

  const cambiarEstado = async () => {
    try {
      await api(`/clientes/${confirm.id}/estado`, { method: 'PATCH', body: { activo: !confirm.activo } });
      toast(confirm.activo ? 'Cliente desactivado' : 'Cliente activado');
      setConfirm(null);
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Clientes" breadcrumb="Inicio / Proveedores">
        <button className="btn btn-primary" onClick={() => setEditing({ tipo: 'Contado' })} data-testid="btn-nuevo-cliente">+ Nuevo cliente</button>
      </PageHeader>
      <div className="card">
        <div className="toolbar">
          <input className="grow" placeholder="Buscar por nombre o documento..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="buscar-cliente" />
          <select style={{ width: 180 }} value={tipo} onChange={e => { setTipo(e.target.value); setPage(1); }} data-testid="filtro-tipo">
            <option value="">Todos los tipos</option>
            <option value="Contado">Contado</option>
            <option value="Crédito">Crédito</option>
          </select>
        </div>
        {!rows ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table data-testid="tabla-clientes">
                <thead>
                  <tr><th>Nombre</th><th>Documento</th><th>Email</th><th>Teléfono</th><th>Tipo</th>
                    <th className="num">Límite</th><th className="num">Saldo</th><th>Estado</th><th className="num">Acciones</th></tr>
                </thead>
                <tbody>
                  {slice.length === 0 && <tr><td colSpan="9" className="empty">No se encontraron clientes</td></tr>}
                  {slice.map(c => (
                    <tr key={c.id}>
                      <td><Link to={`/clientes/${c.id}`}>{c.nombre}</Link></td>
                      <td className="nowrap">{c.documento}</td>
                      <td>{c.email}</td>
                      <td className="nowrap">{c.telefono}</td>
                      <td><span className={`badge ${c.tipo === 'Crédito' ? 'blue' : 'gray'}`}>{c.tipo}</span></td>
                      <td className="num">{c.tipo === 'Crédito' ? fmtMoney(c.limite_credito) : '—'}</td>
                      <td className="num">{c.tipo === 'Crédito' ? fmtMoney(c.saldo_pendiente) : '—'}</td>
                      <td><StatusBadge activo={c.activo} /></td>
                      <td>
                        <div className="actions">
                          <button className="btn-icon" title="Editar" onClick={() => setEditing(c)} data-testid={`editar-cliente-${c.id}`}>✎</button>
                          <button className={`btn-icon ${c.activo ? 'danger' : ''}`} title={c.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => setConfirm(c)} data-testid={`estado-cliente-${c.id}`}>{c.activo ? '⏻' : '↺'}</button>
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
      {editing && <ClienteForm cliente={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {confirm && (
        <ConfirmDialog title={confirm.activo ? 'Desactivar cliente' : 'Activar cliente'} danger={!!confirm.activo}
          message={confirm.activo ? `¿Deseas desactivar a "${confirm.nombre}"? No podrá seleccionarse en nuevas ventas.` : `¿Deseas activar a "${confirm.nombre}"?`}
          confirmText={confirm.activo ? 'Desactivar' : 'Activar'} onConfirm={cambiarEstado} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}

function ClienteForm({ cliente, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !cliente.id;
  const [form, setForm] = useState({
    nombre: cliente.nombre || '', documento: cliente.documento || '', email: cliente.email || '',
    telefono: cliente.telefono || '', direccion: cliente.direccion || '', tipo: cliente.tipo || 'Contado',
    limite_credito: cliente.limite_credito || '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length < 3) e.nombre = 'El nombre debe tener entre 3 y 80 caracteres';
    if (!/^\d{8}-\d$/.test(form.documento)) e.documento = 'El DUI debe tener el formato 00000000-0';
    if (!form.email.trim()) e.email = 'El correo es obligatorio';
    if (!/^\d{4}-\d{3,4}$/.test(form.telefono)) e.telefono = 'El teléfono debe tener el formato 0000-0000';
    if (form.tipo === 'Crédito' && !(Number(form.limite_credito) > 0)) e.limite_credito = 'El límite de crédito debe ser mayor a 0 para clientes de crédito';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      if (isNew) await api('/clientes', { method: 'POST', body: form });
      else await api(`/clientes/${cliente.id}`, { method: 'PUT', body: form });
      toast(isNew ? 'Cliente creado correctamente' : 'Cliente actualizado correctamente');
      onSaved();
    } catch (e) {
      setServerError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? 'Nuevo cliente' : 'Editar cliente'} onClose={onClose} testId="modal-cliente">
      {serverError && <div className="alert alert-error" data-testid="form-error">{serverError}</div>}
      <div className="form-grid">
        <Field label="Nombre completo / Razón social" required error={errors.nombre} full htmlFor="cl-nombre">
          <input id="cl-nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} className={errors.nombre ? 'invalid' : ''} data-testid="cl-nombre" />
        </Field>
        <Field label="DUI" required error={errors.documento} hint="Formato 00000000-0" htmlFor="cl-doc">
          <input id="cl-doc" value={form.documento} onChange={e => set('documento', e.target.value)} placeholder="00000000-0" className={errors.documento ? 'invalid' : ''} data-testid="cl-documento" />
        </Field>
        <Field label="Correo electrónico" required error={errors.email} htmlFor="cl-email">
          <input id="cl-email" type="text" value={form.email} onChange={e => set('email', e.target.value)} placeholder="cliente@correo.com" className={errors.email ? 'invalid' : ''} data-testid="cl-email" />
        </Field>
        <Field label="Teléfono" required error={errors.telefono} htmlFor="cl-tel">
          <input id="cl-tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="0000-00000" className={errors.telefono ? 'invalid' : ''} data-testid="cl-telefono" />
        </Field>
        <Field label="Tipo de cliente" required htmlFor="cl-tipo">
          <select id="cl-tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)} data-testid="cl-tipo">
            <option value="Contado">Contado</option>
            <option value="Crédito">Crédito</option>
          </select>
        </Field>
        {form.tipo === 'Crédito' && (
          <Field label="Límite de crédito ($)" required error={errors.limite_credito} htmlFor="cl-lim">
            <input id="cl-lim" type="number" min="0" step="0.01" value={form.limite_credito} onChange={e => set('limite_credito', e.target.value)} className={errors.limite_credito ? 'invalid' : ''} data-testid="cl-limite" />
          </Field>
        )}
        <Field label="Dirección" full htmlFor="cl-dir">
          <input id="cl-dir" value={form.direccion} onChange={e => set('direccion', e.target.value)} data-testid="cl-direccion" />
        </Field>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving} data-testid="cl-guardar">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </Modal>
  );
}
