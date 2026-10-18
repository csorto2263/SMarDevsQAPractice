import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Productos from './pages/Productos.jsx';
import ProductoDetalle from './pages/ProductoDetalle.jsx';
import Categorias from './pages/Categorias.jsx';
import Bodegas from './pages/Bodegas.jsx';
import Clientes from './pages/Clientes.jsx';
import ClienteDetalle from './pages/ClienteDetalle.jsx';
import Proveedores from './pages/Proveedores.jsx';
import Compras from './pages/Compras.jsx';
import CompraNueva from './pages/CompraNueva.jsx';
import CompraDetalle from './pages/CompraDetalle.jsx';
import Inventario from './pages/Inventario.jsx';
import Kardex from './pages/Kardex.jsx';
import Ventas from './pages/Ventas.jsx';
import VentaNueva from './pages/VentaNueva.jsx';
import VentaDetalle from './pages/VentaDetalle.jsx';
import Reportes from './pages/Reportes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Auditoria from './pages/Auditoria.jsx';
import { NotFound, Forbidden } from './pages/Errors.jsx';
import { can } from './permissions.js';

function Guard({ allow, children }) {
  const { user } = useAuth();
  if (!allow(user.rol)) return <Forbidden />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/productos/:id" element={<ProductoDetalle />} />
        <Route path="/categorias" element={<Guard allow={can.catalogos}><Categorias /></Guard>} />
        <Route path="/bodegas" element={<Guard allow={can.catalogos}><Bodegas /></Guard>} />
        <Route path="/clientes" element={<Guard allow={can.clientes}><Clientes /></Guard>} />
        <Route path="/clientes/:id" element={<Guard allow={can.clientes}><ClienteDetalle /></Guard>} />
        <Route path="/proveedores" element={<Guard allow={can.proveedores}><Proveedores /></Guard>} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/compras/nueva" element={<Guard allow={can.compras}><CompraNueva /></Guard>} />
        <Route path="/compras/:id" element={<CompraDetalle />} />
        <Route path="/inventario" element={<Guard allow={can.inventario}><Inventario /></Guard>} />
        <Route path="/inventario/kardex" element={<Guard allow={can.inventario}><Kardex /></Guard>} />
        <Route path="/ventas" element={<Guard allow={can.ventas}><Ventas /></Guard>} />
        <Route path="/ventas/nueva" element={<Guard allow={can.ventas}><VentaNueva /></Guard>} />
        <Route path="/ventas/:id" element={<Guard allow={can.ventas}><VentaDetalle /></Guard>} />
        <Route path="/reportes" element={<Guard allow={can.reportes}><Reportes /></Guard>} />
        <Route path="/usuarios" element={<Guard allow={can.usuarios}><Usuarios /></Guard>} />
        <Route path="/auditoria" element={<Guard allow={can.auditoria}><Auditoria /></Guard>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
