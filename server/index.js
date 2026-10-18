const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { open, now } = require('./db');

const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'smardevs-practica-qa';
const IVA = 0.13;

const db = open({ reset: process.argv.includes('--reset') });
const app = express();
app.use(cors());
app.use(express.json());

const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
const t2 = x => Math.floor(x * 100) / 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function audit(userId, accion, entidad, entidadId, detalle) {
  db.prepare('INSERT INTO auditoria (usuario_id,accion,entidad,entidad_id,detalle,fecha) VALUES (?,?,?,?,?,?)')
    .run(userId, accion, entidad, entidadId, detalle, now());
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión expirada, inicia sesión nuevamente' });
  }
}

const role = (...roles) => (req, res, next) =>
  roles.includes(req.user.rol) ? next() : res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });

const api = express.Router();

api.get('/health', (req, res) => res.json({ status: 'ok' }));

// ---------- Auth ----------
api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  const u = db.prepare('SELECT * FROM usuarios WHERE lower(email)=lower(?)').get(String(email).trim());
  if (!u) return res.status(401).json({ error: 'El usuario no existe' });
  if (!bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: 'Contraseña incorrecta' });
  if (!u.activo) return res.status(403).json({ error: 'Usuario inactivo, contacta al administrador' });
  const user = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
  const token = jwt.sign(user, SECRET, { expiresIn: '8h' });
  audit(u.id, 'LOGIN', 'Sesión', null, 'Inicio de sesión exitoso');
  res.json({ token, user });
});

api.use(auth);

api.get('/auth/me', (req, res) => res.json(req.user));
api.post('/auth/logout', (req, res) => {
  audit(req.user.id, 'LOGOUT', 'Sesión', null, 'Cierre de sesión');
  res.json({ ok: true });
});

// ---------- Usuarios ----------
api.get('/usuarios', role('Administrador'), (req, res) => {
  res.json(db.prepare('SELECT * FROM usuarios ORDER BY nombre').all());
});

function validarUsuario(b, isNew) {
  if (!b.nombre || b.nombre.trim().length < 3 || b.nombre.trim().length > 60) return 'El nombre debe tener entre 3 y 60 caracteres';
  if (!b.email || !EMAIL_RE.test(b.email)) return 'Ingresa un correo electrónico válido';
  if (!['Administrador', 'Vendedor', 'Bodeguero'].includes(b.rol)) return 'Selecciona un rol válido';
  if (isNew || b.password) {
    if (!b.password || b.password.length < 8 || !/\d/.test(b.password)) return 'La contraseña debe tener al menos 8 caracteres y un número';
  }
  return null;
}

api.post('/usuarios', role('Administrador'), (req, res) => {
  const b = req.body;
  const err = validarUsuario(b, true);
  if (err) return res.status(422).json({ error: err });
  if (db.prepare('SELECT id FROM usuarios WHERE lower(email)=lower(?)').get(b.email)) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  const id = db.prepare('INSERT INTO usuarios (nombre,email,password_hash,rol,activo,created_at) VALUES (?,?,?,?,1,?)')
    .run(b.nombre.trim(), b.email.trim().toLowerCase(), bcrypt.hashSync(b.password, 8), b.rol, now()).lastInsertRowid;
  audit(req.user.id, 'CREAR', 'Usuario', id, `Creó el usuario ${b.email}`);
  res.status(201).json({ id });
});

api.put('/usuarios/:id', role('Administrador'), (req, res) => {
  const b = req.body;
  const err = validarUsuario(b, false);
  if (err) return res.status(422).json({ error: err });
  const dup = db.prepare('SELECT id FROM usuarios WHERE lower(email)=lower(?) AND id<>?').get(b.email, req.params.id);
  if (dup) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  db.prepare('UPDATE usuarios SET nombre=?, email=?, rol=? WHERE id=?').run(b.nombre.trim(), b.email.trim().toLowerCase(), b.rol, req.params.id);
  if (b.password) db.prepare('UPDATE usuarios SET password_hash=? WHERE id=?').run(bcrypt.hashSync(b.password, 8), req.params.id);
  audit(req.user.id, 'EDITAR', 'Usuario', +req.params.id, `Editó el usuario ${b.email}`);
  res.json({ ok: true });
});

api.patch('/usuarios/:id/estado', role('Administrador'), (req, res) => {
  if (+req.params.id === req.user.id) return res.status(422).json({ error: 'No puedes desactivar tu propio usuario' });
  db.prepare('UPDATE usuarios SET activo=? WHERE id=?').run(req.body.activo ? 1 : 0, req.params.id);
  audit(req.user.id, req.body.activo ? 'ACTIVAR' : 'DESACTIVAR', 'Usuario', +req.params.id, null);
  res.json({ ok: true });
});

