import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtDate } from '../format.js';
import { ConfirmDialog, Field, Modal, PageHeader, Spinner, StatusBadge, useToast } from '../components/ui.jsx';

export default function Usuarios() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => api('/usuarios').then(setRows).catch(e => toast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  const cambiarEstado = async () => {
    try {
      await api(`/usuarios/${confirm.id}/estado`, { method: 'PATCH', body: { activo: !confirm.activo } });
      toast(confirm.activo ? 'Usuario desactivado' : 'Usuario activado');
      setConfirm(null);
      load();
    } catch (e) { toast(e.message, 'error'); setConfirm(null); }
  };

  return (
    <>
      <PageHeader title="Usuarios" breadcrumb="Inicio / Administración / Usuarios">
        <button className="btn btn-primary" onClick={() => setEditing({ rol: 'Vendedor' })} data-testid="btn-nuevo-usuario">+ Nuevo usuario</button>
      </PageHeader>
      <div className="card">
        {!rows ? <Spinner /> : (
          <div className="table-wrap">
            <table data-testid="tabla-usuarios">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th><th className="num">Acciones</th></tr></thead>
              <tbody>
                {rows.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td>{u.email}</td>
                    <td><span className="badge blue">{u.rol}</span></td>
                    <td><StatusBadge activo={u.activo} /></td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn-icon" title="Editar" onClick={() => setEditing(u)} data-testid={`editar-usuario-${u.id}`}>✎</button>
                        {u.id !== user.id && (
                          <button className={`btn-icon ${u.activo ? 'danger' : ''}`} title={u.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => setConfirm(u)} data-testid={`estado-usuario-${u.id}`}>{u.activo ? '⏻' : '↺'}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <UsuarioForm usuario={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {confirm && (
        <ConfirmDialog title={confirm.activo ? 'Desactivar usuario' : 'Activar usuario'} danger={!!confirm.activo}
          message={confirm.activo ? `¿Deseas desactivar a ${confirm.nombre}? No podrá iniciar sesión.` : `¿Deseas activar a ${confirm.nombre}?`}
          confirmText={confirm.activo ? 'Desactivar' : 'Activar'} onConfirm={cambiarEstado} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}

function UsuarioForm({ usuario, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !usuario.id;
  const [form, setForm] = useState({ nombre: usuario.nombre || '', email: usuario.email || '', rol: usuario.rol || 'Vendedor', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    const e = {};
    if (form.nombre.trim().length < 3 || form.nombre.trim().length > 60) e.nombre = 'El nombre debe tener entre 3 y 60 caracteres';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = 'Ingresa un correo electrónico válido';
    if ((isNew || form.password) && (form.password.length < 8 || !/\d/.test(form.password))) e.password = 'La contraseña debe tener al menos 8 caracteres y un número';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      if (isNew) await api('/usuarios', { method: 'POST', body: form });
      else await api(`/usuarios/${usuario.id}`, { method: 'PUT', body: form });
      toast(isNew ? 'Usuario creado correctamente' : 'Usuario actualizado correctamente');
      onSaved();
    } catch (err) { setServerError(err.message); }
  };

  return (
    <Modal title={isNew ? 'Nuevo usuario' : 'Editar usuario'} onClose={onClose} testId="modal-usuario">
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <div className="form-grid">
        <Field label="Nombre completo" required error={errors.nombre} full htmlFor="u-nombre">
          <input id="u-nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} data-testid="u-nombre" />
        </Field>
        <Field label="Correo electrónico" required error={errors.email} htmlFor="u-email">
          <input id="u-email" value={form.email} onChange={e => set('email', e.target.value)} data-testid="u-email" />
        </Field>
        <Field label="Rol" required htmlFor="u-rol">
          <select id="u-rol" value={form.rol} onChange={e => set('rol', e.target.value)} data-testid="u-rol">
            <option value="Administrador">Administrador</option>
            <option value="Vendedor">Vendedor</option>
            <option value="Bodeguero">Bodeguero</option>
          </select>
        </Field>
        <Field label={isNew ? 'Contraseña' : 'Nueva contraseña'} required={isNew} error={errors.password}
          hint={isNew ? 'Mínimo 8 caracteres y al menos un número' : 'Déjalo vacío para mantener la actual'} full htmlFor="u-pass">
          <input id="u-pass" type="password" value={form.password} onChange={e => set('password', e.target.value)} data-testid="u-password" />
        </Field>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} data-testid="u-guardar">Guardar</button>
      </div>
    </Modal>
  );
}
