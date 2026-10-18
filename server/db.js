const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'smardevs.db');

function pad(n) { return String(n).padStart(2, '0'); }
function fmt(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function now() { return fmt(new Date()); }

const SCHEMA = `
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('Administrador','Vendedor','Bodeguero')),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);
CREATE TABLE unidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  abreviatura TEXT NOT NULL
);
CREATE TABLE bodegas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  ubicacion TEXT,
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  unidad_id INTEGER NOT NULL REFERENCES unidades(id),
  precio_costo REAL NOT NULL,
  precio_venta REAL NOT NULL,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE existencias (
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  bodega_id INTEGER NOT NULL REFERENCES bodegas(id),
  cantidad INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, bodega_id)
);
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  documento TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('Contado','Crédito')),
  limite_credito REAL NOT NULL DEFAULT 0,
  saldo_pendiente REAL NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  razon_social TEXT NOT NULL,
  nit TEXT NOT NULL UNIQUE,
  contacto TEXT,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT,
  dias_credito INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
  bodega_id INTEGER NOT NULL REFERENCES bodegas(id),
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  total REAL NOT NULL DEFAULT 0,
  notas TEXT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_recepcion TEXT
);
CREATE TABLE compra_detalle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL REFERENCES compras(id),
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  costo_unitario REAL NOT NULL,
  subtotal REAL NOT NULL
);
CREATE TABLE ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  bodega_id INTEGER NOT NULL REFERENCES bodegas(id),
  fecha TEXT NOT NULL,
  condicion TEXT NOT NULL DEFAULT 'Contado',
  subtotal REAL NOT NULL,
  iva REAL NOT NULL,
  total REAL NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Emitida',
  motivo_anulacion TEXT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id)
);
CREATE TABLE venta_detalle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL REFERENCES ventas(id),
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario REAL NOT NULL,
  descuento REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL
);
CREATE TABLE movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  bodega_id INTEGER NOT NULL REFERENCES bodegas(id),
  tipo TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  saldo INTEGER NOT NULL,
  referencia TEXT,
  motivo TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha TEXT NOT NULL
);
CREATE TABLE auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id INTEGER,
  detalle TEXT,
  fecha TEXT NOT NULL
);
`;

function seed(db) {
  const base = new Date();
  const daysAgo = (n, h = 10, m = 0) => {
    const d = new Date(base);
    d.setDate(d.getDate() - n);
    d.setHours(h, m, 0, 0);
    return fmt(d);
  };
  const created = daysAgo(90, 8);

  const users = [
    ['Ana Martínez', 'admin@smardevs.com', 'Admin123!', 'Administrador'],
    ['Luis Hernández', 'vendedor@smardevs.com', 'Vendedor123!', 'Vendedor'],
    ['Marta López', 'bodega@smardevs.com', 'Bodega123!', 'Bodeguero'],
    ['Carlos Rivas', 'carlos.rivas@smardevs.com', 'Vendedor123!', 'Vendedor'],
    ['Sofía Castillo', 'sofia.castillo@smardevs.com', 'Bodega123!', 'Bodeguero'],
  ];
  const insUser = db.prepare('INSERT INTO usuarios (nombre,email,password_hash,rol,activo,created_at) VALUES (?,?,?,?,?,?)');
  users.forEach(([n, e, p, r], i) => insUser.run(n, e, bcrypt.hashSync(p, 8), r, i === 4 ? 0 : 1, created));

  const cats = [
    ['Computadoras', 'Laptops y equipos de escritorio'],
    ['Periféricos', 'Teclados, ratones, monitores'],
    ['Redes', 'Routers, switches y cableado'],
    ['Almacenamiento', 'Discos y memorias'],
    ['Oficina', 'Papelería y artículos de oficina'],
    ['Impresión', 'Impresoras, tintas y tóner'],
    ['Accesorios', 'Cables, adaptadores y otros'],
    ['Mobiliario', 'Sillas y escritorios'],
  ];
  const insCat = db.prepare('INSERT INTO categorias (nombre, descripcion) VALUES (?,?)');
  cats.forEach(c => insCat.run(...c));

  const unidades = [['Unidad', 'UND'], ['Caja', 'CJA'], ['Paquete', 'PAQ'], ['Metro', 'MTS'], ['Resma', 'RSM']];
  const insUni = db.prepare('INSERT INTO unidades (nombre, abreviatura) VALUES (?,?)');
  unidades.forEach(u => insUni.run(...u));

  const bodegas = [
    ['Bodega Central', 'San Salvador, Col. Escalón'],
    ['Sucursal Santa Ana', 'Santa Ana, Av. Independencia'],
    ['Sucursal San Miguel', 'San Miguel, Calle Chaparrastique'],
  ];
  const insBod = db.prepare('INSERT INTO bodegas (nombre, ubicacion) VALUES (?,?)');
  bodegas.forEach(b => insBod.run(...b));

  // sku, nombre, cat, unidad, costo, venta, min, stock[central, sa, sm], activo
  const productos = [
    ['LAP-001', 'Laptop Lenovo IdeaPad 3 15"', 1, 1, 420, 589.99, 3, [12, 4, 3], 1],
    ['LAP-002', 'Laptop HP Pavilion 14"', 1, 1, 510, 699, 3, [8, 2, 2], 1],
    ['LAP-003', 'Laptop Dell Latitude 5440', 1, 1, 780, 1049.5, 2, [5, 1, 0], 1],
    ['DSK-001', 'Computadora de escritorio Dell OptiPlex 3000', 1, 1, 450, 629, 2, [6, 0, 1], 1],
    ['DSK-002', 'Mini PC Intel NUC i5', 1, 1, 330, 449.9, 2, [2, 0, 0], 1],
    ['MON-001', 'Monitor Samsung 24" FHD', 2, 1, 105, 149.99, 5, [20, 6, 5], 1],
    ['MON-002', 'Monitor LG 27" 4K', 2, 1, 240, 329, 3, [7, 2, 1], 1],
    ['TEC-001', 'Teclado Logitech K120', 2, 1, 7.5, 12.99, 10, [45, 15, 12], 1],
    ['TEC-002', 'Teclado mecánico Redragon Kumara', 2, 1, 28, 44.5, 5, [14, 3, 2], 1],
    ['MOU-001', 'Mouse Logitech M170 inalámbrico', 2, 1, 8.2, 14.99, 10, [60, 20, 18], 1],
    ['MOU-002', 'Mouse ergonómico vertical', 2, 1, 15, 26.75, 5, [5, 0, 0], 1],
    ['AUD-001', 'Audífonos con micrófono Jabra Evolve 20', 2, 1, 35, 54.99, 4, [10, 3, 2], 1],
    ['CAM-001', 'Cámara web Logitech C920 HD Pro', 2, 1, 48, 74.99, 4, [9, 2, 1], 1],
    ['RED-001', 'Router TP-Link Archer C6', 3, 1, 32, 49.99, 4, [15, 4, 3], 1],
    ['RED-002', 'Switch TP-Link 8 puertos Gigabit', 3, 1, 18, 29.5, 4, [11, 3, 3], 1],
    ['RED-003', 'Cable UTP Cat6 (metro)', 3, 4, 0.35, 0.65, 100, [850, 200, 150], 1],
    ['RED-004', 'Access Point Ubiquiti UniFi U6 Lite', 3, 1, 89, 129, 2, [4, 1, 0], 1],
    ['RED-005', 'Conectores RJ45 Cat6 (caja 100)', 3, 2, 6.5, 11.25, 5, [25, 8, 6], 1],
    ['ALM-001', 'Disco SSD Kingston 480GB', 4, 1, 26, 39.99, 6, [30, 8, 6], 1],
    ['ALM-002', 'Disco duro externo Seagate 2TB', 4, 1, 55, 82.5, 4, [12, 3, 2], 1],
    ['ALM-003', 'Memoria USB SanDisk 64GB', 4, 1, 5.1, 9.99, 15, [80, 25, 20], 1],
    ['ALM-004', 'Memoria RAM DDR4 8GB Kingston', 4, 1, 17, 27.99, 8, [8, 0, 0], 1],
    ['OFI-001', 'Papel bond carta 75g', 5, 5, 3.4, 5.25, 20, [140, 40, 35], 1],
    ['OFI-002', 'Bolígrafo azul BIC (unidad)', 5, 1, 0.6, 1.15, 50, [500, 120, 90], 1],
    ['OFI-003', 'Folder manila tamaño carta (paquete 25)', 5, 3, 2.1, 3.85, 10, [35, 10, 8], 1],
    ['OFI-004', 'Engrapadora metálica', 5, 1, 4.3, 7.49, 5, [18, 5, 4], 1],
    ['OFI-005', 'Post-it 3x3 amarillo (paquete 12)', 5, 3, 5.75, 9.1, 8, [22, 6, 5], 1],
    ['IMP-001', 'Impresora Epson EcoTank L3250', 6, 1, 165, 229, 2, [6, 2, 1], 1],
    ['IMP-002', 'Impresora láser HP M111w', 6, 1, 95, 139.99, 2, [3, 1, 0], 1],
    ['IMP-003', 'Botella de tinta Epson 544 negra', 6, 1, 7.2, 11.99, 12, [40, 10, 8], 1],
    ['IMP-004', 'Tóner HP 105A', 6, 1, 38, 57.5, 4, [2, 1, 0], 1],
    ['ACC-001', 'Cable HDMI 2.0 1.8m', 7, 1, 2.9, 6.99, 15, [70, 20, 15], 1],
    ['ACC-002', 'Adaptador USB-C a HDMI', 7, 1, 9.5, 17.99, 6, [16, 4, 3], 1],
    ['ACC-003', 'Regleta con protector de picos 6 tomas', 7, 1, 8, 13.75, 6, [21, 5, 4], 1],
    ['ACC-004', 'UPS APC Back-UPS 600VA', 7, 1, 58, 84.99, 3, [7, 2, 1], 1],
    ['ACC-005', 'Base refrigerante para laptop con 5 ventiladores LED RGB y doble puerto USB ajustable en 6 alturas', 7, 1, 14, 24.99, 4, [9, 2, 2], 1],
    ['ACC-006', 'Mochila para laptop 15.6"', 7, 1, 16, 29.99, 5, [13, 4, 3], 1],
    ['MOB-001', 'Silla ergonómica de oficina', 8, 1, 85, 139, 2, [6, 1, 1], 1],
    ['MOB-002', 'Escritorio en L 140cm', 8, 1, 120, 189.99, 1, [3, 1, 0], 1],
    ['TAB-001', 'Tablet Samsung Galaxy Tab A8', 1, 1, 150, 219, 2, [0, 0, 0], 0],
  ];
  const insProd = db.prepare(`INSERT INTO productos (sku,nombre,descripcion,categoria_id,unidad_id,precio_costo,precio_venta,stock_minimo,activo,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const insEx = db.prepare('INSERT INTO existencias (producto_id,bodega_id,cantidad) VALUES (?,?,?)');
  const insMov = db.prepare(`INSERT INTO movimientos (producto_id,bodega_id,tipo,cantidad,saldo,referencia,motivo,usuario_id,fecha)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  productos.forEach((p, idx) => {
    const [sku, nombre, cat, uni, costo, venta, min, stock, activo] = p;
    const info = insProd.run(sku, nombre, `${nombre}. Producto original con garantía.`, cat, uni, costo, venta, min, activo, daysAgo(90 - idx, 9));
    const pid = info.lastInsertRowid;
    stock.forEach((q, b) => {
      insEx.run(pid, b + 1, q);
      if (q > 0) insMov.run(pid, b + 1, 'ENTRADA', q, q, 'INV-INICIAL', 'Inventario inicial', 1, daysAgo(90, 8));
    });
  });

  const clientes = [
    ['Distribuidora El Progreso S.A. de C.V.', '06142509-1', 'compras@elprogreso.com.sv', '2250-1100', 'San Salvador, Blvd. Los Héroes', 'Crédito', 5000, 1200],
    ['María José Flores', '04567891-2', 'mariajose.flores@gmail.com', '7012-3344', 'Soyapango, Col. Guadalupe', 'Contado', 0, 0],
    ['Colegio Santa Cecilia', '06140101-5', 'administracion@santacecilia.edu.sv', '2260-4455', 'Santa Tecla, Av. Las Palmas', 'Crédito', 3000, 600],
    ['José Antonio Pérez', '03124578-9', 'jperez@hotmail.com', '7788-1122', 'Mejicanos, Calle Principal', 'Contado', 0, 0],
    ['Clínica Médica San Rafael', '06142211-3', 'info@clinicasanrafael.com', '2245-7788', 'San Salvador, Col. Médica', 'Crédito', 2000, 1850],
    ['Laura Beatriz Méndez', '05432198-7', 'laura.mendez@yahoo.com', '7690-5544', 'Antiguo Cuscatlán', 'Contado', 0, 0],
    ['Ferretería La Económica', '06141507-8', 'ventas@laeconomica.com', '2440-3322', 'Santa Ana, 2a Calle Pte.', 'Crédito', 1500, 0],
    ['Ricardo Ernesto Gómez', '02345678-1', 'ricardo.gomez@outlook.com', '7123-9988', 'San Miguel, Col. Ciudad Jardín', 'Contado', 0, 0],
    ['Despacho Jurídico Rivera & Asociados', '06143003-2', 'contacto@riveraasociados.com', '2271-6655', 'San Salvador, Col. San Benito', 'Crédito', 4000, 950],
    ['Andrea Sofía Morales', '04789123-6', 'andrea.morales@gmail.com', '7345-6677', 'Ilopango, Res. Altavista', 'Contado', 0, 0],
    ['Universidad Tecnológica del Norte', '06140808-4', 'proveeduria@utn.edu.sv', '2333-1010', 'Chalatenango, Barrio El Centro', 'Crédito', 8000, 2500],
    ['Pedro Alfonso Castro', '03987654-0', 'pedro.castro@gmail.com', '7567-2233', 'Apopa, Col. San Antonio', 'Contado', 0, 0],
    ['Café Internet La Red', '06141912-7', 'lared.cafe@gmail.com', '2661-4433', 'San Miguel, Av. Roosevelt', 'Contado', 0, 0],
    ['Karla Vanessa Ruiz', '05678912-3', 'karla.ruiz@icloud.com', '7890-1122', 'Santa Tecla, Col. Utila', 'Contado', 0, 0],
    ['Agencia de Viajes Mundo Azul', '06142705-9', 'reservas@mundoazul.com.sv', '2210-8899', 'San Salvador, Paseo General Escalón', 'Crédito', 2500, 0],
  ];
  const insCli = db.prepare(`INSERT INTO clientes (nombre,documento,email,telefono,direccion,tipo,limite_credito,saldo_pendiente,activo,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  clientes.forEach((c, i) => insCli.run(...c, i === 12 ? 0 : 1, daysAgo(85 - i, 11)));

  const proveedores = [
    ['Intcomex El Salvador S.A. de C.V.', '0614-210598-101-3', 'Roberto Quintanilla', 'ventas@intcomex.com.sv', '2209-5000', 'Antiguo Cuscatlán, Calle El Pedregal', 30],
    ['Tecnología Digital Centroamericana', '0614-150310-102-8', 'Gabriela Ayala', 'gayala@tecnodigital.com', '2264-1200', 'San Salvador, Col. Flor Blanca', 45],
    ['Papelera Salvadoreña', '0614-030705-103-1', 'Mario Escobar', 'pedidos@papelera.com.sv', '2222-3344', 'San Salvador, Calle Arce', 15],
    ['Distribuidora de Redes y Cableado', '0614-221112-104-6', 'Julio Menjívar', 'jmenjivar@redesycableado.com', '2275-9090', 'Santa Tecla, Carretera Panamericana', 30],
    ['Office Depot Mayoreo', '0614-090901-105-2', 'Patricia Linares', 'mayoreo@officedepot.com.sv', '2248-7700', 'San Salvador, Blvd. Merliot', 0],
    ['ImpreSoluciones S.A.', '0614-171115-106-9', 'Héctor Bonilla', 'hbonilla@impresoluciones.com', '2236-4545', 'San Salvador, Col. Escalón', 60],
    ['Mobiliario Ejecutivo', '0614-111108-107-4', 'Claudia Rosales', 'ventas@mobiliarioejecutivo.com', '2289-1515', 'Antiguo Cuscatlán, Zona Industrial', 30],
    ['Electrónica Global', '0614-250419-108-0', 'Fernando Ramos', 'framos@electroglobal.com', '2213-6060', 'Soyapango, Plan del Pino', 15],
    ['Accesorios Tech Import', '0614-010120-109-5', 'Daniela Portillo', 'dportillo@techimport.com', '2251-8080', 'San Salvador, Col. Miramonte', 30],
    ['Suministros del Pacífico', '0614-140616-110-7', 'Óscar Villalta', 'ovillalta@sumpacifico.com', '2662-3030', 'San Miguel, Carretera al Cuco', 0],
  ];
  const insProv = db.prepare(`INSERT INTO proveedores (razon_social,nit,contacto,email,telefono,direccion,dias_credito,activo,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  proveedores.forEach((p, i) => insProv.run(...p, i === 9 ? 0 : 1, daysAgo(88 - i, 10)));

  const getEx = db.prepare('SELECT cantidad FROM existencias WHERE producto_id=? AND bodega_id=?');
  const updEx = db.prepare('UPDATE existencias SET cantidad=? WHERE producto_id=? AND bodega_id=?');
  const prodById = db.prepare('SELECT * FROM productos WHERE id=?');

  const compras = [
    [1, 1, 40, 'Recibida', [[1, 5, 420], [2, 3, 510], [6, 8, 105]]],
    [3, 1, 30, 'Recibida', [[23, 50, 3.4], [24, 200, 0.6], [25, 10, 2.1]]],
    [4, 2, 20, 'Recibida', [[16, 300, 0.35], [14, 5, 32], [15, 4, 18]]],
    [6, 1, 12, 'Recibida', [[28, 3, 165], [30, 20, 7.2]]],
    [2, 1, 5, 'Pendiente', [[7, 4, 240], [13, 6, 48]]],
    [9, 3, 2, 'Pendiente', [[32, 30, 2.9], [33, 10, 9.5], [36, 5, 14]]],
    [7, 1, 1, 'Pendiente', [[38, 4, 85], [39, 2, 120]]],
  ];
  const insCompra = db.prepare(`INSERT INTO compras (numero,proveedor_id,bodega_id,fecha,estado,total,notas,usuario_id,fecha_recepcion)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const insCD = db.prepare('INSERT INTO compra_detalle (compra_id,producto_id,cantidad,costo_unitario,subtotal) VALUES (?,?,?,?,?)');
  compras.forEach(([prov, bod, dias, estado, lineas], i) => {
    const total = Math.round(lineas.reduce((s, [, q, c]) => s + q * c, 0) * 100) / 100;
    const fecha = daysAgo(dias, 9, 15);
    const rec = estado === 'Recibida' ? daysAgo(dias - 1, 14) : null;
    const numero = `OC-${String(i + 1).padStart(5, '0')}`;
    const cid = insCompra.run(numero, prov, bod, fecha, estado, total, null, 3, rec).lastInsertRowid;
    lineas.forEach(([pid, q, c]) => {
      insCD.run(cid, pid, q, c, Math.round(q * c * 100) / 100);
      if (estado === 'Recibida') {
        const saldo = getEx.get(pid, bod).cantidad + q;
        updEx.run(saldo, pid, bod);
        insMov.run(pid, bod, 'ENTRADA', q, saldo, numero, 'Recepción de compra', 3, rec);
      }
    });
  });

  const insVenta = db.prepare(`INSERT INTO ventas (numero,cliente_id,bodega_id,fecha,condicion,subtotal,iva,total,estado,motivo_anulacion,usuario_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insVD = db.prepare('INSERT INTO venta_detalle (venta_id,producto_id,cantidad,precio_unitario,descuento,subtotal) VALUES (?,?,?,?,?,?)');
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  // cliente, bodega, diasAtras, hora, condicion, estado, lineas[[prod, qty, desc]]
  const ventas = [
    [2, 1, 58, 10, 'Contado', 'Emitida', [[10, 2, 0], [8, 1, 0]]],
    [1, 1, 55, 11, 'Crédito', 'Emitida', [[1, 3, 5], [6, 3, 5]]],
    [4, 1, 52, 15, 'Contado', 'Emitida', [[19, 1, 0]]],
    [3, 1, 49, 9, 'Crédito', 'Emitida', [[23, 20, 0], [24, 100, 10], [26, 5, 0]]],
    [6, 2, 45, 16, 'Contado', 'Emitida', [[2, 1, 0], [37, 1, 0]]],
    [8, 3, 42, 12, 'Contado', 'Anulada', [[21, 3, 0]]],
    [9, 1, 40, 10, 'Crédito', 'Emitida', [[28, 1, 0], [30, 4, 0]]],
    [10, 1, 37, 17, 'Contado', 'Emitida', [[12, 1, 0], [13, 1, 0]]],
    [11, 1, 35, 9, 'Crédito', 'Emitida', [[4, 4, 8], [6, 4, 8], [8, 4, 8], [10, 4, 8]]],
    [12, 1, 31, 14, 'Contado', 'Emitida', [[32, 2, 0], [33, 1, 0]]],
    [2, 1, 28, 11, 'Contado', 'Emitida', [[21, 2, 0]]],
    [14, 2, 26, 13, 'Contado', 'Emitida', [[9, 1, 0]]],
    [5, 1, 24, 10, 'Crédito', 'Emitida', [[35, 1, 0], [34, 2, 0]]],
    [7, 2, 21, 15, 'Crédito', 'Emitida', [[16, 120, 0], [18, 4, 0]]],
    [4, 1, 18, 9, 'Contado', 'Emitida', [[10, 1, 0]]],
    [15, 1, 15, 16, 'Crédito', 'Emitida', [[1, 1, 0], [12, 1, 0]]],
    [6, 1, 12, 12, 'Contado', 'Anulada', [[7, 1, 0]]],
    [1, 1, 10, 10, 'Crédito', 'Emitida', [[14, 3, 0], [15, 3, 0], [16, 50, 0]]],
    [8, 1, 9, 11, 'Contado', 'Emitida', [[3, 1, 0]]],
    [13, 1, 8, 17, 'Contado', 'Emitida', [[31, 1, 0], [30, 2, 0]]],
    [10, 1, 7, 10, 'Contado', 'Emitida', [[24, 30, 0], [25, 2, 0]]],
    [3, 1, 6, 9, 'Crédito', 'Emitida', [[29, 1, 0]]],
    [2, 1, 5, 14, 'Contado', 'Emitida', [[19, 2, 0], [21, 2, 0]]],
    [9, 1, 4, 11, 'Crédito', 'Emitida', [[38, 1, 10]]],
    [12, 1, 3, 16, 'Contado', 'Emitida', [[11, 1, 0]]],
    [14, 1, 2, 10, 'Contado', 'Emitida', [[6, 1, 0], [8, 1, 0], [10, 1, 0]]],
    [4, 1, 1, 15, 'Contado', 'Emitida', [[32, 3, 0]]],
    [11, 1, 1, 12, 'Crédito', 'Emitida', [[2, 2, 5]]],
    [6, 1, 0, 9, 'Contado', 'Emitida', [[10, 2, 0], [21, 1, 0]]],
    [2, 1, 0, 8, 'Contado', 'Emitida', [[24, 10, 0], [23, 2, 0]]],
  ];
  ventas.forEach(([cli, bod, dias, hora, cond, estado, lineas], i) => {
    const fecha = daysAgo(dias, hora, (i * 7) % 60);
    let subtotal = 0;
    const det = lineas.map(([pid, q, d]) => {
      const p = prodById.get(pid);
      const st = r2(q * p.precio_venta * (1 - d / 100));
      subtotal += st;
      return [pid, q, p.precio_venta, d, st];
    });
    subtotal = r2(subtotal);
    const iva = r2(subtotal * 0.13);
    const total = r2(subtotal + iva);
    const numero = `V-${String(i + 1).padStart(6, '0')}`;
    const vid = insVenta.run(numero, cli, bod, fecha, cond, subtotal, iva, total, estado,
      estado === 'Anulada' ? 'Cliente devolvió el producto por error en el pedido' : null, i % 3 === 0 ? 4 : 2).lastInsertRowid;
    det.forEach(([pid, q, pu, d, st]) => {
      insVD.run(vid, pid, q, pu, d, st);
      const saldo = getEx.get(pid, bod).cantidad - q;
      updEx.run(saldo, pid, bod);
      insMov.run(pid, bod, 'SALIDA', q, saldo, numero, 'Venta', 2, fecha);
      if (estado === 'Anulada') {
        updEx.run(saldo + q, pid, bod);
        insMov.run(pid, bod, 'ENTRADA', q, saldo + q, numero, 'Anulación de venta', 1, fecha);
      }
    });
  });

  const conteo = (pid, bod, objetivo, dias) => {
    const actual = getEx.get(pid, bod).cantidad;
    if (actual === objetivo) return;
    const tipo = objetivo > actual ? 'AJUSTE_ENTRADA' : 'AJUSTE_SALIDA';
    updEx.run(objetivo, pid, bod);
    insMov.run(pid, bod, tipo, Math.abs(objetivo - actual), objetivo, 'AJ-CONTEO', 'Ajuste por conteo físico mensual', 3, daysAgo(dias, 17));
  };
  conteo(11, 1, 5, 1);
  conteo(22, 1, 8, 1);
  conteo(5, 1, 2, 2);

  const neg = db.prepare('SELECT COUNT(*) c FROM existencias WHERE cantidad < 0').get().c;
  if (neg > 0) throw new Error('Seed inválido: existencias negativas');

  const insAud = db.prepare('INSERT INTO auditoria (usuario_id,accion,entidad,entidad_id,detalle,fecha) VALUES (?,?,?,?,?,?)');
  insAud.run(1, 'LOGIN', 'Sesión', null, 'Inicio de sesión exitoso', daysAgo(3, 8));
  insAud.run(1, 'CREAR', 'Producto', 39, 'Creó el producto MOB-002', daysAgo(3, 8, 20));
  insAud.run(2, 'LOGIN', 'Sesión', null, 'Inicio de sesión exitoso', daysAgo(2, 9));
  insAud.run(3, 'RECIBIR', 'Compra', 4, 'Recibió la orden OC-00004', daysAgo(2, 10));
  insAud.run(1, 'ANULAR', 'Venta', 17, 'Anuló la venta V-000017', daysAgo(1, 11));
  insAud.run(1, 'EDITAR', 'Cliente', 5, 'Actualizó límite de crédito', daysAgo(1, 12));
}

function open({ reset = false } = {}) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (reset && fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const isNew = !fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  if (isNew) {
    db.exec(SCHEMA);
    db.transaction(() => seed(db))();
  }
  return db;
}

module.exports = { open, now, fmt, DB_PATH };
