export const ROLES = { ADMIN: 'Administrador', VENDEDOR: 'Vendedor', BODEGUERO: 'Bodeguero' };

export const can = {
  verCostos: rol => rol === ROLES.ADMIN || rol === ROLES.BODEGUERO,
  gestionarProductos: rol => rol === ROLES.ADMIN || rol === ROLES.BODEGUERO,
  catalogos: rol => rol === ROLES.ADMIN,
  clientes: rol => rol === ROLES.ADMIN || rol === ROLES.VENDEDOR,
  proveedores: rol => rol === ROLES.ADMIN || rol === ROLES.BODEGUERO,
  compras: rol => rol === ROLES.ADMIN || rol === ROLES.BODEGUERO,
  inventario: rol => rol === ROLES.ADMIN || rol === ROLES.BODEGUERO,
  ventas: rol => rol === ROLES.ADMIN || rol === ROLES.VENDEDOR,
  anularVentas: rol => rol === ROLES.ADMIN,
  reportes: rol => rol === ROLES.ADMIN || rol === ROLES.VENDEDOR,
  usuarios: rol => rol === ROLES.ADMIN,
  auditoria: rol => rol === ROLES.ADMIN,
};
