import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { can } from '../permissions.js';
import { fmtMoney } from '../format.js';
import { ConfirmDialog, PageHeader, Pagination, Spinner, StatusBadge, useToast } from '../components/ui.jsx';
import ProductoForm from './ProductoForm.jsx';

const PAGE_SIZE = 20;

export default function Productos() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('');
  const [sort, setSort] = useState({ by: '', dir: 'asc' });
  const [categorias, setCategorias] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const gestionar = can.gestionarProductos(user.rol);

  const load = useCallback(() => {
    api('/productos', { query: { search, categoria_id: categoria, estado, page, pageSize: PAGE_SIZE, sort: sort.by, dir: sort.dir } })
      .then(r => { setRows(r.data); setTotal(r.total); })
      .catch(e => toast(e.message, 'error'));
  }, [search, categoria, estado, page, sort, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/categorias').then(setCategorias).catch(() => {}); }, []);

  const toggleSort = by => setSort(s => ({ by, dir: s.by === by && s.dir === 'asc' ? 'desc' : 'asc' }));
  const arrow = by => (sort.by === by ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');

  const cambiarEstado = async () => {
    try {
      await api(`/productos/${confirm.id}/estado`, { method: 'PATCH', body: { activo: !confirm.activo } });
      toast(confirm.activo ? 'Producto desactivado' : 'Producto activado');
      setConfirm(null);
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Productos" breadcrumb="Inicio / Catálogo / Productos">
        {gestionar && <button className="btn btn-primary" onClick={() => setEditing({})} data-testid="btn-nuevo-producto">+ Nuevo producto</button>}
      </PageHeader>
      <div className="card">
        <div className="toolbar">
          <input className="grow" placeholder="Buscar por SKU o nombre..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="buscar-producto" />
          <select style={{ width: 200 }} value={categoria} onChange={e => { setCategoria(e.target.value); setPage(1); }} data-testid="filtro-categoria">
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select style={{ width: 160 }} value={estado} onChange={e => { setEstado(e.target.value); setPage(1); }} data-testid="filtro-estado">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        {!rows ? <Spinner /> : (
          <div>
            <table className="products-table" data-testid="tabla-productos">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('sku')}>SKU{arrow('sku')}</th>
                  <th className="sortable" onClick={() => toggleSort('nombre')}>Nombre{arrow('nombre')}</th>
                  <th>Categoría</th>
                  <th className="num">Precio costo</th>
                  <th className="num sortable" onClick={() => toggleSort('precio')}>Precio venta{arrow('precio')}</th>
                  <th className="num sortable" onClick={() => toggleSort('stock')}>Stock{arrow('stock')}</th>
                  <th>Estado</th>
                  <th className="num">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan="8" className="empty">No se encontraron productos</td></tr>}
                {rows.map(p => (
                  <tr key={p.id}>
                    <td className="nowrap"><Link to={`/productos/${p.id}`}>{p.sku}</Link></td>
                    <td className="name-cell">{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td className="num">{fmtMoney(p.precio_costo)}</td>
                    <td className="num">{fmtMoney(p.precio_venta)}</td>
                    <td className="num">{p.stock} {p.unidad}</td>
                    <td><StatusBadge activo={p.activo} /></td>
                    <td>
                      <div className="actions">
                        <Link className="btn-icon" to={`/productos/${p.id}`} title="Ver detalle">👁</Link>
                        {gestionar && <button className="btn-icon" title="Editar" onClick={() => setEditing(p)} data-testid={`editar-${p.sku}`}>✎</button>}
                        {gestionar && (
                          <button className={`btn-icon ${p.activo ? 'danger' : ''}`} title={p.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => setConfirm(p)} data-testid={`estado-${p.sku}`}>{p.activo ? '⏻' : '↺'}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        )}
      </div>
      {editing && (
        <ProductoForm producto={editing} categorias={categorias} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }} />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.activo ? 'Desactivar producto' : 'Activar producto'}
          message={confirm.activo
            ? `¿Deseas desactivar "${confirm.nombre}"? No estará disponible para nuevas ventas.`
            : `¿Deseas activar "${confirm.nombre}"?`}
          confirmText={confirm.activo ? 'Desactivar' : 'Activar'} danger={!!confirm.activo}
          onConfirm={cambiarEstado} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}
