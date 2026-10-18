import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { can } from '../permissions.js';
import { fmtMoney, fmtDateTime } from '../format.js';
import { ConfirmDialog, PageHeader, Spinner, useToast } from '../components/ui.jsx';
import { estadoCompraBadge } from './Compras.jsx';

export default function CompraDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const load = () => api(`/compras/${id}`).then(setC).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const recibir = async () => {
    try {
      await api(`/compras/${id}/recibir`, { method: 'POST' });
      toast('Orden recibida. El inventario fue actualizado');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const cancelar = async () => {
    try {
      await api(`/compras/${id}/cancelar`, { method: 'POST' });
      toast('Orden cancelada');
      setCancelando(false);
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!c) return <Spinner />;
  const gestionar = can.compras(user.rol) && c.estado === 'Pendiente';

  return (
    <>
      <PageHeader title={`Orden ${c.numero}`} breadcrumb={<><Link to="/compras">Compras</Link> / {c.numero}</>}>
        {gestionar && <button className="btn btn-outline" onClick={() => setCancelando(true)} data-testid="oc-cancelar">Cancelar orden</button>}
        {gestionar && <button className="btn btn-primary" onClick={recibir} data-testid="oc-recibir">✓ Recibir mercadería</button>}
      </PageHeader>
      <div className="card card-body" style={{ marginBottom: 16 }}>
        <div className="detail-grid">
          <div><div className="lbl">Proveedor</div><div className="val">{c.proveedor}</div></div>
          <div><div className="lbl">NIT</div><div className="val">{c.nit}</div></div>
          <div><div className="lbl">Estado</div><div className="val"><span className={`badge ${estadoCompraBadge(c.estado)}`} data-testid="oc-estado">{c.estado}</span></div></div>
          <div><div className="lbl">Fecha</div><div className="val">{fmtDateTime(c.fecha)}</div></div>
          <div><div className="lbl">Bodega destino</div><div className="val">{c.bodega}</div></div>
          <div><div className="lbl">Creada por</div><div className="val">{c.usuario}</div></div>
          {c.fecha_recepcion && <div><div className="lbl">Fecha de recepción</div><div className="val">{fmtDateTime(c.fecha_recepcion)}</div></div>}
          {c.notas && <div><div className="lbl">Notas</div><div className="val">{c.notas}</div></div>}
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table data-testid="oc-detalle">
            <thead><tr><th>SKU</th><th>Producto</th><th className="num">Cantidad</th><th className="num">Costo unitario</th><th className="num">Subtotal</th></tr></thead>
            <tbody>
              {c.detalle.map(d => (
                <tr key={d.id}><td>{d.sku}</td><td>{d.nombre}</td><td className="num">{d.cantidad}</td>
                  <td className="num">{fmtMoney(d.costo_unitario)}</td><td className="num">{fmtMoney(d.subtotal)}</td></tr>
              ))}
              <tr><td colSpan="4" className="num"><strong>Total</strong></td><td className="num"><strong>{fmtMoney(c.total)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      {cancelando && (
        <ConfirmDialog title="Cancelar orden" danger confirmText="Sí, cancelar"
          message={`¿Deseas cancelar la orden ${c.numero}? Esta acción no se puede deshacer.`}
          onConfirm={cancelar} onCancel={() => setCancelando(false)} />
      )}
    </>
  );
}
