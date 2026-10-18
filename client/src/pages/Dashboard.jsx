import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtMoney, fmtDate, fmtDateTime } from '../format.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard').then(setData).catch(e => setError(e.message));
    api('/dashboard/notificaciones').catch(e => console.error('Error cargando notificaciones:', e.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <Spinner />;

  const max = Math.max(1, ...data.porDia.map(d => d.total));

  return (
    <>
      <PageHeader title={`Hola, ${user.nombre.split(' ')[0]}`} breadcrumb="Inicio / Dashboard" />
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card card-body kpi" data-testid="kpi-ventas-hoy">
          <div className="label">Ventas de hoy</div>
          <div className="value">{fmtMoney(data.ventasHoy)}</div>
          <div className="sub">{data.transaccionesHoy} transacciones</div>
        </div>
        <div className="card card-body kpi" data-testid="kpi-ventas-mes">
          <div className="label">Ventas del mes</div>
          <div className="value">{fmtMoney(data.ventasMes)}</div>
          <div className="sub">{data.transaccionesMes} transacciones</div>
        </div>
        <div className="card card-body kpi alert" data-testid="kpi-stock-bajo">
          <div className="label">Productos con stock bajo</div>
          <div className="value">{data.stockBajo}</div>
          <div className="sub"><Link to="/inventario">Ver existencias</Link></div>
        </div>
        <div className="card card-body kpi" data-testid="kpi-ticket">
          <div className="label">Ticket promedio del mes</div>
          <div className="value">{fmtMoney(data.transaccionesMes ? data.ventasMes / data.transaccionesMes : 0)}</div>
          <div className="sub">Total / transacciones</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-body">
          <div className="card-title">Ventas últimos 14 días</div>
          <div className="bars">
            {data.porDia.map(d => (
              <div key={d.dia} className="bar" style={{ height: `${(d.total / max) * 100}%` }} title={`${fmtDate(d.dia)}: ${fmtMoney(d.total)}`} />
            ))}
          </div>
          <div className="bars-labels">
            {data.porDia.map(d => <span key={d.dia}>{d.dia.slice(8, 10)}</span>)}
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ paddingBottom: 0 }}><div className="card-title">Top 5 productos del mes</div></div>
          <div className="table-wrap">
            <table data-testid="top-productos">
              <thead><tr><th>#</th><th>Producto</th><th className="num">Cantidad</th><th className="num">Monto</th></tr></thead>
              <tbody>
                {data.top.length === 0 && <tr><td colSpan="4" className="empty">Sin ventas este mes</td></tr>}
                {data.top.map((p, i) => (
                  <tr key={p.sku}><td>{i + 1}</td><td>{p.nombre}<div style={{ color: 'var(--muted)', fontSize: 12 }}>{p.sku}</div></td>
                    <td className="num">{p.cantidad}</td><td className="num">{fmtMoney(p.monto)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body" style={{ paddingBottom: 0 }}><div className="card-title">Últimas ventas</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th className="num">Total</th></tr></thead>
            <tbody>
              {data.ultimas.map(v => (
                <tr key={v.id}>
                  <td>{v.numero}</td><td>{fmtDateTime(v.fecha)}</td><td>{v.cliente}</td>
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
