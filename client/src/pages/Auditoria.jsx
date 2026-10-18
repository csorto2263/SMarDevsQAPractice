import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { fmtDateTime } from '../format.js';
import { PageHeader, Pagination, Spinner, usePaged } from '../components/ui.jsx';

export default function Auditoria() {
  const [rows, setRows] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');

  useEffect(() => { api('/usuarios').then(setUsuarios).catch(() => {}); }, []);
  useEffect(() => { api('/auditoria', { query: { usuario_id: usuarioId } }).then(setRows).catch(() => setRows([])); }, [usuarioId]);

  const { page, setPage, slice, total, pageSize } = usePaged(rows || [], 15);

  return (
    <>
      <PageHeader title="Bitácora de auditoría" breadcrumb="Inicio / Administración / Auditoría" />
      <div className="card">
        <div className="toolbar">
          <select style={{ width: 260 }} value={usuarioId} onChange={e => { setUsuarioId(e.target.value); setPage(1); }} data-testid="aud-usuario">
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        {!rows ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table data-testid="tabla-auditoria">
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
                <tbody>
                  {slice.length === 0 && <tr><td colSpan="5" className="empty">Sin registros</td></tr>}
                  {slice.map(a => (
                    <tr key={a.id}>
                      <td className="nowrap">{fmtDateTime(a.fecha)}</td><td>{a.usuario || '—'}</td>
                      <td><span className="badge gray">{a.accion}</span></td><td>{a.entidad}{a.entidad_id ? ` #${a.entidad_id}` : ''}</td>
                      <td>{a.detalle || '—'}</td>
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