// ---------- Catálogos ----------
api.get('/categorias', (req, res) => {
  res.json(db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM productos p WHERE p.categoria_id=c.id) AS productos
    FROM categorias c ORDER BY c.nombre`).all());
});

function validarCategoria(b) {
  const n = (b.nombre || '').trim();
  if (n.length < 3 || n.length > 40) return 'El nombre debe tener entre 3 y 40 caracteres';
  return null;
}

api.post('/categorias', role('Administrador'), (req, res) => {
  const err = validarCategoria(req.body);
  if (err) return res.status(422).json({ error: err });
  if (db.prepare('SELECT id FROM categorias WHERE lower(nombre)=lower(?)').get(req.body.nombre.trim()))
    return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
  const id = db.prepare('INSERT INTO categorias (nombre, descripcion) VALUES (?,?)').run(req.body.nombre.trim(), req.body.descripcion || null).lastInsertRowid;
  audit(req.user.id, 'CREAR', 'Categoría', id, req.body.nombre);
  res.status(201).json({ id });
});

api.put('/categorias/:id', role('Administrador'), (req, res) => {
  const err = validarCategoria(req.body);
  if (err) return res.status(422).json({ error: err });
  if (db.prepare('SELECT id FROM categorias WHERE lower(nombre)=lower(?) AND id<>?').get(req.body.nombre.trim(), req.params.id))
    return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
  db.prepare('UPDATE categorias SET nombre=?, descripcion=? WHERE id=?').run(req.body.nombre.trim(), req.body.descripcion || null, req.params.id);
  audit(req.user.id, 'EDITAR', 'Categoría', +req.params.id, req.body.nombre);
  res.json({ ok: true });
});

api.delete('/categorias/:id', role('Administrador'), (req, res) => {
  db.prepare('DELETE FROM categorias WHERE id=?').run(req.params.id);
  audit(req.user.id, 'ELIMINAR', 'Categoría', +req.params.id, null);
  res.json({ ok: true });
});

api.get('/unidades', (req, res) => res.json(db.prepare('SELECT * FROM unidades ORDER BY nombre').all()));

api.get('/bodegas', (req, res) => res.json(db.prepare('SELECT * FROM bodegas ORDER BY id').all()));

api.post('/bodegas', role('Administrador'), (req, res) => {
  const n = (req.body.nombre || '').trim();
  if (n.length < 3 || n.length > 50) return res.status(422).json({ error: 'El nombre debe tener entre 3 y 50 caracteres' });
  if (db.prepare('SELECT id FROM bodegas WHERE lower(nombre)=lower(?)').get(n)) return res.status(409).json({ error: 'Ya existe una bodega con ese nombre' });
  const id = db.prepare('INSERT INTO bodegas (nombre, ubicacion) VALUES (?,?)').run(n, req.body.ubicacion || null).lastInsertRowid;
  db.prepare('INSERT INTO existencias (producto_id,bodega_id,cantidad) SELECT id, ?, 0 FROM productos').run(id);
  audit(req.user.id, 'CREAR', 'Bodega', id, n);
  res.status(201).json({ id });
});

api.put('/bodegas/:id', role('Administrador'), (req, res) => {
  const n = (req.body.nombre || '').trim();
  if (n.length < 3 || n.length > 50) return res.status(422).json({ error: 'El nombre debe tener entre 3 y 50 caracteres' });
  db.prepare('UPDATE bodegas SET nombre=?, ubicacion=?, activo=? WHERE id=?').run(n, req.body.ubicacion || null, req.body.activo ? 1 : 0, req.params.id);
  audit(req.user.id, 'EDITAR', 'Bodega', +req.params.id, n);
  res.json({ ok: true });
});

// ---------- Productos ----------
const PRODUCT_SELECT = `SELECT p.*, c.nombre AS categoria, u.abreviatura AS unidad,
  COALESCE((SELECT SUM(cantidad) FROM existencias e WHERE e.producto_id=p.id),0) AS stock
  FROM productos p JOIN categorias c ON c.id=p.categoria_id JOIN unidades u ON u.id=p.unidad_id`;

api.get('/productos', (req, res) => {
  const { search, categoria_id, estado, disponibles } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10));
  const where = [];
  const params = [];
  if (search) { where.push('p.nombre LIKE ?'); params.push(`%${search}%`); }
  if (categoria_id) { where.push('p.categoria_id = ?'); params.push(categoria_id); }
  if (estado === 'activo') where.push('p.activo = 1');
  if (estado === 'inactivo') where.push('p.activo = 0');
  if (disponibles) where.push('p.activo = 1');
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM productos p${w}`).get(...params).c;
  const sortMap = { nombre: 'p.nombre', sku: 'p.sku', precio: 'p.precio_venta', stock: 'stock' };
  const sort = sortMap[req.query.sort] || 'p.id';
  const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';
  const rows = db.prepare(`${PRODUCT_SELECT}${w} ORDER BY ${sort} ${dir} LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize);
  res.json({ data: rows, total, page, pageSize });
});

api.get('/productos/:id', (req, res) => {
  const p = db.prepare(`${PRODUCT_SELECT} WHERE p.id=?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  p.existencias = db.prepare(`SELECT b.id AS bodega_id, b.nombre AS bodega, COALESCE(e.cantidad,0) AS cantidad
    FROM bodegas b LEFT JOIN existencias e ON e.bodega_id=b.id AND e.producto_id=? ORDER BY b.id`).all(req.params.id);
  res.json(p);
});

