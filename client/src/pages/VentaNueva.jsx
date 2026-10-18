import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { fmtMoney } from '../format.js';
import { Field, PageHeader, useToast } from '../components/ui.jsx';

const IVA = 0.13;
const round2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
const cents = x => Math.floor(x * 100) / 100;

export function calcularTotales(lineas) {
  let bruto = 0, subtotal = 0;
  lineas.forEach(l => {
    const q = Number(l.cantidad) || 0;
    const d = Number(l.descuento) || 0;
    bruto += q * l.precio;
    subtotal += round2(q * l.precio * (1 - d / 100));
  });
  subtotal = round2(subtotal);
  const iva = cents(bruto * IVA);
  return { subtotal, iva, total: round2(subtotal + iva) };
}

export default function VentaNueva() {
  const toast = useToast();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [bodegaId, setBodegaId] = useState('1');
  const [condicion, setCondicion] = useState('Contado');
  const [lineas, setLineas] = useState([]);
  const [productoSel, setProductoSel] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/clientes', { query: { estado: 'activo' } }).then(setClientes).catch(() => {});
    api('/bodegas').then(b => setBodegas(b.filter(x => x.activo))).catch(() => {});
    api('/productos', { query: { estado: 'activo', pageSize: 100, sort: 'nombre' } }).then(r => setProductos(r.data)).catch(() => {});
  }, []);

  const cliente = clientes.find(c => String(c.id) === clienteId);
  useEffect(() => { if (cliente?.tipo !== 'Crédito') setCondicion('Contado'); }, [cliente]);

  const refrescarDisponible = async (bod, ls) => Promise.all(ls.map(async l => {
    const p = await api(`/productos/${l.producto_id}`);
    const ex = p.existencias.find(e => String(e.bodega_id) === String(bod));
    return { ...l, disponible: ex ? ex.cantidad : 0 };
  }));

  const cambiarBodega = async b => {
    setBodegaId(b);
    if (lineas.length) setLineas(await refrescarDisponible(b, lineas));
  };

  const agregar = async () => {
    const p = productos.find(x => String(x.id) === productoSel);
    if (!p) return;
    if (lineas.some(l => l.producto_id === p.id)) { toast('El producto ya está en la venta', 'error'); return; }
    const [linea] = await refrescarDisponible(bodegaId, [{ producto_id: p.id, sku: p.sku, nombre: p.nombre, precio: p.precio_venta, cantidad: '1', descuento: '0' }]);
    if (linea.disponible <= 0) { toast('El producto no tiene stock en la bodega seleccionada', 'error'); return; }
    setLineas(ls => [...ls, linea]);
    setProductoSel('');
  };

  const upd = (i, k, v) => setLineas(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const quitar = i => setLineas(ls => ls.filter((_, j) => j !== i));

  const lineErrors = useMemo(() => lineas.map(l => {
    if (!/^\d+$/.test(l.cantidad) || Number(l.cantidad) < 1) return 'Cantidad inválida';
    if (l.cantidad > String(l.disponible)) return `Cantidad supera el stock disponible (${l.disponible})`;
    const d = Number(l.descuento);
    if (Number.isNaN(d) || d < 0 || d > 50) return 'El descuento debe estar entre 0% y 50%';
    return null;
  }), [lineas]);

  const totales = calcularTotales(lineas);

  const guardar = async () => {
    setError('');
    if (!clienteId) { setError('Selecciona un cliente'); return; }
    if (lineas.length === 0) { setError('Agrega al menos un producto a la venta'); return; }
    if (lineErrors.some(Boolean)) { setError('Corrige los errores en el detalle de la venta'); return; }
    setSaving(true);
    try {
      const r = await api('/ventas', {
        method: 'POST',
        body: {
          cliente_id: Number(clienteId), bodega_id: Number(bodegaId), condicion,
          lineas: lineas.map(l => ({ producto_id: l.producto_id, cantidad: Number(l.cantidad), descuento: Number(l.descuento) || 0 })),
        },
      });
      toast(`Venta ${r.numero} registrada correctamente`);
      navigate(`/ventas/${r.id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Nueva venta" breadcrumb={<><Link to="/ventas">Ventas</Link> / Nueva</>} />
      {error && <div className="alert alert-error" data-testid="venta-error">{error}</div>}
      <div className="card card-body" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <Field label="Cliente" required htmlFor="v-cliente">
            <select id="v-cliente" value={clienteId} onChange={e => setClienteId(e.target.value)} data-testid="v-cliente">
              <option value="">Selecciona un cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.documento}</option>)}
            </select>
          </Field>
          <Field label="Bodega de despacho" required htmlFor="v-bodega">
            <select id="v-bodega" value={bodegaId} onChange={e => cambiarBodega(e.target.value)} data-testid="v-bodega">
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </Field>
          <Field label="Condición de pago" required htmlFor="v-cond"
            hint={cliente?.tipo === 'Crédito' ? `Crédito disponible: ${fmtMoney(cliente.limite_credito - cliente.saldo_pendiente)}` : 'Cliente de contado'}>
            <select id="v-cond" value={condicion} onChange={e => setCondicion(e.target.value)} disabled={cliente?.tipo !== 'Crédito'} data-testid="v-condicion">
              <option value="Contado">Contado</option>
              <option value="Crédito">Crédito</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="card">
        <div className="toolbar">
          <select className="grow" value={productoSel} onChange={e => setProductoSel(e.target.value)} data-testid="v-producto">
            <option value="">Selecciona un producto para agregar...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre} ({fmtMoney(p.precio_venta)})</option>)}
          </select>
          <button className="btn btn-outline" onClick={agregar} disabled={!productoSel} data-testid="v-agregar">Agregar</button>
        </div>
        <table className="sale-lines" data-testid="v-lineas">
          <thead><tr><th>Producto</th><th className="num">Disponible</th><th className="num">Precio</th><th className="num">Cantidad</th><th className="num">Desc. %</th><th className="num">Subtotal</th><th></th></tr></thead>
          <tbody>
            {lineas.length === 0 && <tr><td colSpan="7" className="empty">Agrega productos a la venta</td></tr>}
            {lineas.map((l, i) => (
              <tr key={l.producto_id}>
                <td>{l.nombre}<div style={{ color: 'var(--muted)', fontSize: 12 }}>{l.sku}</div>
                  {lineErrors[i] && <div className="err" style={{ color: 'var(--danger)', fontSize: 12 }} data-testid={`v-err-${i}`}>{lineErrors[i]}</div>}</td>
                <td className="num">{l.disponible}</td>
                <td className="num">{fmtMoney(l.precio)}</td>
                <td className="num"><input className={`qty-input ${lineErrors[i] ? 'invalid' : ''}`} value={l.cantidad} onChange={e => upd(i, 'cantidad', e.target.value)} data-testid={`v-cant-${i}`} /></td>
                <td className="num"><input className="desc-input" type="number" min="0" max="50" value={l.descuento} onChange={e => upd(i, 'descuento', e.target.value)} data-testid={`v-desc-${i}`} /></td>
                <td className="num">{fmtMoney(round2((Number(l.cantidad) || 0) * l.precio * (1 - (Number(l.descuento) || 0) / 100)))}</td>
                <td className="num"><button className="btn-icon danger" onClick={() => quitar(i)} title="Quitar">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-body">
          <div className="totals" data-testid="v-totales">
            <div className="row"><span>Subtotal</span><span data-testid="v-subtotal">{fmtMoney(totales.subtotal)}</span></div>
            <div className="row"><span>IVA (13%)</span><span data-testid="v-iva">{fmtMoney(totales.iva)}</span></div>
            <div className="row total"><span>Total</span><span data-testid="v-total">{fmtMoney(totales.total)}</span></div>
          </div>
          <div className="form-actions">
            <Link className="btn btn-outline" to="/ventas">Cancelar</Link>
            <button className="btn btn-primary" onClick={guardar} disabled={saving} data-testid="v-guardar">{saving ? 'Registrando...' : 'Registrar venta'}</button>
          </div>
        </div>
      </div>
    </>
  );
}
