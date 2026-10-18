import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { can, ROLES } from '../permissions.js';

function Item({ to, icon, children, end }) {
  return (
    <NavLink to={to} end={end} data-testid={`nav-${to.replace(/\//g, '-').replace(/^-/, '') || 'dashboard'}`}>
      <span className="ico">{icon}</span>{children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const rol = user.rol;
  const iniciales = user.nombre.split(' ').map(p => p[0]).slice(0, 2).join('');
  const admin = rol === ROLES.ADMIN || rol === ROLES.BODEGUERO;

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          SMarDevs Inventario
        </div>
        <nav className="nav">
          <Item to="/" icon="▦" end>Dashboard</Item>
          <div className="nav-section">Catálogo</div>
          <Item to="/productos" icon="◫">Productos</Item>
          {can.catalogos(rol) && <Item to="/categorias" icon="☰">Categorías</Item>}
          {can.catalogos(rol) && <Item to="/bodegas" icon="⌂">Bodegas</Item>}
          {(can.clientes(rol) || can.proveedores(rol)) && <div className="nav-section">Terceros</div>}
          {can.clientes(rol) && <Item to="/clientes" icon="☺">Clientes</Item>}
          {can.proveedores(rol) && <Item to="/proveedores" icon="⛟">Provedores</Item>}
          <div className="nav-section">Operaciones</div>
          {can.compras(rol) && <Item to="/compras" icon="⇩">Compras</Item>}
          {can.inventario(rol) && <Item to="/inventario" icon="▤" end>Existencias</Item>}
          {can.inventario(rol) && <Item to="/inventario/kardex" icon="≡">Kardex</Item>}
          {can.ventas(rol) && <Item to="/ventas" icon="$">Ventas</Item>}
          {can.reportes(rol) && <Item to="/reportes" icon="▲">Reportes</Item>}
          {admin && <div className="nav-section">Administración</div>}
          {admin && <Item to="/usuarios" icon="⚙">Usuarios</Item>}
          {can.auditoria(rol) && <Item to="/auditoria" icon="⏱">Auditoría</Item>}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(o => !o)} aria-label="Abrir menú">☰</button>
          <div className="userbox">
            <div className="avatar">{iniciales}</div>
            <div className="meta">
              <div className="name" data-testid="user-name">{user.nombre}</div>
              <div className="role" data-testid="user-role">{user.rol}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={logout} data-testid="logout">Cerrar sesión</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
