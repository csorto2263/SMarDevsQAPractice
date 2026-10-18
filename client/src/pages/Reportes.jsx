import React, { useState } from 'react';
import { api } from '../api.js';
import { fmtMoney, fmtDateTime, firstOfMonthISO, todayISO } from '../format.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

export default function Reportes() {
  const [desde, setDesde] = useState(firstOfMonthISO());
  const [hasta, setHasta] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generar = async () => {
    setError('');
    if (!desde || !hasta) { setError('Selecciona el rango de fechas'); return; }
    if (desde > hasta) { setError('La fecha inicial no puede ser mayor a la final'); return; }
    setLoading(true);
    try {
      setData(await api('/reportes/ventas', { query: { desde, hasta } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportar = () => {
    const header = ['Numero', 'Fecha', 'Cliente', 'Subtotal', 'IVA', 'Total', 'Estado'];
    const esc = s => `"${String(s).replace(/"/g, '""')}"`;
    const lines = data.rows.map(r => [r.numero, r.fecha, esc(r.cliente), r.subtotal.toFixed(2), r.iva.toFixed(2), r.total.toFixed(2), r.estado].join(','));
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-ventas_${desde}_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader title="Reporte de ventas" breadcrumb="Inicio / Reportes" />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Desde
            <input type="date" style={{ width: 170 }} value={desde} onChange={e => setDesde(e.target.value)} data-testid="rep-desde" /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Hasta
            <input type="date" style={{ width: 170 }} value={hasta} onChange={e => setHasta(e.target.value)} data-testid="rep-hasta" /></label>
          <button className="btn btn-primary" onClick={generar} data-testid="rep-generar">Generar reporte</button>
          {data && data.rows.length > 0 && <button className="btn btn-outline" onClick={exportar} data-testid="rep-exportar">⇩ Exportar CSV</button>}
        </div>
      </div>
      {error && <div className="alert alert-error" data-testid="rep-error">{error}</div>}
      {loading && <Spinner />}
      {data && !loading && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <div className="card card-body kpi"><div className="label">Ventas emitidas</div><div className="value" data-testid="rep-cantidad">{data.resumen.cantidad}</div><div className="sub">{data.resumen.anuladas} anuladas</div></div>
            <div className="card card-body kpi"><div className="label">Subtotal</div><div className="value">{fmtMoney(data.resumen.subtotal)}</div></div>
            <div className="card card-body kpi"><div className="label">IVA</div><div className="value">{fmtMoney(data.resumen.iva)}</div></div>
            <div className="card card-body kpi"><div className="label">Total vendido</div><div className="value" data-testid="rep-total">{fmtMoney(data.resumen.total)}</div></div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table data-testid="tabla-reporte">
                <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Condición</th><th>Vendedor</th><th className="num">Subtotal</th><th className="num">IVA</th><th className="num">Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {data.rows.length === 0 && <tr><td colSpan="9" className="empty">No hay ventas en el rango seleccionado</td></tr>}
                  {data.rows.map(r => (
                    <tr key={r.numero}>
                      <td>{r.numero}</td><td className="nowrap">{fmtDateTime(r.fecha)}</td><td>{r.cliente}</td><td>{r.condicion}</td><td>{r.vendedor}</td>
                      <td className="num">{fmtMoney(r.subtotal)}</td><td className="num">{fmtMoney(r.iva)}</td><td className="num">{fmtMoney(r.total)}</td>
                      <td><span className={`badge ${r.estado === 'Anulada' ? 'red' : 'green'}`}>{r.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
