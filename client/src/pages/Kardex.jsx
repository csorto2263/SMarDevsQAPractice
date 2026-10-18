import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { fmtDateTime } from '../format.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

const TIPOS = {
  ENTRADA: { label: 'Entrada', cls: 'green' },
  SALIDA: { label: 'Salida', cls: 'red' },
  AJUSTE_ENTRADA: { label: 'Ajuste (+)', cls: 'blue' },
  AJUSTE_SALIDA: { label: 'Ajuste (−)', cls: 'amber' },
};

export default function Kardex() {
  const [params, setParams] = useSearchParams();
  const productoId = params.get('producto') || '';
  const [productos, setProductos] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [bodegaId, setBodegaId] = useState('');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api('/productos', { query: { pageSize: 100, sort: 'nombre' } }).then(r => setProductos(r.data)).catch(() => {});
    api('/bodegas').then(setBodegas).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productoId) { setRows(null); return; }
    setRows(undefined);
    api(`/inventario/kardex/${productoId}`, { query: { bodega_id: bodegaId } }).then(setRows).catch(() => setRows([]));
  }, [productoId, bodegaId]);

  return (
    <>
      <PageHeader title="Kardex de producto" breadcrumb="Inicio / Operaciones / Kardex" />
      <div className="card">
        <div className="toolbar">
          <select className="grow" value={productoId} onChange={e => setParams(e.target.value ? { producto: e.target.value } : {})} data-testid="kardex-producto">
            <option value="">Selecciona un producto...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
          </select>
          <select style={{ width: 220 }} value={bodegaId} onChange={e => setBodegaId(e.target.value)} data-testid="kardex-bodega">
            <option value="">Todas las bodegas</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        {rows === null && <div className="empty">Selecciona un producto para ver sus movimientos</div>}
        {rows === undefined && <Spinner />}
        {Array.isArray(rows) && (
          <div className="table-wrap">
            <table data-testid="tabla-kardex">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Bodega</th><th>Referencia</th><th>Motivo</th><th className="num">Cantidad</th><th className="num">Saldo</th><th>Usuario</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan="8" className="empty">Sin movimientos</td></tr>}
                {rows.map(m => (
                  <tr key={m.id}>
                    <td className="nowrap">{fmtDateTime(m.fecha)}</td>
                    <td><span className={`badge ${TIPOS[m.tipo]?.cls || 'gray'}`}>{TIPOS[m.tipo]?.label || m.tipo}</span></td>
                    <td>{m.bodega}</td>
                    <td>{m.referencia}</td>
                    <td>{m.motivo}</td>
                    <td className="num">{m.tipo.includes('SALIDA') ? '−' : '+'}{m.cantidad}</td>
                    <td className="num"><strong>{m.saldo}</strong></td>
                    <td>{m.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