function validarProducto(b) {
  const sku = (b.sku || '').trim();
  if (!/^[A-Za-z0-9-]{3,12}$/.test(sku)) return 'El SKU debe tener entre 3 y 12 caracteres (letras, números o guion)';
  const n = (b.nombre || '').trim();
  if (n.length < 3 || n.length > 80) return 'El nombre debe tener entre 3 y 80 caracteres';
  if (!b.categoria_id) return 'Selecciona una categoría';
  if (!b.unidad_id) return 'Selecciona una unidad de medida';
  const costo = Number(b.precio_costo), venta = Number(b.precio_venta);
  if (!(costo > 0)) return 'El precio de costo debe ser mayor a 0';
  if (!(venta > 0)) return 'El precio de venta debe ser mayor a 0';
  if (venta < costo) return 'Precio inválido';
  const min = Number(b.stock_minimo);
  if (!Number.isInteger(min) || min < 0) return 'El stock mínimo debe ser un número entero mayor o igual a 0';
  return null;
}

api.post('/productos', role('Administrador', 'Bodeguero'), (req, res) => {
  const b = req.body;
  const err = validarProducto(b);
  if (err) return res.status(422).json({ error: err });
  const sku = b.sku.trim();
  if (db.prepare('SELECT id FROM productos WHERE sku=?').get(sku)) return res.status(409).json({ error: 'Ya existe un producto con ese SKU' });
  const id = db.transaction(() => {
    const pid = db.prepare(`INSERT INTO productos (sku,nombre,descripcion,categoria_id,unidad_id,precio_costo,precio_venta,stock_minimo,activo,created_at)
      VALUES (?,?,?,?,?,?,?,?,1,?)`).run(sku, b.nombre.trim(), b.descripcion || null, b.categoria_id, b.unidad_id,
      Number(b.precio_costo), Number(b.precio_venta), Number(b.stock_minimo), now()).lastInsertRowid;
    db.prepare('INSERT INTO existencias (producto_id,bodega_id,cantidad) SELECT ?, id, 0 FROM bodegas').run(pid);
    return pid;
  })();
  audit(req.user.id, 'CREAR', 'Producto', id, `Creó el producto ${sku}`);
  res.status(201).json({ id });
});

api.put('/productos/:id', (req, res) => {
  const b = req.body;
  const err = validarProducto(b);
  if (err) return res.status(422).json({ error: err });
  const sku = b.sku.trim();
  if (db.prepare('SELECT id FROM productos WHERE sku=? AND id<>?').get(sku, req.params.id)) return res.status(409).json({ error: 'Ya existe un producto con ese SKU' });
  db.prepare(`UPDATE productos SET sku=?, nombre=?, descripcion=?, categoria_id=?, unidad_id=?, precio_costo=?, precio_venta=?, stock_minimo=? WHERE id=?`)
    .run(sku, b.nombre.trim(), b.descripcion || null, b.categoria_id, b.unidad_id, Number(b.precio_costo), Number(b.precio_venta), Number(b.stock_minimo), req.params.id);
  audit(req.user.id, 'EDITAR', 'Producto', +req.params.id, `Editó el producto ${sku}`);
  res.json({ ok: true });
});

api.patch('/productos/:id/estado', role('Administrador', 'Bodeguero'), (req, res) => {
  db.prepare('UPDATE productos SET activo=? WHERE id=?').run(req.body.activo ? 1 : 0, req.params.id);
  audit(req.user.id, req.body.activo ? 'ACTIVAR' : 'DESACTIVAR', 'Producto', +req.params.id, null);
  res.json({ ok: true });
});

// ---------- Clientes ----------
api.get('/clientes', role('Administrador', 'Vendedor'), (req, res) => {
  const { search, activo } = req.query;
  let sql = 'SELECT * FROM clientes';
  const where = [];
  if (search) where.push(`(nombre GLOB '*${search}*' OR documento GLOB '*${search}*')`);
  if (activo === '1') where.push('activo = 1');
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  res.json(db.prepare(`${sql} ORDER BY nombre`).all());
});

