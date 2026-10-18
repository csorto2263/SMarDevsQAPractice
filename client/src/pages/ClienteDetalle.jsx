import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { fmtMoney, fmtDateTime } from '../format.js';
import { PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';

export default function ClienteDetalle() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api(`/clientes/${id}`).then(setC).catch(e => setError(e.message)); }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!c) return <Spinner />;
  const disponible = Math.max(0, c.limite_credito - c.saldo_pendiente);

  return (
    <>
      <PageHeader title={c.nombre} breadcrumb={<><Link to="/clientes">Clientes</Link> / Detalle</>} />
      <div className="card card-body" style={{ marginBottom: 16 }}>
        <div className="detail-grid">
          <div><div className="lbl">Documento</div><div className="val">{c.documento}</div></div>
          <div><div className="lbl">Correo</div><div className="val">{c.email}</div></div>
          <div><div className="lbl">Teléfono</div><div className="val">{c.telefono}</div></div>
          <div><div className="lbl">Dirección</div><div className="val">{c.direccion || '—'}</div></div>
          <div><div className="lbl">Tipo</div><div className="val">{c.tipo}</div></div>
          <div><div className="lbl">Estado</div><div className="val"><StatusBadge activo={c.activo} /></div></div>
          {c.tipo === 'Crédito' && <>
            <div><div className="lbl">Límite de crédito</div><div className="val">{fmtMoney(c.limite_credito)}</div></div>
            <div><div className="lbl">Saldo pendiente</div><div className="val">{fmtMoney(c.saldo_pendiente)}</div></div>
            <div><div className="lbl">Crédito disponible</div><div className="val" data-testid="credito-disponible">{fmtMoney(disponible)}</div></div>
          </>}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}><div className="card-title">Últimas ventas</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Número</th><th>Fecha</th><th>Condición</th><th>Estado</th><th className="num">Total</th></tr></thead>
            <tbody>
              {c.ventas.length === 0 && <tr><td colSpan="5" className="empty">El cliente no tiene ventas registradas</td></tr>}
              {c.ventas.map(v => (
                <tr key={v.id}>
                  <td><Link to={`/ventas/${v.id}`}>{v.numero}</Link></td><td>{fmtDateTime(v.fecha)}</td><td>{v.condicion}</td>
                  <td><span className={`badge ${v.estado === 'Anulada' ? 'red' : 'green'}`}>{v.estado}</span></td>
                  <td className="num">{fmtMoney(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
