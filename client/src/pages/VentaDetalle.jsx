import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { can } from '../permissions.js';
import { fmtMoney, fmtDateTime } from '../format.js';
import { ConfirmDialog, PageHeader, Spinner, useToast } from '../components/ui.jsx';

export default function VentaDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [v, setV] = useState(null);
  const [error, setError] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [motivoErr, setMotivoErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(`/ventas/${id}`).then(setV).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const anular = async () => {
    if (motivo.trim().length < 10) { setMotivoErr('El motivo de anulación debe tener al menos 10 caracteres'); return; }
    setBusy(true);
    try {
      await api(`/ventas/${id}/anular`, { method: 'POST', body: { motivo } });
      toast('Venta anulada correctamente');
      setAnulando(false);
      load();
    } catch (e) {
      setMotivoErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!v) return <Spinner />;

  return (
    <>
      <PageHeader title={`Venta ${v.numero}`} breadcrumb={<><Link to="/ventas">Ventas</Link> / {v.numero}</>}>
        <button className="btn btn-outline no-print" onClick={() => window.print()} data-testid="v-imprimir">🖨 Imprimir</button>
        {can.anularVentas(user.rol) && v.estado === 'Emitida' && (
          <button className="btn btn-danger no-print" onClick={() => { setMotivo(''); setMotivoErr(''); setAnulando(true); }} data-testid="v-anular">Anular venta</button>
        )}
      </PageHeader>
      {v.estado === 'Anulada' && <div className="alert alert-error" data-testid="v-anulada">Venta anulada. Motivo: {v.motivo_anulacion}</div>}
      <div className="card card-body" style={{ marginBottom: 16 }}>
        <div className="detail-grid">
          <div><div className="lbl">Cliente</div><div className="val">{v.cliente}</div></div>
          <div><div className="lbl">Documento</div><div className="val">{v.documento}</div></div>
          <div><div className="lbl">Estado</div><div className="val"><span className={`badge ${v.estado === 'Anulada' ? 'red' : 'green'}`} data-testid="v-estado">{v.estado}</span></div></div>
          <div><div className="lbl">Fecha</div><div className="val">{fmtDateTime(v.fecha)}</div></div>
          <div><div className="lbl">Condición</div><div className="val">{v.condicion}</div></div>
          <div><div className="lbl">Bodega</div><div className="val">{v.bodega}</div></div>
          <div><div className="lbl">Vendedor</div><div className="val">{v.vendedor}</div></div>
          <div><div className="lbl">Dirección</div><div className="val">{v.direccion || '—'}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table data-testid="v-detalle">
            <thead><tr><th>SKU</th><th>Producto</th><th className="num">Cantidad</th><th className="num">Precio</th><th className="num">Desc. %</th><th className="num">Subtotal</th></tr></thead>
            <tbody>
              {v.detalle.map(d => (
                <tr key={d.id}><td>{d.sku}</td><td>{d.nombre}</td><td className="num">{d.cantidad}</td>
                  <td className="num">{fmtMoney(d.precio_unitario)}</td><td className="num">{d.descuento}%</td><td className="num">{fmtMoney(d.subtotal)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body">
          <div className="totals">
            <div className="row"><span>Subtotal</span><span data-testid="vd-subtotal">{fmtMoney(v.subtotal)}</span></div>
            <div className="row"><span>IVA (13%)</span><span data-testid="vd-iva">{fmtMoney(v.iva)}</span></div>
            <div className="row total"><span>Total</span><span data-testid="vd-total">{fmtMoney(v.total)}</span></div>
          </div>
        </div>
      </div>
      {anulando && (
        <ConfirmDialog title={`Anular venta ${v.numero}`} danger confirmText="Anular venta" busy={busy}
          message="Esta acción devolverá los productos al inventario y no se puede deshacer."
          onConfirm={anular} onCancel={() => setAnulando(false)}>
          <label htmlFor="motivo-anul" style={{ fontWeight: 600, fontSize: 13 }}>Motivo de anulación <span className="req">*</span></label>
          <textarea id="motivo-anul" value={motivo} onChange={e => setMotivo(e.target.value)} style={{ marginTop: 6 }} data-testid="v-motivo" />
          {motivoErr && <div className="err" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{motivoErr}</div>}
        </ConfirmDialog>
      )}
    </>
  );
}