api.get('/clientes/:id', role('Administrador', 'Vendedor'), (req, res) => {
  const c = db.prepare('SELECT * FROM clientes WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
  c.ventas = db.prepare('SELECT id, numero, fecha, total, estado, condicion FROM ventas WHERE cliente_id=? ORDER BY fecha DESC LIMIT 10').all(req.params.id);
  res.json(c);
});

function validarCliente(b) {
  const n = (b.nombre || '').trim();
  if (n.length < 3) return { status: 422, error: 'El nombre debe tener entre 3 y 80 caracteres' };
  if (!/^\d{8}-\d$/.test(b.documento || '')) return { status: 422, error: 'El DUI debe tener el formato 00000000-0' };
  if (!b.email || !EMAIL_RE.test(b.email)) return { status: 200, error: 'Ingresa un correo electrónico válido' };
  if (!/^\d{4}-\d{3,4}$/.test(b.telefono || '')) return { status: 422, error: 'El teléfono debe tener el formato 0000-0000' };
  if (!['Contado', 'Crédito'].includes(b.tipo)) return { status: 422, error: 'Selecciona el tipo de cliente' };
  if (b.tipo === 'Crédito' && !(Number(b.limite_credito) > 0)) return { status: 422, error: 'El límite de crédito debe ser mayor a 0 para clientes de crédito' };
  return null;
}

api.post('/clientes', role('Administrador', 'Vendedor'), (req, res) => {
  const b = req.body;
  const err = validarCliente(b);
  if (err) return res.status(err.status).json({ error: err.error });
  if (db.prepare('SELECT id FROM clientes WHERE documento=?').get(b.documento)) return res.status(409).json({ error: 'Ya existe un cliente con ese documento' });
  const id = db.prepare(`INSERT INTO clientes (nombre,documento,email,telefono,direccion,tipo,limite_credito,saldo_pendiente,activo,created_at)
    VALUES (?,?,?,?,?,?,?,0,1,?)`).run(b.nombre.trim(), b.documento, b.email.trim(), b.telefono, b.direccion || null, b.tipo,
    b.tipo === 'Crédito' ? Number(b.limite_credito) : 0, now()).lastInsertRowid;
  audit(req.user.id, 'CREAR', 'Cliente', id, `Creó el cliente ${b.nombre}`);
  res.status(201).json({ id });
});

api.put('/clientes/:id', role('Administrador', 'Vendedor'), (req, res) => {
  const b = req.body;
  const err = validarCliente(b);
  if (err) return res.status(err.status).json({ error: err.error });
  if (db.prepare('SELECT id FROM clientes WHERE documento=? AND id<>?').get(b.documento, req.params.id)) return res.status(409).json({ error: 'Ya existe un cliente con ese documento' });
  db.prepare('UPDATE clientes SET nombre=?, documento=?, email=?, telefono=?, direccion=?, tipo=?, limite_credito=? WHERE id=?')
    .run(b.nombre.trim(), b.documento, b.email.trim(), b.telefono, b.direccion || null, b.tipo, b.tipo === 'Crédito' ? Number(b.limite_credito) : 0, req.params.id);
  audit(req.user.id, 'EDITAR', 'Cliente', +req.params.id, `Editó el cliente ${b.nombre}`);
  res.json({ ok: true });
});

api.patch('/clientes/:id/estado', role('Administrador', 'Vendedor'), (req, res) => {
  db.prepare('UPDATE clientes SET activo=? WHERE id=?').run(req.body.activo ? 1 : 0, req.params.id);
  audit(req.user.id, req.body.activo ? 'ACTIVAR' : 'DESACTIVAR', 'Cliente', +req.params.id, null);
  res.json({ ok: true });
});

// ---------- Proveedores ----------
api.get('/proveedores', role('Administrador', 'Bodeguero'), (req, res) => {
  const { search, activo } = req.query;
  const where = [];
  const params = [];
  if (search) { where.push('(razon_social LIKE ? OR nit LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (activo === '1') where.push('activo = 1');
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  res.json(db.prepare(`SELECT * FROM proveedores${w} ORDER BY razon_social`).all(...params));
});

function validarProveedor(b) {
  const n = (b.razon_social || '').trim();
  if (n.length < 3 || n.length > 100) return 'La razón social debe tener entre 3 y 100 caracteres';
  if (!/^\d{4}-\d{6}-\d{3}-\d$/.test(b.nit || '')) return 'El NIT debe tener el formato 0000-000000-000-0';
  if (!b.email || !EMAIL_RE.test(b.email)) return 'Ingresa un correo electrónico válido';
  if (!/^\d{4}-\d{4}$/.test(b.telefono || '')) return 'El teléfono debe tener el formato 0000-0000';
  const d = Number(b.dias_credito);
  if (!Number.isInteger(d) || d < 0 || d > 120) return 'Los días de crédito deben estar entre 0 y 90';
  return null;
}

api.post('/proveedores', role('Administrador', 'Bodeguero'), (req, res) => {
  const b = req.body;
  const err = validarProveedor(b);
  if (err) return res.status(422).json({ error: err });
  if (db.prepare('SELECT id FROM proveedores WHERE nit=?').get(b.nit)) return res.status(409).json({ error: 'Ya existe un proveedor con ese NIT' });
  const id = db.prepare(`INSERT INTO proveedores (razon_social,nit,contacto,email,telefono,direccion,dias_credito,activo,created_at)
    VALUES (?,?,?,?,?,?,?,1,?)`).run(b.razon_social.trim(), b.nit, b.contacto || null, b.email.trim(), b.telefono, b.direccion || null, Number(b.dias_credito), now()).lastInsertRowid;
  audit(req.user.id, 'CREAR', 'Proveedor', id, `Creó el proveedor ${b.razon_social}`);
  res.status(201).json({ id });
});

api.put('/proveedores/:id', role('Administrador', 'Bodeguero'), (req, res) => {
  const b = req.body;
  const err = validarProveedor(b);
  if (err) return res.status(422).json({ error: err });
  if (db.prepare('SELECT id FROM proveedores WHERE nit=? AND id<>?').get(b.nit, req.params.id)) return res.status(409).json({ error: 'Ya existe un proveedor con ese NIT' });
  db.prepare('UPDATE proveedores SET razon_social=?, nit=?, contacto=?, email=?, telefono=?, direccion=?, dias_credito=? WHERE id=?')
    .run(b.razon_social.trim(), b.nit, b.contacto || null, b.email.trim(), b.telefono, b.direccion || null, Number(b.dias_credito), req.params.id);
  audit(req.user.id, 'EDITAR', 'Proveedor', +req.params.id, `Editó el proveedor ${b.razon_social}`);
  res.json({ ok: true });
});

api.patch('/proveedores/:id/estado', role('Administrador', 'Bodeguero'), (req, res) => {
  db.prepare('UPDATE proveedores SET activo=? WHERE id=?').run(req.body.activo ? 1 : 0, req.params.id);
  audit(req.user.id, req.body.activo ? 'ACTIVAR' : 'DESACTIVAR', 'Proveedor', +req.params.id, null);
  res.json({ ok: true });
});

// ---------- Inventario helpers ----------
const getStock = db.prepare('SELECT cantidad FROM existencias WHERE producto_id=? AND bodega_id=?');
const setStock = db.prepare('UPDATE existencias SET cantidad=? WHERE producto_id=? AND bodega_id=?');
const insMov = db.prepare(`INSERT INTO movimientos (producto_id,bodega_id,tipo,cantidad,saldo,referencia,motivo,usuario_id,fecha)
  VALUES (?,?,?,?,?,?,?,?,?)`);

function moverStock(pid, bod, delta, tipo, ref, motivo, userId) {
  let row = getStock.get(pid, bod);
  if (!row) {
    db.prepare('INSERT INTO existencias (producto_id,bodega_id,cantidad) VALUES (?,?,0)').run(pid, bod);
    row = { cantidad: 0 };
  }
  const saldo = row.cantidad + delta;
  setStock.run(saldo, pid, bod);
  insMov.run(pid, bod, tipo, Math.abs(delta), saldo, ref, motivo, userId, now());
  return saldo;
}

// ---------- Compras ----------
api.get('/compras', (req, res) => {
  const { estado } = req.query;
  const w = estado ? ' WHERE c.estado = ?' : '';
  const rows = db.prepare(`SELECT c.*, p.razon_social AS proveedor, b.nombre AS bodega,
    (SELECT COUNT(*) FROM compra_detalle d WHERE d.compra_id=c.id) AS items
    FROM compras c JOIN proveedores p ON p.id=c.proveedor_id JOIN bodegas b ON b.id=c.bodega_id${w} ORDER BY c.fecha DESC`)
    .all(...(estado ? [estado] : []));
  res.json(rows);
});

api.get('/compras/:id', (req, res) => {
  const c = db.prepare(`SELECT c.*, p.razon_social AS proveedor, p.nit, b.nombre AS bodega, u.nombre AS usuario
    FROM compras c JOIN proveedores p ON p.id=c.proveedor_id JOIN bodegas b ON b.id=c.bodega_id JOIN usuarios u ON u.id=c.usuario_id WHERE c.id=?`).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Orden de compra no encontrada' });
  c.detalle = db.prepare(`SELECT d.*, pr.sku, pr.nombre FROM compra_detalle d JOIN productos pr ON pr.id=d.producto_id WHERE d.compra_id=?`).all(req.params.id);
  res.json(c);
});

api.post('/compras', role('Administrador', 'Bodeguero'), (req, res) => {
  const { proveedor_id, bodega_id, lineas, notas } = req.body;
  const prov = db.prepare('SELECT * FROM proveedores WHERE id=?').get(proveedor_id);
  if (!prov || !prov.activo) return res.status(422).json({ error: 'Selecciona un proveedor activo' });
  if (!db.prepare('SELECT id FROM bodegas WHERE id=? AND activo=1').get(bodega_id)) return res.status(422).json({ error: 'Selecciona una bodega' });
  if (!Array.isArray(lineas) || lineas.length === 0) return res.status(422).json({ error: 'Agrega al menos un producto a la orden' });
  for (const l of lineas) {
    if (!Number.isInteger(Number(l.cantidad)) || Number(l.cantidad) < 1) return res.status(422).json({ error: 'La cantidad debe ser un número entero mayor a 0' });
    if (!(Number(l.costo_unitario) > 0)) return res.status(422).json({ error: 'El costo unitario debe ser mayor a 0' });
  }
  const id = db.transaction(() => {
    const n = db.prepare('SELECT COUNT(*) c FROM compras').get().c + 1;
    const numero = `OC-${String(n).padStart(5, '0')}`;
    const total = r2(lineas.reduce((s, l) => s + Number(l.cantidad) * Number(l.costo_unitario), 0));
    const cid = db.prepare(`INSERT INTO compras (numero,proveedor_id,bodega_id,fecha,estado,total,notas,usuario_id) VALUES (?,?,?,?, 'Pendiente', ?,?,?)`)
      .run(numero, proveedor_id, bodega_id, now(), total, notas || null, req.user.id).lastInsertRowid;
    const ins = db.prepare('INSERT INTO compra_detalle (compra_id,producto_id,cantidad,costo_unitario,subtotal) VALUES (?,?,?,?,?)');
    lineas.forEach(l => ins.run(cid, l.producto_id, Number(l.cantidad), Number(l.costo_unitario), r2(Number(l.cantidad) * Number(l.costo_unitario))));
    audit(req.user.id, 'CREAR', 'Compra', cid, `Creó la orden ${numero}`);
    return cid;
  })();
  res.status(201).json({ id });
});

api.post('/compras/:id/recibir', role('Administrador', 'Bodeguero'), (req, res) => {
  const c = db.prepare('SELECT * FROM compras WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Orden de compra no encontrada' });
  if (c.estado === 'Cancelada') return res.status(422).json({ error: 'La orden está cancelada' });
  const detalle = db.prepare('SELECT * FROM compra_detalle WHERE compra_id=?').all(c.id);
  db.transaction(() => {
    detalle.forEach(d => moverStock(d.producto_id, c.bodega_id, d.cantidad, 'ENTRADA', c.numero, 'Recepción de compra', req.user.id));
    db.prepare("UPDATE compras SET estado='Recibida', fecha_recepcion=? WHERE id=?").run(now(), c.id);
    audit(req.user.id, 'RECIBIR', 'Compra', c.id, `Recibió la orden ${c.numero}`);
  })();
  res.json({ ok: true });
});

api.post('/compras/:id/cancelar', role('Administrador', 'Bodeguero'), (req, res) => {
  const c = db.prepare('SELECT * FROM compras WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Orden de compra no encontrada' });
  if (c.estado !== 'Pendiente') return res.status(422).json({ error: 'Solo se pueden cancelar órdenes pendientes' });
  db.prepare("UPDATE compras SET estado='Cancelada' WHERE id=?").run(c.id);
  audit(req.user.id, 'CANCELAR', 'Compra', c.id, `Canceló la orden ${c.numero}`);
  res.json({ ok: true });
});

// ---------- Inventario ----------
api.get('/inventario/existencias', role('Administrador', 'Bodeguero'), (req, res) => {
  const bodegas = db.prepare('SELECT id, nombre FROM bodegas ORDER BY id').all();
  const productos = db.prepare(`SELECT p.id, p.sku, p.nombre, p.stock_minimo, c.nombre AS categoria FROM productos p
    JOIN categorias c ON c.id=p.categoria_id WHERE p.activo=1 ORDER BY p.nombre`).all();
  const ex = db.prepare('SELECT * FROM existencias').all();
  const map = {};
  ex.forEach(e => { (map[e.producto_id] = map[e.producto_id] || {})[e.bodega_id] = e.cantidad; });
  const rows = productos.map(p => {
    const porBodega = bodegas.map(b => (map[p.id] || {})[b.id] || 0);
    const total = porBodega.reduce((a, b) => a + b, 0);
    return { ...p, porBodega, total, bajo: total < p.stock_minimo };
  });
  res.json({ bodegas, productos: rows });
});

api.post('/inventario/ajustes', role('Administrador', 'Bodeguero'), (req, res) => {
  const { producto_id, bodega_id, tipo, cantidad, motivo } = req.body;
  if (!producto_id) return res.status(422).json({ error: 'Selecciona un producto' });
  if (!bodega_id) return res.status(422).json({ error: 'Selecciona una bodega' });
  if (!['ENTRADA', 'SALIDA'].includes(tipo)) return res.status(422).json({ error: 'Selecciona el tipo de ajuste' });
  const q = Number(cantidad);
  if (!Number.isInteger(q) || q < 1) return res.status(422).json({ error: 'La cantidad debe ser un número entero mayor a 0' });
  if (!motivo || !motivo.trim()) return res.status(422).json({ error: 'El motivo debe tener al menos 10 caracteres' });
  const actual = (getStock.get(producto_id, bodega_id) || { cantidad: 0 }).cantidad;
  if (tipo === 'SALIDA' && q > actual) return res.status(422).json({ error: 'Stock insuficiente para realizar el ajuste' });
  const saldo = db.transaction(() => {
    const s = moverStock(producto_id, bodega_id, tipo === 'ENTRADA' ? q : -q, `AJUSTE_${tipo}`, 'AJUSTE', motivo.trim(), req.user.id);
    audit(req.user.id, 'AJUSTE', 'Inventario', +producto_id, `${tipo} de ${q} unidades: ${motivo.trim()}`);
    return s;
  })();
  res.status(201).json({ saldo });
});

api.get('/inventario/kardex/:productoId', role('Administrador', 'Bodeguero'), (req, res) => {
  const { bodega_id } = req.query;
  const params = [req.params.productoId];
  let w = 'm.producto_id = ?';
  if (bodega_id) { w += ' AND m.bodega_id = ?'; params.push(bodega_id); }
  res.json(db.prepare(`SELECT m.*, b.nombre AS bodega, u.nombre AS usuario FROM movimientos m
    JOIN bodegas b ON b.id=m.bodega_id LEFT JOIN usuarios u ON u.id=m.usuario_id WHERE ${w} ORDER BY m.fecha ASC, m.id ASC`).all(...params));
});

// ---------- Ventas ----------
api.get('/ventas', role('Administrador', 'Vendedor'), (req, res) => {
  const { desde, hasta, estado, search } = req.query;
  const where = [];
  const params = [];
  if (desde) { where.push('v.fecha >= ?'); params.push(desde); }
  if (hasta) { where.push('v.fecha <= ?'); params.push(`${hasta} 23:59:59`); }
  if (estado) { where.push('v.estado = ?'); params.push(estado); }
  if (search) { where.push('(v.numero LIKE ? OR c.nombre LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  res.json(db.prepare(`SELECT v.*, c.nombre AS cliente, u.nombre AS vendedor FROM ventas v
    JOIN clientes c ON c.id=v.cliente_id JOIN usuarios u ON u.id=v.usuario_id${w} ORDER BY v.fecha DESC`).all(...params));
});

api.get('/ventas/:id', role('Administrador', 'Vendedor'), (req, res) => {
  const v = db.prepare(`SELECT v.*, c.nombre AS cliente, c.documento, c.direccion, c.email AS cliente_email, b.nombre AS bodega, u.nombre AS vendedor
    FROM ventas v JOIN clientes c ON c.id=v.cliente_id JOIN bodegas b ON b.id=v.bodega_id JOIN usuarios u ON u.id=v.usuario_id WHERE v.id=?`).get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Venta no encontrada' });
  v.detalle = db.prepare(`SELECT d.*, p.sku, p.nombre FROM venta_detalle d JOIN productos p ON p.id=d.producto_id WHERE d.venta_id=?`).all(req.params.id);
  res.json(v);
});

api.post('/ventas', role('Administrador', 'Vendedor'), (req, res) => {
  const { cliente_id, bodega_id, condicion, lineas } = req.body;
  const cli = db.prepare('SELECT * FROM clientes WHERE id=?').get(cliente_id);
  if (!cli) return res.status(422).json({ error: 'Selecciona un cliente' });
  if (!db.prepare('SELECT id FROM bodegas WHERE id=? AND activo=1').get(bodega_id)) return res.status(422).json({ error: 'Selecciona una bodega' });
  if (!Array.isArray(lineas) || lineas.length === 0) return res.status(422).json({ error: 'Agrega al menos un producto a la venta' });
  const cond = condicion === 'Crédito' ? 'Crédito' : 'Contado';
  if (cond === 'Crédito' && cli.tipo !== 'Crédito') return res.status(422).json({ error: 'El cliente no tiene crédito autorizado' });

  let bruto = 0, subtotal = 0;
  const det = [];
  for (const l of lineas) {
    const p = db.prepare('SELECT * FROM productos WHERE id=?').get(l.producto_id);
    if (!p || !p.activo) return res.status(422).json({ error: 'Producto no disponible para la venta' });
    const q = Number(l.cantidad);
    if (!Number.isInteger(q) || q < 1) return res.status(422).json({ error: 'La cantidad debe ser un número entero mayor a 0' });
    const d = Number(l.descuento) || 0;
    if (d < 0 || d > 50) return res.status(422).json({ error: 'El descuento debe estar entre 0% y 50%' });
    const st = r2(q * p.precio_venta * (1 - d / 100));
    bruto += q * p.precio_venta;
    subtotal += st;
    det.push({ producto_id: p.id, cantidad: q, precio_unitario: p.precio_venta, descuento: d, subtotal: st });
  }
  subtotal = r2(subtotal);
  const iva = t2(bruto * IVA);
  const total = r2(subtotal + iva);

  if (cond === 'Crédito' && total > cli.limite_credito)
    return res.status(422).json({ error: 'La venta excede el límite de crédito del cliente' });

  const result = db.transaction(() => {
    const n = db.prepare('SELECT COUNT(*) c FROM ventas').get().c + 1;
    const numero = `V-${String(n).padStart(6, '0')}`;
    const vid = db.prepare(`INSERT INTO ventas (numero,cliente_id,bodega_id,fecha,condicion,subtotal,iva,total,estado,usuario_id)
      VALUES (?,?,?,?,?,?,?,?, 'Emitida', ?)`).run(numero, cli.id, bodega_id, now(), cond, subtotal, iva, total, req.user.id).lastInsertRowid;
    const ins = db.prepare('INSERT INTO venta_detalle (venta_id,producto_id,cantidad,precio_unitario,descuento,subtotal) VALUES (?,?,?,?,?,?)');
    det.forEach(d => {
      ins.run(vid, d.producto_id, d.cantidad, d.precio_unitario, d.descuento, d.subtotal);
      moverStock(d.producto_id, bodega_id, -d.cantidad, 'SALIDA', numero, 'Venta', req.user.id);
    });
    if (cond === 'Crédito') db.prepare('UPDATE clientes SET saldo_pendiente = saldo_pendiente + ? WHERE id=?').run(total, cli.id);
    audit(req.user.id, 'CREAR', 'Venta', vid, `Registró la venta ${numero} por $${total.toFixed(2)}`);
    return { id: vid, numero };
  })();
  res.status(201).json(result);
});

api.post('/ventas/:id/anular', role('Administrador'), (req, res) => {
  const v = db.prepare('SELECT * FROM ventas WHERE id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Venta no encontrada' });
  if (v.estado === 'Anulada') return res.status(422).json({ error: 'La venta ya se encuentra anulada' });
  const motivo = (req.body.motivo || '').trim();
  if (motivo.length < 10) return res.status(422).json({ error: 'El motivo de anulación debe tener al menos 10 caracteres' });
  const detalle = db.prepare('SELECT * FROM venta_detalle WHERE venta_id=?').all(v.id);
  db.transaction(() => {
    detalle.forEach(d => {
      const actual = (getStock.get(d.producto_id, v.bodega_id) || { cantidad: 0 }).cantidad;
      insMov.run(d.producto_id, v.bodega_id, 'ENTRADA', d.cantidad, actual + d.cantidad, v.numero, 'Anulación de venta', req.user.id, now());
    });
    db.prepare("UPDATE ventas SET estado='Anulada', motivo_anulacion=? WHERE id=?").run(motivo, v.id);
    if (v.condicion === 'Crédito') db.prepare('UPDATE clientes SET saldo_pendiente = MAX(0, saldo_pendiente - ?) WHERE id=?').run(v.total, v.cliente_id);
    audit(req.user.id, 'ANULAR', 'Venta', v.id, `Anuló la venta ${v.numero}: ${motivo}`);
  })();
  res.json({ ok: true });
});

// ---------- Dashboard y reportes ----------
api.get('/dashboard', (req, res) => {
  const hoy = now().slice(0, 10);
  const mes = hoy.slice(0, 7);
  const ventasHoy = db.prepare("SELECT COALESCE(SUM(total),0) t, COUNT(*) n FROM ventas WHERE substr(fecha,1,10)=? AND estado='Emitida'").get(hoy);
  const ventasMes = db.prepare('SELECT COALESCE(SUM(total),0) t, COUNT(*) n FROM ventas WHERE substr(fecha,1,7)=?').get(mes);
  const stockBajo = db.prepare(`SELECT COUNT(*) c FROM (SELECT p.id, p.stock_minimo, COALESCE(SUM(e.cantidad),0) s FROM productos p
    LEFT JOIN existencias e ON e.producto_id=p.id WHERE p.activo=1 GROUP BY p.id) WHERE s < stock_minimo`).get().c;
  const top = db.prepare(`SELECT p.sku, p.nombre, SUM(d.cantidad) cantidad, SUM(d.subtotal) monto FROM venta_detalle d
    JOIN ventas v ON v.id=d.venta_id JOIN productos p ON p.id=d.producto_id
    WHERE substr(v.fecha,1,7)=? AND v.estado='Emitida' GROUP BY p.id ORDER BY cantidad DESC LIMIT 5`).all(mes);
  const ultimas = db.prepare(`SELECT v.id, v.numero, v.fecha, v.total, v.estado, c.nombre AS cliente FROM ventas v
    JOIN clientes c ON c.id=v.cliente_id ORDER BY v.fecha DESC LIMIT 5`).all();
  const porDia = db.prepare(`SELECT substr(fecha,1,10) dia, SUM(total) total FROM ventas WHERE estado='Emitida'
    AND fecha >= date('now','localtime','-13 days') GROUP BY dia ORDER BY dia`).all();
  res.json({
    ventasHoy: r2(ventasHoy.t), transaccionesHoy: ventasHoy.n,
    ventasMes: r2(ventasMes.t), transaccionesMes: ventasMes.n,
    stockBajo, top, ultimas, porDia,
  });
});

api.get('/reportes/ventas', role('Administrador', 'Vendedor'), (req, res) => {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) return res.status(422).json({ error: 'Selecciona el rango de fechas' });
  if (desde > hasta) return res.status(422).json({ error: 'La fecha inicial no puede ser mayor a la final' });
  const rows = db.prepare(`SELECT v.numero, v.fecha, c.nombre AS cliente, v.condicion, v.subtotal, v.iva, v.total, v.estado, u.nombre AS vendedor
    FROM ventas v JOIN clientes c ON c.id=v.cliente_id JOIN usuarios u ON u.id=v.usuario_id
    WHERE v.fecha >= ? AND v.fecha < ? ORDER BY v.fecha`).all(desde, hasta);
  const emitidas = rows.filter(r => r.estado === 'Emitida');
  res.json({
    rows,
    resumen: {
      cantidad: emitidas.length,
      subtotal: r2(emitidas.reduce((s, r) => s + r.subtotal, 0)),
      iva: r2(emitidas.reduce((s, r) => s + r.iva, 0)),
      total: r2(emitidas.reduce((s, r) => s + r.total, 0)),
      anuladas: rows.length - emitidas.length,
    },
  });
});

api.get('/auditoria', role('Administrador'), (req, res) => {
  const { usuario_id } = req.query;
  const w = usuario_id ? ' WHERE a.usuario_id = ?' : '';
  res.json(db.prepare(`SELECT a.*, u.nombre AS usuario FROM auditoria a LEFT JOIN usuarios u ON u.id=a.usuario_id${w}
    ORDER BY a.fecha DESC, a.id DESC LIMIT 300`).all(...(usuario_id ? [usuario_id] : [])));
});

api.use((req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (path.extname(req.path)) return res.status(404).send('Not found');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SMarDevs Inventario corriendo en http://localhost:${PORT}`);
});
