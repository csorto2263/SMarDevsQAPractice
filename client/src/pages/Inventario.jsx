import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Field, Modal, PageHeader, Spinner, useToast } from '../components/ui.jsx';

export default function Inventario() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);
  const [ajuste, setAjuste] = useState(null);

  const load = () => api('/inventario/existencias').then(setData).catch(e => toast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  if (!data) return <Spinner />;
  const q = search.trim().toLowerCase();
  const rows = data.productos.filter(p =>
    (!q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) && (!soloBajo || p.bajo));
  const bajos = data.productos.filter(p => p.bajo).length;

  return (
    <>
      <PageHeader title="Existencias" breadcrumb="Inicio / Operaciones / Inventario">
        <button className="btn btn-primary" onClick={() => setAjuste({})} data-testid="btn-ajuste">± Ajuste de inventario</button>
      </PageHeader>
      {bajos > 0 && <div className="alert alert-warning" data-testid="alerta-stock-bajo">Hay {bajos} producto(s) con stock bajo.</div>}
      <div className="card">
        <div className="toolbar">
          <input className="grow" placeholder="Buscar por SKU o nombre..." value={search} onChange={e => setSearch(e.target.value)} data-testid="buscar-existencia" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={soloBajo} onChange={e => setSoloBajo(e.target.checked)} data-testid="solo-bajo" /> Solo stock bajo
          </label>
        </div>
        <div className="table-wrap">
          <table data-testid="tabla-existencias">
            <thead>
              <tr>
                <th>SKU</th><th>Producto</th><th>Categoría</th>
                {data.bodegas.map(b => <th key={b.id} className="num">{b.nombre}</th>)}
                <th className="num">Total</th><th className="num">Mínimo</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6 + data.bodegas.length} className="empty">No se encontraron productos</td></tr>}
              {rows.map(p => (
                <tr key={p.id} className={p.bajo ? 'row-alert' : ''}>
                  <td className="nowrap"><Link to={`/productos/${p.id}`}>{p.sku}</Link></td>
                  <td>{p.nombre} {p.bajo && <span className="badge red">Stock bajo</span>}</td>
                  <td>{p.categoria}</td>
                  {p.porBodega.map((q2, i) => <td key={i} className="num">{q2}</td>)}
                  <td className="num"><strong>{p.total}</strong></td>
                  <td className="num">{p.stock_minimo}</td>
                  <td className="num"><Link to={`/inventario/kardex?producto=${p.id}`} className="btn-icon" title="Ver kardex">≡</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {ajuste && <AjusteForm productos={data.productos} bodegas={data.bodegas} onClose={() => setAjuste(null)} onSaved={() => { setAjuste(null); load(); }} />}
    </>
  );
}

function AjusteForm({ productos, bodegas, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ producto_id: '', bodega_id: String(bodegas[0]?.id || ''), tipo: 'ENTRADA', cantidad: 1, motivo: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const prod = productos.find(p => String(p.id) === form.producto_id);
  const idxBod = bodegas.findIndex(b => String(b.id) === form.bodega_id);
  const actual = prod && idxBod >= 0 ? prod.porBodega[idxBod] : null;

  const save = async () => {
    setError('');
    if (!form.producto_id) { setError('Selecciona un producto'); return; }
    if (!Number.isInteger(Number(form.cantidad)) || Number(form.cantidad) < 1) { setError('La cantidad debe ser un número entero mayor a 0'); return; }
    if (!form.motivo.trim()) { setError('El motivo es obligatorio'); return; }
    setSaving(true);
    try {
      await api('/inventario/ajustes', { method: 'POST', body: { ...form, producto_id: Number(form.producto_id), bodega_id: Number(form.bodega_id), cantidad: Number(form.cantidad) } });
      toast('Ajuste registrado correctamente');
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Ajuste de inventario" onClose={onClose} testId="modal-ajuste">
      {error && <div className="alert alert-error" data-testid="ajuste-error">{error}</div>}
      <div className="form-grid">
        <Field label="Producto" required full htmlFor="aj-prod">
          <select id="aj-prod" value={form.producto_id} onChange={e => set('producto_id', e.target.value)} data-testid="aj-producto">
            <option value="">Selecciona...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Bodega" required htmlFor="aj-bod" hint={actual !== null ? `Stock actual: ${actual}` : ''}>
          <select id="aj-bod" value={form.bodega_id} onChange={e => set('bodega_id', e.target.value)} data-testid="aj-bodega">
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </Field>
        <Field label="Tipo de ajuste" required htmlFor="aj-tipo">
          <select id="aj-tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)} data-testid="aj-tipo">
            <option value="ENTRADA">Entrada (+)</option>
            <option value="SALIDA">Salida (−)</option>
          </select>
        </Field>
        <Field label="Cantidad" required htmlFor="aj-cant">
          <input id="aj-cant" type="number" min="1" step="1" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} data-testid="aj-cantidad" />
        </Field>
        <Field label="Motivo" required full hint="Mínimo 10 caracteres" htmlFor="aj-motivo">
          <textarea id="aj-motivo" value={form.motivo} onChange={e => set('motivo', e.target.value)} placeholder="Ej. Producto dañado durante el traslado" data-testid="aj-motivo" />
        </Field>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving} data-testid="aj-guardar">Registrar ajuste</button>
      </div>
    </Modal>
  );
}
