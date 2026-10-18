import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { fmtMoney, fmtDateUS } from '../format.js';
import { PageHeader, Pagination, Spinner, usePaged, useToast } from '../components/ui.jsx';

export default function Ventas() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', estado: '', search: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      setError('La fecha inicial no puede ser mayor a la final');
      return;
    }
    setError('');
    api('/ventas', { query: filtros }).then(setRows).catch(e => toast(e.message, 'error'));
  }, [filtros, toast]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const { page, setPage, slice, total, pageSize } = usePaged(rows || [], 10);
  const set = (k, v) => { setFiltros(f => ({ ...f, [k]: v })); setPage(1); };

  return (
    <>
      <PageHeader title="Ventas" breadcrumb="Inicio / Operaciones / Ventas">
        <Link className="btn btn-primary" to="/ventas/nueva" data-testid="btn-nueva-venta">+ Nueva venta</Link>
      </PageHeader>
      {error && <div className="alert alert-error" data-testid="ventas-error">{error}</div>}
      <div className="card">
        <div className="toolbar">
          <input className="grow" placeholder="Buscar por número o cliente..." value={filtros.search} onChange={e => set('search', e.target.value)} data-testid="buscar-venta" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Desde
            <input type="date" style={{ width: 160 }} value={filtros.desde} onChange={e => set('desde', e.target.value)} data-testid="ventas-desde" /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Hasta
            <input type="date" style={{ width: 160 }} value={filtros.hasta} onChange={e => set('hasta', e.target.value)} data-testid="ventas-hasta" /></label>
          <select style={{ width: 160 }} value={filtros.estado} onChange={e => set('estado', e.target.value)} data-testid="ventas-estado">
            <option value="">Todos los estados</option>
            <option value="Emitida">Emitida</option>
            <option value="Anulada">Anulada</option>
          </select>
        </div>
        {!rows ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table data-testid="tabla-ventas">
                <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Condición</th><th>Vendedor</th><th className="num">Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {slice.length === 0 && <tr><td colSpan="7" className="empty">No se encontraron ventas</td></tr>}
                  {slice.map(v => (
                    <tr key={v.id}>
                      <td><Link to={`/ventas/${v.id}`}>{v.numero}</Link></td>
                      <td className="nowrap">{fmtDateUS(v.fecha)}</td>
                      <td>{v.cliente}</td>
                      <td>{v.condicion}</td>
                      <td>{v.vendedor}</td>
                      <td className="num">{fmtMoney(v.total)}</td>
                      <td><span className={`badge ${v.estado === 'Anulada' ? 'red' : 'green'}`}>{v.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
