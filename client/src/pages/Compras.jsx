import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { can } from '../permissions.js';
import { fmtMoney, fmtDate } from '../format.js';
import { PageHeader, Pagination, Spinner, usePaged, useToast } from '../components/ui.jsx';

export const estadoCompraBadge = e => ({ Pendiente: 'amber', Recibida: 'green', Cancelada: 'gray' }[e] || 'gray');

export default function Compras() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [estado, setEstado] = useState('');

  useEffect(() => {
    api('/compras', { query: { estado } }).then(setRows).catch(e => toast(e.message, 'error'));
  }, [estado, toast]);

  const { page, setPage, slice, total, pageSize } = usePaged(rows || [], 10);

  return (
    <>
      <PageHeader title="Órdenes de compra" breadcrumb="Inicio / Operaciones / Compras">
        {can.compras(user.rol) && <Link className="btn btn-primary" to="/compras/nueva" data-testid="btn-nueva-compra">+ Nueva orden</Link>}
      </PageHeader>
      <div className="card">
        <div className="toolbar">
          <select style={{ width: 200 }} value={estado} onChange={e => { setEstado(e.target.value); setPage(1); }} data-testid="filtro-estado-compra">
            <option value="">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Recibida">Recibida</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
        {!rows ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table data-testid="tabla-compras">
                <thead><tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Bodega destino</th><th className="num">Ítems</th><th className="num">Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {slice.length === 0 && <tr><td colSpan="7" className="empty">No hay órdenes de compra</td></tr>}
                  {slice.map(c => (
                    <tr key={c.id}>
                      <td><Link to={`/compras/${c.id}`}>{c.numero}</Link></td>
                      <td>{fmtDate(c.fecha)}</td>
                      <td>{c.proveedor}</td>
                      <td>{c.bodega}</td>
                      <td className="num">{c.items}</td>
                      <td className="num">{fmtMoney(c.total)}</td>
                      <td><span className={`badge ${estadoCompraBadge(c.estado)}`}>{c.estado}</span></td>
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
