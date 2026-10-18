import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { fmtMoney } from '../format.js';
import { Field, PageHeader, useToast } from '../components/ui.jsx';

export default function CompraNueva() {
  const toast = useToast();
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [bodegaId, setBodegaId] = useState('1');
  const [notas, setNotas] = useState('');
  const [lineas, setLineas] = useState([]);
  const [productoSel, setProductoSel] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/proveedores', { query: { activo: 1 } }).then(setProveedores).catch(() => {});
    api('/bodegas').then(b => setBodegas(b.filter(x => x.activo))).catch(() => {});
    api('/productos', { query: { estado: 'activo', pageSize: 100, sort: 'nombre' } }).then(r => setProductos(r.data)).catch(() => {});
  }, []);

  const agregar = () => {
    const p = productos.find(x => String(x.id) === productoSel);
    if (!p) return;
    if (lineas.some(l => l.producto_id === p.id)) { toast('El producto ya está en la orden', 'error'); return; }
    setLineas(ls => [...ls, { producto_id: p.id, sku: p.sku, nombre: p.nombre, cantidad: 1, costo_unitario: p.precio_costo }]);
    setProductoSel('');
  };
  const upd = (i, k, v) => setLineas(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const quitar = i => setLineas(ls => ls.filter((_, j) => j !== i));
  const total = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0), 0);

  const guardar = async () => {
    setError('');
    if (!proveedorId) { setError('Selecciona un proveedor activo'); return; }
    if (lineas.length === 0) { setError('Agrega al menos un producto a la orden'); return; }
    if (lineas.some(l => !Number.isInteger(Number(l.cantidad)) || Number(l.cantidad) < 1)) { setError('La cantidad debe ser un número entero mayor a 0'); return; }
    if (lineas.some(l => !(Number(l.costo_unitario) > 0))) { setError('El costo unitario debe ser mayor a 0'); return; }
    setSaving(true);
    try {
      const r = await api('/compras', { method: 'POST', body: { proveedor_id: Number(proveedorId), bodega_id: Number(bodegaId), notas, lineas } });
      toast('Orden de compra creada correctamente');
      navigate(`/compras/${r.id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Nueva orden de compra" breadcrumb={<><Link to="/compras">Compras</Link> / Nueva</>} />
      {error && <div className="alert alert-error" data-testid="compra-error">{error}</div>}
      <div className="card card-body" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <Field label="Proveedor" required htmlFor="oc-prov">
            <select id="oc-prov" value={proveedorId} onChange={e => setProveedorId(e.target.value)} data-testid="oc-proveedor">
              <option value="">Selecciona un proveedor...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
            </select>
          </Field>
          <Field label="Bodega destino" required htmlFor="oc-bod">
            <select id="oc-bod" value={bodegaId} onChange={e => setBodegaId(e.target.value)} data-testid="oc-bodega">
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </Field>
          <Field label="Notas" full htmlFor="oc-notas">
            <input id="oc-notas" value={notas} onChange={e => setNotas(e.target.value)} data-testid="oc-notas" />
          </Field>
        </div>
      </div>
      <div className="card">
        <div className="toolbar">
          <select className="grow" value={productoSel} onChange={e => setProductoSel(e.target.value)} data-testid="oc-producto">
            <option value="">Selecciona un producto para agregar...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
          </select>
          <button className="btn btn-outline" onClick={agregar} disabled={!productoSel} data-testid="oc-agregar">Agregar</button>
        </div>
        <div className="table-wrap">
          <table data-testid="oc-lineas">
            <thead><tr><th>Producto</th><th className="num">Cantidad</th><th className="num">Costo unitario</th><th className="num">Subtotal</th><th></th></tr></thead>
            <tbody>
              {lineas.length === 0 && <tr><td colSpan="5" className="empty">Agrega productos a la orden</td></tr>}
              {lineas.map((l, i) => (
                <tr key={l.producto_id}>
                  <td>{l.nombre}<div style={{ color: 'var(--muted)', fontSize: 12 }}>{l.sku}</div></td>
                  <td className="num"><input className="qty-input" type="number" min="1" step="1" value={l.cantidad} onChange={e => upd(i, 'cantidad', e.target.value)} /></td>
                  <td className="num"><input className="qty-input" style={{ width: 110 }} type="number" min="0" step="0.01" value={l.costo_unitario} onChange={e => upd(i, 'costo_unitario', e.target.value)} /></td>
                  <td className="num">{fmtMoney((Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0))}</td>
                  <td className="num"><button className="btn-icon danger" onClick={() => quitar(i)} title="Quitar">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body">
          <div className="totals">
            <div className="row total"><span>Total</span><span data-testid="oc-total">{fmtMoney(total)}</span></div>
          </div>
          <div className="form-actions">
            <Link className="btn btn-outline" to="/compras">Cancelar</Link>
            <button className="btn btn-primary" onClick={guardar} disabled={saving} data-testid="oc-guardar">Guardar orden</button>
          </div>
        </div>
      </div>
    </>
  );
}
