import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="center-page">
      <div>
        <div className="big">404</div>
        <h2>Página no encontrada</h2>
        <p style={{ color: 'var(--muted)' }}>La página que buscas no existe o fue movida.</p>
        <Link to="/" className="btn btn-primary">Ir al Dashboard</Link>
      </div>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="center-page" data-testid="forbidden">
      <div>
        <div className="big">403</div>
        <h2>Acceso denegado</h2>
        <p style={{ color: 'var(--muted)' }}>No tienes permisos para ver esta sección.</p>
        <Link to="/" className="btn btn-primary">Ir al Dashboard</Link>
      </div>
    </div>
  );
}
