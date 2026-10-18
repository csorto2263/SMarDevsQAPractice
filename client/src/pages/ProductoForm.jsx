import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, Modal, useToast } from '../components/ui.jsx';

export default function ProductoForm({ producto, categorias, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !producto.id;
  const [unidades, setUnidades] = useState([]);
  const [form, setForm] = useState({
    sku: producto.sku || '',
    nombre: producto.nombre || '',
    descripcion: producto.descripcion || '',
    categoria_id: producto.categoria_id || '',
    unidad_id: producto.unidad_id || '',
    precio_costo: producto.precio_costo ?? '',
    precio_venta: producto.precio_venta ?? '',
    stock_minimo: producto.stock_minimo ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api('/unidades').then(setUnidades).catch(() => {}); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.sku.trim()) e.sku = 'El SKU es obligatorio';
    else if (!/^[A-Za-z0-9-]{3,12}$/.test(form.sku.trim())) e.sku = 'El SKU debe tener entre 3 y 12 caracteres (letras, números o guion)';
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length < 3) e.nombre = 'El nombre debe tener entre 3 y 80 caracteres';
    if (!form.categoria_id) e.categoria_id = 'Selecciona una categoría';
    if (!form.unidad_id) e.unidad_id = 'Selecciona una unidad de medida';
    if (!(Number(form.precio_costo) > 0)) e.precio_costo = 'El precio de costo debe ser mayor a 0';
    if (!(Number(form.precio_venta) > 0)) e.precio_venta = 'El precio de venta debe ser mayor a 0';
    if (form.stock_minimo === '' || !Number.isInteger(Number(form.stock_minimo)) || Number(form.stock_minimo) < 0)
      e.stock_minimo = 'El stock mínimo debe ser un número entero mayor o igual a 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const body = { ...form, stock_minimo: Number(form.stock_minimo) };
      if (isNew) {
        await api('/productos', { method: 'POST', body });
        toast('Producto creado corectamente');
      } else {
        await api(`/productos/${producto.id}`, { method: 'PUT', body });
        toast('Producto actualizado correctamente');
      }
      onSaved();
    } catch (e) {
      setServerError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? 'Nuevo producto' : `Editar producto ${producto.sku}`} onClose={onClose} testId="modal-producto">
      {serverError && <div className="alert alert-error" data-testid="form-error">{serverError}</div>}
      <div className="form-grid">
        <Field label="SKU" required error={errors.sku} hint="3 a 12 caracteres: letras, números o guion" htmlFor="p-sku">
          <input id="p-sku" value={form.sku} onChange={e => set('sku', e.target.value)} className={errors.sku ? 'invalid' : ''} data-testid="p-sku" />
        </Field>
        <Field label="Nombre" required error={errors.nombre} htmlFor="p-nombre">
          <input id="p-nombre" maxLength={80} value={form.nombre} onChange={e => set('nombre', e.target.value)} className={errors.nombre ? 'invalid' : ''} data-testid="p-nombre" />
        </Field>
        <Field label="Categoría" required error={errors.categoria_id} htmlFor="p-cat">
          <select id="p-cat" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} className={errors.categoria_id ? 'invalid' : ''} data-testid="p-categoria">
            <option value="">Selecciona...</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Unidad de medida" required error={errors.unidad_id} htmlFor="p-uni">
          <select id="p-uni" value={form.unidad_id} onChange={e => set('unidad_id', e.target.value)} className={errors.unidad_id ? 'invalid' : ''} data-testid="p-unidad">
            <option value="">Selecciona...</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
          </select>
        </Field>
        <Field label="Precio de costo ($)" required error={errors.precio_costo} htmlFor="p-costo">
          <input id="p-costo" type="number" step="0.01" min="0" value={form.precio_costo} onChange={e => set('precio_costo', e.target.value)} className={errors.precio_costo ? 'invalid' : ''} data-testid="p-costo" />
        </Field>
        <Field label="Precio de venta ($)" required error={errors.precio_venta} htmlFor="p-venta">
          <input id="p-venta" type="number" step="0.01" min="0" value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} className={errors.precio_venta ? 'invalid' : ''} data-testid="p-venta" />
        </Field>
        <Field label="Stock mínimo" required error={errors.stock_minimo} htmlFor="p-min">
          <input id="p-min" type="number" step="1" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} className={errors.stock_minimo ? 'invalid' : ''} data-testid="p-minimo" />
        </Field>
        <Field label="Descripción" full htmlFor="p-desc">
          <textarea id="p-desc" maxLength={500} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} data-testid="p-descripcion" />
        </Field>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving} data-testid="p-guardar">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </Modal>
  );
}
