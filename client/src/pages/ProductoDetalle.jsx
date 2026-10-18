import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { can } from '../permissions.js';
import { fmtMoney, fmtDate } from '../format.js';
import { PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';

export default function ProductoDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api(`/productos/${id}`).then(setP).catch(e => setError(e.message)); }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!p) return <Spinner />;
  const margen = p.precio_venta ? ((p.precio_venta - p.precio_costo) / p.precio_venta) * 100 : 0;
  const bajo = p.stock <= p.stock_minimo;

  return (
    <>
      <PageHeader title={p.nombre} breadcrumb={<><Link to="/productos">Productos</Link> / {p.sku}</>}>
        {can.inventario(user.rol) && <Link className="btn btn-outline" to={`/inventario/kardex?producto=${p.id}`}>Ver kardex</Link>}
      </PageHeader>
      <div className="grid grid-2">
        <div className="card card-body">
          <div className="card-title">Información general</div>
          <div className="detail-grid">
            <div><div className="lbl">SKU</div><div className="val">{p.sku}</div></div>
            <div><div className="lbl">Categoría</div><div className="val">{p.categoria}</div></div>
            <div><div className="lbl">Unidad</div><div className="val">{p.unidad}</div></div>
            {can.verCostos(user.rol) && <div><div className="lbl">Precio costo</div><div className="val">{fmtMoney(p.precio_costo)}</div></div>}
            <div><div className="lbl">Precio venta</div><div className="val">{fmtMoney(p.precio_venta)}</div></div>
            {can.verCostos(user.rol) && <div><div className="lbl">Margen</div><div className="val">{margen.toFixed(1)}%</div></div>}
            <div><div className="lbl">Stock mínimo</div><div className="val">{p.stock_minimo}</div></div>
            <div><div className="lbl">Estado</div><div className="val"><StatusBadge activo={p.activo} /></div></div>
            <div><div className="lbl">Creado</div><div className="val">{fmtDate(p.created_at)}</div></div>
          </div>
          {p.descripcion && <p style={{ marginTop: 16, color: 'var(--muted)' }}>{p.descripcion}</p>}
        </div>
        <div className="card">
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <div className="card-title">Existencias por bodega {bajo && <span className="badge red">Stock bajo</span>}</div>
          </div>
          <table data-testid="existencias-producto">
            <thead><tr><th>Bodega</th><th className="num">Cantidad</th></tr></thead>
            <tbody>
              {p.existencias.map(e => <tr key={e.bodega_id}><td>{e.bodega}</td><td className="num">{e.cantidad}</td></tr>)}
              <tr><td><strong>Total</strong></td><td className="num"><strong>{p.stock}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
