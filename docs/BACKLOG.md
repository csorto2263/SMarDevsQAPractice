# Backlog — SMarDevs Inventario v1.4

Sistema web de inventario y ventas para una distribuidora de tecnología y artículos de oficina con 3 bodegas.
Moneda: USD. Impuesto: IVA 13 %. Zona horaria: hora local del servidor.

## Roles y matriz de permisos

| Módulo / acción | Administrador | Vendedor | Bodeguero |
|---|:-:|:-:|:-:|
| Dashboard | ✔ | ✔ | ✔ |
| Productos: ver listado y detalle | ✔ | ✔ | ✔ |
| Productos: ver precio de costo y margen | ✔ | ✘ | ✔ |
| Productos: crear / editar / activar / desactivar | ✔ | ✘ | ✔ |
| Categorías y Bodegas | ✔ | ✘ | ✘ |
| Clientes | ✔ | ✔ | ✘ |
| Proveedores | ✔ | ✘ | ✔ |
| Compras (órdenes de compra) | ✔ | ✘ | ✔ |
| Inventario: existencias, ajustes, kardex | ✔ | ✘ | ✔ |
| Ventas: crear y consultar | ✔ | ✔ | ✘ |
| Ventas: anular | ✔ | ✘ | ✘ |
| Reportes | ✔ | ✔ | ✘ |
| Usuarios y Auditoría | ✔ | ✘ | ✘ |

Regla general: las opciones de menú a las que un rol no tiene acceso **no se muestran**, acceder por URL directa muestra la página **403 Acceso denegado**, y el API responde **403** a cualquier operación no permitida.

Usuarios de prueba: ver README.

---

## Jira: tickets existentes reutilizados

| Key | Tipo | Resumen | Épica | SP | Estado |
|---|---|---|---|---|---|
| SCRUM-1 | Tarea | Configurar proyecto base, base de datos y datos semilla | E1 | 3 | Finalizada |
| SCRUM-2 | Historia | H01 · Inicio de sesión | E1 | 5 | Ready for QA |
| SCRUM-3 | Tarea | Layout principal: sidebar por rol, header con usuario y diseño responsive | E1 | 3 | Finalizada |
| SCRUM-4 | Subtask (de SCRUM-2) | Backend: endpoint POST /api/auth/login con JWT | — | 2 | Finalizada |

### Claves de Jira
| Épica | Jira | Historias |
|---|---|---|
| E1 | SCRUM-5 | H01 SCRUM-2 · H02 SCRUM-11 · H03 SCRUM-12 · H04 SCRUM-13 · H30 SCRUM-39 · SCRUM-1 · SCRUM-3 |
| E2 | SCRUM-6 | H05 SCRUM-14 · H06 SCRUM-15 · H07 SCRUM-16 · H08 SCRUM-17 · H09 SCRUM-18 · H10 SCRUM-19 |
| E3 | SCRUM-7 | H11 SCRUM-20 · H12 SCRUM-21 · H13 SCRUM-22 · H14 SCRUM-23 |
| E4 | SCRUM-8 | H15 SCRUM-24 · H16 SCRUM-25 · H17 SCRUM-26 · H18 SCRUM-27 · H19 SCRUM-28 |
| E5 | SCRUM-9 | H20 SCRUM-29 · H21 SCRUM-30 · H22 SCRUM-31 · H23 SCRUM-32 · H24 SCRUM-33 · H31 SCRUM-40 |
| E6 | SCRUM-10 | H25 SCRUM-34 · H26 SCRUM-35 · H27 SCRUM-36 · H28 SCRUM-37 · H29 SCRUM-38 |

Subtareas: SCRUM-4 (H01), SCRUM-41 y SCRUM-42 (H16), SCRUM-43, SCRUM-44 y SCRUM-45 (H20). Bugs de ejemplo: SCRUM-46, SCRUM-47 y SCRUM-48.

---

## Épicas

| ID | Épica | Descripción |
|---|---|---|
| E1 | Autenticación, usuarios y permisos | Acceso al sistema, sesión, gestión de usuarios y control por roles. |
| E2 | Catálogo de productos | Categorías, bodegas y productos con sus precios y existencias. |
| E3 | Clientes y proveedores | Registro y mantenimiento de terceros. |
| E4 | Compras e inventario | Órdenes de compra, recepción, existencias, ajustes y kardex. |
| E5 | Ventas y facturación | Registro de ventas, crédito, consulta, comprobante y anulación. |
| E6 | Dashboard, reportes y auditoría | Indicadores, reportes exportables y bitácora. |

---

## E1 · Autenticación, usuarios y permisos

### SCRUM-1 · Configurar proyecto base, base de datos y datos semilla (Tarea)
**SP:** 3 · **Prioridad:** Alta · **Labels:** `api`, `infraestructura` · **Estado:** Finalizada
- Proyecto con frontend React + Vite y backend Node/Express + SQLite.
- Script `npm run setup` instala y compila; `npm start` levanta en `http://localhost:4000`; `npm run reset-db` reinicia los datos.
- Datos semilla: 5 usuarios, 8 categorías, 5 unidades, 3 bodegas, 40 productos, 15 clientes, 10 proveedores, 7 órdenes de compra y 30 ventas de los últimos 60 días.

### SCRUM-3 · Layout principal (Tarea)
**SP:** 3 · **Prioridad:** Media · **Labels:** `ui` · **Estado:** Finalizada
- Sidebar con secciones Catálogo, Terceros, Operaciones y Administración, filtrado según la matriz de permisos.
- Header con iniciales, nombre, rol del usuario y botón "Cerrar sesión".
- En pantallas < 860 px el sidebar se oculta y se abre con el botón ☰.

### H01 · Inicio de sesión — SCRUM-2 (Historia)
**Como** usuario del sistema **quiero** iniciar sesión con mi correo y contraseña **para** acceder a las funciones de mi rol.
**SP:** 5 · **Prioridad:** Más alta · **Labels:** `auth`, `smoke`, `seguridad` · **Estado:** Ready for QA

**Criterios de aceptación**
1. **Dado** que estoy en `/login` **cuando** la página carga **entonces** veo el logo de SMarDevs, el título "Iniciar sesión", los campos "Correo electrónico" y "Contraseña" y el botón "Ingresar".
2. **Dado** que dejo un campo vacío **cuando** presiono "Ingresar" **entonces** veo bajo el campo "El correo es obligatorio" o "La contraseña es obligatoria".
3. **Dado** que ingreso un correo con formato inválido **entonces** veo "Ingresa un correo electrónico válido". El campo acepta máximo 100 caracteres.
4. **Dado** que ingreso un correo inexistente **o** una contraseña incorrecta **entonces** veo el mensaje genérico **"Correo o contraseña incorrectos"** (por seguridad, nunca se indica cuál de los dos falló).
5. **Dado** que el usuario está inactivo **entonces** veo "Usuario inactivo, contacta al administrador".
6. **Dado** que las credenciales son correctas **entonces** soy redirigido al Dashboard y veo mi nombre y rol en el header.
7. El botón "Mostrar/Ocultar" alterna la visibilidad de la contraseña.
8. Presionar **Enter** en cualquiera de los campos envía el formulario.
9. Mientras se valida, el botón muestra "Ingresando..." y está deshabilitado.
10. La sesión se guarda en el navegador **solo con el token y los datos públicos del usuario** (nunca la contraseña) y dura 8 horas.

**Notas técnicas:** `POST /api/auth/login` → 200 `{token, user}` | 400 campos vacíos | 401 credenciales inválidas | 403 usuario inactivo.

### H02 · Cierre de sesión y protección de rutas (Historia)
**Como** usuario **quiero** cerrar sesión **para** que nadie más use mi cuenta en este equipo.
**SP:** 3 · **Prioridad:** Alta · **Labels:** `auth`, `seguridad` · **Estado:** Ready for QA
1. **Dado** que tengo sesión **cuando** presiono "Cerrar sesión" **entonces** se elimina la sesión del navegador y soy redirigido a `/login`.
2. **Dado** que cerré sesión **cuando** recargo la página o navego a cualquier ruta interna **entonces** sigo en `/login`.
3. **Dado** que no tengo sesión **cuando** accedo a una ruta interna por URL **entonces** soy redirigido a `/login`.
4. **Dado** que mi token expiró **cuando** hago cualquier acción **entonces** soy redirigido a `/login` con el mensaje "Tu sesión expiró, inicia sesión nuevamente".
5. El cierre de sesión queda registrado en la auditoría (acción LOGOUT).

### H03 · Gestión de usuarios (Historia)
**Como** administrador **quiero** crear, editar y desactivar usuarios **para** controlar quién accede al sistema.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `auth`, `permisos`, `api` · **Estado:** In QA
1. Solo el rol Administrador ve el menú "Usuarios" y accede a `/usuarios`.
2. El listado muestra Nombre, Correo, Rol, Estado y fecha de creación, ordenado por nombre.
3. Al crear: Nombre obligatorio (3–60 caracteres), Correo válido y único ("Ya existe un usuario con ese correo"), Rol obligatorio, Contraseña de mínimo 8 caracteres con al menos un número.
4. Al editar, la contraseña es opcional ("Déjalo vacío para mantener la actual").
5. Desactivar o activar pide confirmación. Un administrador no puede desactivarse a sí mismo.
6. **Seguridad:** las respuestas del API de usuarios **nunca** incluyen la contraseña ni su hash.

**Notas técnicas:** `GET/POST /api/usuarios`, `PUT /api/usuarios/:id`, `PATCH /api/usuarios/:id/estado`. 403 para roles distintos de Administrador.

### H04 · Control de acceso por rol (Historia)
**Como** dueño del negocio **quiero** que cada rol vea y haga solo lo que le corresponde **para** proteger la información sensible (costos, usuarios, anulaciones).
**SP:** 8 · **Prioridad:** Más alta · **Labels:** `permisos`, `seguridad`, `api`, `regresion` · **Estado:** Ready for QA
1. El menú lateral muestra solo los módulos permitidos según la matriz de permisos.
2. Acceder por URL a un módulo no permitido muestra la página "403 Acceso denegado".
3. El Vendedor **no** ve el precio de costo ni el margen en ninguna pantalla (listado ni detalle de productos).
4. Todos los endpoints de escritura validan el rol en el servidor y responden **403** "No tienes permisos para realizar esta acción", aunque la interfaz oculte el botón.
5. Los textos del menú usan la ortografía correcta: Dashboard, Productos, Categorías, Bodegas, Clientes, Proveedores, Compras, Existencias, Kardex, Ventas, Reportes, Usuarios, Auditoría.

---

## E2 · Catálogo de productos

### H05 · Gestión de categorías (Historia)
**Como** administrador **quiero** mantener las categorías **para** clasificar los productos.
**SP:** 3 · **Prioridad:** Media · **Labels:** `productos`, `validaciones` · **Estado:** Ready for QA
1. El listado muestra Nombre, Descripción y cantidad de productos, ordenado por nombre.
2. Nombre obligatorio, de 3 a 40 caracteres y único sin distinguir mayúsculas ("Ya existe una categoría con ese nombre").
3. Cada fila tiene el botón Editar (✎) y el botón Eliminar con ícono de **papelera** (🗑) en rojo.
4. Eliminar pide confirmación.
5. **Dado** que la categoría tiene productos asociados **cuando** intento eliminarla **entonces** veo "No se puede eliminar una categoría con productos asociados" y el API responde **409**.

### H06 · Gestión de bodegas (Historia)
**Como** administrador **quiero** registrar las bodegas y sucursales **para** controlar el inventario por ubicación.
**SP:** 2 · **Prioridad:** Media · **Labels:** `inventario` · **Estado:** Finalizada
1. Nombre obligatorio (3–50 caracteres) y único. Ubicación opcional.
2. Al crear una bodega, todos los productos quedan con existencia 0 en ella.
3. Una bodega inactiva no aparece en compras ni en ventas.

### H07 · Listado y búsqueda de productos (Historia)
**Como** usuario **quiero** consultar el catálogo con búsqueda y filtros **para** encontrar productos rápidamente.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `productos`, `ui`, `smoke` · **Estado:** Ready for QA
1. Columnas: SKU, Nombre, Categoría, Precio costo (solo Administrador y Bodeguero), Precio venta, Stock (total de todas las bodegas + unidad), Estado y Acciones.
2. Orden por defecto: **Nombre ascendente (A→Z)**. Al hacer clic en SKU, Nombre, Precio venta o Stock se ordena por esa columna y un segundo clic invierte el orden.
3. Paginación de **10 registros por página** con el texto "Mostrando X-Y de Z registros".
4. La búsqueda filtra por **SKU o nombre**, parcial y sin distinguir mayúsculas.
5. Filtros por categoría y por estado (Activos / Inactivos).
6. Los nombres largos se muestran en una sola línea truncada con "…" y la tabla nunca sobrepasa el ancho de su tarjeta.
7. Sin resultados: "No se encontraron productos".

### H08 · Crear producto (Historia)
**Como** administrador o bodeguero **quiero** registrar nuevos productos **para** poder comprarlos y venderlos.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `productos`, `validaciones`, `api` · **Estado:** Ready for QA
1. Campos obligatorios: SKU, Nombre, Categoría, Unidad de medida, Precio de costo, Precio de venta y Stock mínimo. Descripción opcional (máx. 500).
2. SKU: 3 a 12 caracteres (letras, números o guion), **se guarda en MAYÚSCULAS** y es **único sin distinguir mayúsculas** ("Ya existe un producto con ese SKU").
3. Nombre: 3 a 80 caracteres.
4. Precios mayores a 0. **Si el precio de venta es menor al de costo** se muestra exactamente: **"El precio de venta no puede ser menor al costo"**.
5. Stock mínimo: entero ≥ 0.
6. Al guardar se muestra el toast **"Producto creado correctamente"**, se cierra el modal y el producto aparece con stock 0 en todas las bodegas.
7. Queda registro en auditoría.

**Notas técnicas:** `POST /api/productos` → 201 | 409 SKU duplicado | 422 validación | 403 rol sin permiso.

### H09 · Editar y desactivar producto (Historia)
**Como** administrador o bodeguero **quiero** editar o desactivar productos **para** mantener el catálogo actualizado.
**SP:** 3 · **Prioridad:** Media · **Labels:** `productos`, `permisos` · **Estado:** Ready for QA
1. Editar aplica las mismas validaciones de H08 y muestra "Producto actualizado correctamente".
2. Desactivar o activar pide confirmación con el nombre del producto.
3. Un producto inactivo no aparece al registrar ventas ni compras.
4. Solo Administrador y Bodeguero pueden editar, **también a nivel de API** (`PUT /api/productos/:id` → 403 para Vendedor).

### H10 · Detalle de producto con existencias por bodega (Historia)
**Como** usuario **quiero** ver el detalle de un producto **para** conocer su stock en cada bodega.
**SP:** 2 · **Prioridad:** Media · **Labels:** `productos`, `inventario` · **Estado:** Finalizada
1. Muestra SKU, categoría, unidad, precio de venta, stock mínimo, estado y fecha de creación. Costo y margen solo para Administrador y Bodeguero.
2. Tabla de existencias por bodega con total.
3. Badge "Stock bajo" si el total es **menor o igual** al stock mínimo.
4. Botón "Ver kardex" (solo roles con acceso a inventario).

---

## E3 · Clientes y proveedores

### H11 · Listado y búsqueda de clientes (Historia)
**Como** vendedor **quiero** buscar clientes **para** consultarlos y facturarles.
**SP:** 3 · **Prioridad:** Alta · **Labels:** `clientes`, `ui` · **Estado:** Ready for QA
1. Breadcrumb: "Inicio / Terceros / Clientes".
2. Columnas: Nombre, Documento, Email, Teléfono, Tipo, Límite, Saldo, Estado y Acciones. Límite y saldo solo para clientes de crédito ("—" en contado).
3. Orden por nombre ascendente, 10 registros por página.
4. La búsqueda filtra por nombre o documento, parcial y **sin distinguir mayúsculas ni tildes**. Debe aceptar cualquier carácter (por ejemplo "O'Brien") sin errores.
5. Filtro por tipo (Contado / Crédito).

### H12 · Crear y editar cliente (Historia)
**Como** vendedor **quiero** registrar clientes **para** asociarles ventas.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `clientes`, `validaciones`, `api` · **Estado:** Ready for QA
1. Nombre / Razón social obligatorio, **3 a 80 caracteres**.
2. DUI obligatorio con formato `00000000-0` y único ("Ya existe un cliente con ese documento").
3. Correo obligatorio con formato válido: "Ingresa un correo electrónico válido".
4. Teléfono obligatorio con formato **exacto `0000-0000` (8 dígitos)**; el placeholder muestra `0000-0000`.
5. Tipo: Contado o Crédito. Si es Crédito, el límite de crédito es obligatorio y > 0.
6. El API responde **422** a cualquier error de validación y **409** si hay duplicado.
7. Toast "Cliente creado correctamente" o "Cliente actualizado correctamente".

### H13 · Desactivar cliente (Historia)
**Como** administrador **quiero** desactivar clientes **para** impedir nuevas ventas sin perder su historial.
**SP:** 2 · **Prioridad:** Media · **Labels:** `clientes`, `ventas` · **Estado:** Ready for QA
1. Desactivar o activar pide confirmación.
2. El cliente inactivo sigue visible en el listado con badge "Inactivo".
3. **Un cliente inactivo no aparece en el selector de clientes de "Nueva venta".**

### H14 · Gestión de proveedores (Historia)
**Como** bodeguero **quiero** mantener el registro de proveedores **para** emitir órdenes de compra.
**SP:** 5 · **Prioridad:** Media · **Labels:** `proveedores`, `validaciones`, `ui` · **Estado:** In QA
1. Columnas: Razón social, NIT, Contacto, Email, Teléfono, Días crédito, Estado y Acciones. Orden por razón social, 10 por página.
2. Razón social 3–100 caracteres. NIT con formato `0000-000000-000-0` y único. Correo válido. Teléfono `0000-0000`.
3. Días de crédito: entero **entre 0 y 90**.
4. Los botones del formulario siguen el estándar: "Cancelar" (contorno) y "Guardar" (**azul primario**), alineados a la derecha.
5. Desactivar o activar un proveedor **pide confirmación**.
6. Un proveedor inactivo no aparece al crear órdenes de compra.

---

## E4 · Compras e inventario

### H15 · Crear orden de compra (Historia)
**Como** bodeguero **quiero** registrar órdenes de compra **para** abastecer las bodegas.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `compras`, `validaciones` · **Estado:** Ready for QA
1. Solo Administrador y Bodeguero acceden a Compras (menú, URL y API).
2. Proveedor activo y bodega destino obligatorios.
3. Al menos un producto. Cantidad entera ≥ 1 y costo unitario > 0. Un producto no puede repetirse en la orden.
4. Total = Σ (cantidad × costo unitario).
5. La orden se crea con número correlativo `OC-00000` en estado **Pendiente**.

### H16 · Recibir orden de compra (Historia)
**Como** bodeguero **quiero** registrar la recepción de una orden **para** que el inventario aumente.
**SP:** 8 · **Prioridad:** Más alta · **Labels:** `compras`, `inventario`, `api` · **Estado:** Ready for QA
1. El botón "Recibir mercadería" solo aparece en órdenes Pendientes.
2. Al recibir: la orden pasa a **Recibida** con fecha de recepción, el stock de la bodega destino aumenta en las cantidades de la orden y se registra un movimiento ENTRADA en el kardex por producto.
3. **Una orden solo puede recibirse una vez.** El botón se deshabilita al hacer clic y el API responde 422 "La orden ya fue recibida" si se intenta de nuevo.
4. Se puede cancelar una orden Pendiente con confirmación.

### H17 · Consulta de existencias y alerta de stock bajo (Historia)
**Como** bodeguero **quiero** ver las existencias por bodega **para** saber qué reabastecer.
**SP:** 3 · **Prioridad:** Alta · **Labels:** `inventario`, `ui` · **Estado:** Ready for QA
1. Tabla con SKU, Producto, Categoría, una columna por bodega, Total y Mínimo (solo productos activos).
2. **Un producto tiene stock bajo cuando su total es menor o igual al stock mínimo.** La fila se resalta en rojo con badge "Stock bajo".
3. Mensaje superior "Hay N producto(s) con stock bajo." y filtro "Solo stock bajo".
4. El KPI "Productos con stock bajo" del Dashboard usa la misma regla.

### H18 · Ajuste manual de inventario (Historia)
**Como** bodeguero **quiero** registrar ajustes **para** corregir diferencias de conteo, mermas o daños.
**SP:** 5 · **Prioridad:** Media · **Labels:** `inventario`, `validaciones` · **Estado:** Ready for QA
1. Campos: Producto, Bodega (muestra "Stock actual: N"), Tipo (Entrada / Salida), Cantidad (entero ≥ 1) y Motivo.
2. **Motivo obligatorio con mínimo 10 caracteres**: "El motivo debe tener al menos 10 caracteres".
3. Una salida no puede dejar stock negativo: "Stock insuficiente para realizar el ajuste".
4. Se registra en kardex (Ajuste + / Ajuste −) y en auditoría.

### H19 · Kardex por producto (Historia)
**Como** bodeguero **quiero** ver los movimientos de un producto **para** rastrear entradas y salidas.
**SP:** 3 · **Prioridad:** Media · **Labels:** `inventario`, `reportes` · **Estado:** Ready for QA
1. Selector de producto y filtro opcional de bodega.
2. Columnas: Fecha (dd/mm/aaaa hh:mm), Tipo, Bodega, Referencia, Motivo, Cantidad (+/−), Saldo y Usuario.
3. **Orden: del movimiento más reciente al más antiguo.**
4. El saldo de cada movimiento coincide con la existencia real de la bodega en ese momento.

---

## E5 · Ventas y facturación

### H20 · Registrar venta (Historia)
**Como** vendedor **quiero** registrar ventas **para** facturar a los clientes y descontar inventario.
**SP:** 13 · **Prioridad:** Más alta · **Labels:** `ventas`, `inventario`, `api`, `smoke` · **Estado:** In QA
1. Cliente (solo activos) y bodega de despacho obligatorios.
2. Se agregan productos activos con stock en la bodega seleccionada. Cada línea muestra Disponible, Precio, Cantidad, Desc. % y Subtotal.
3. Cantidad entera ≥ 1 y **≤ disponible**; si se excede se muestra en la línea **"Cantidad supera el stock disponible (N)"** y no se permite registrar. El API también valida el stock (422).
4. Descuento por línea entre 0 % y 50 %.
5. **Cálculos:** Subtotal de línea = cantidad × precio × (1 − desc/100). Subtotal = Σ líneas. **IVA = 13 % del Subtotal (después de descuentos).** Total = Subtotal + IVA.
6. **Todos los montos se redondean a 2 decimales con redondeo aritmético (0.005 → 0.01).**
7. Al registrar: número correlativo `V-000000`, estado Emitida, stock descontado de la bodega, movimiento SALIDA en kardex y toast "Venta V-xxxxxx registrada correctamente".
8. En pantallas pequeñas (≤ 600 px) el formulario se adapta sin scroll horizontal de la página.

**Ejemplo de cálculo:** 1 × Laptop Lenovo $589.99 con 10 % → Subtotal $530.99, IVA $69.03, Total $600.02.

### H21 · Venta a crédito con límite (Historia)
**Como** vendedor **quiero** vender a crédito a clientes autorizados **sin** exceder su límite.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `ventas`, `clientes`, `validaciones` · **Estado:** Ready for QA
1. Solo clientes tipo Crédito pueden usar la condición "Crédito". Para clientes de contado el selector está deshabilitado.
2. Se muestra "Crédito disponible: $X" (límite − saldo pendiente).
3. **Si saldo pendiente + total de la venta > límite**, se rechaza con "La venta excede el límite de crédito del cliente".
4. Una venta a crédito aumenta el saldo pendiente del cliente.

### H22 · Listado y filtros de ventas (Historia)
**Como** vendedor **quiero** consultar las ventas **para** dar seguimiento.
**SP:** 3 · **Prioridad:** Media · **Labels:** `ventas`, `ui` · **Estado:** Ready for QA
1. Columnas: Número, Fecha (**dd/mm/aaaa**), Cliente, Condición, Vendedor, Total y Estado.
2. Orden por fecha descendente, 10 por página.
3. Búsqueda por número o cliente. Filtros Desde / Hasta (**ambos inclusive**) y Estado.
4. Si Desde > Hasta: "La fecha inicial no puede ser mayor a la final".

### H23 · Detalle y comprobante de venta (Historia)
**Como** vendedor **quiero** ver e imprimir el comprobante **para** entregarlo al cliente.
**SP:** 3 · **Prioridad:** Media · **Labels:** `ventas` · **Estado:** Finalizada
1. Muestra cliente, documento, fecha, condición, bodega, vendedor, líneas, subtotal, IVA y total.
2. El botón "Imprimir" abre el diálogo de impresión sin el menú ni el header.
3. Si la venta está anulada, se muestra el aviso con el motivo.

### H24 · Anular venta (Historia)
**Como** administrador **quiero** anular ventas **para** corregir errores de facturación.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `ventas`, `inventario`, `permisos` · **Estado:** Ready for QA
1. Solo el Administrador ve el botón "Anular venta" y el API devuelve 403 a otros roles.
2. Motivo obligatorio de mínimo 10 caracteres.
3. Al anular: estado **Anulada**, **el stock vuelve a la bodega de la venta**, se registra un movimiento ENTRADA "Anulación de venta" en el kardex con el saldo correcto y, si fue a crédito, se descuenta del saldo pendiente.
4. Una venta anulada no se puede volver a anular.

---

## E6 · Dashboard, reportes y auditoría

### H25 · Dashboard de indicadores (Historia)
**Como** usuario **quiero** ver indicadores clave al ingresar **para** conocer el estado del negocio.
**SP:** 5 · **Prioridad:** Alta · **Labels:** `dashboard`, `reportes` · **Estado:** Ready for QA
1. KPIs: **Ventas de hoy** y **Ventas del mes** (suma de totales y número de transacciones, **excluyendo ventas anuladas**), **Productos con stock bajo** (regla de H17) y **Ticket promedio del mes**.
2. Gráfico de ventas de los últimos 14 días.
3. Top 5 productos del mes por cantidad vendida (excluye anuladas).
4. Últimas 5 ventas.
5. La página carga sin errores en consola ni peticiones fallidas.

### H26 · Reporte de ventas por rango y exportación CSV (Historia)
**Como** administrador **quiero** generar un reporte de ventas **para** analizar periodos y compartirlos.
**SP:** 5 · **Prioridad:** Media · **Labels:** `reportes`, `ventas` · **Estado:** Ready for QA
1. Rango por defecto: del primer día del mes actual a hoy.
2. **Ambas fechas son inclusivas** (incluye las ventas de todo el día "Hasta").
3. Resumen: ventas emitidas, anuladas, subtotal, IVA y total (solo emitidas).
4. Exportar CSV con columnas `Numero,Fecha,Cliente,Subtotal,IVA,Total,Estado`, archivo `reporte-ventas_<desde>_<hasta>.csv`.
5. Desde > Hasta: "La fecha inicial no puede ser mayor a la final".

### H27 · Bitácora de auditoría (Historia)
**Como** administrador **quiero** consultar quién hizo qué y cuándo **para** tener trazabilidad.
**SP:** 3 · **Prioridad:** Baja · **Labels:** `seguridad`, `reportes` · **Estado:** In Development
1. Registra LOGIN, LOGOUT, CREAR, EDITAR, ACTIVAR/DESACTIVAR, RECIBIR, AJUSTE y ANULAR.
2. Orden por fecha descendente, filtro por usuario, 15 por página.
3. *(Pendiente)* filtro por rango de fechas y por tipo de acción.

### H28 · Exportar reporte de ventas a PDF (Historia)
**SP:** 3 · **Prioridad:** Baja · **Labels:** `reportes` · **Estado:** In Development
1. Botón "Exportar PDF" en el reporte, con encabezado de la empresa y rango de fechas.

### H29 · Centro de notificaciones (Historia)
**SP:** 5 · **Prioridad:** Baja · **Labels:** `dashboard`, `api` · **Estado:** In Development
1. Ícono de campana en el header con notificaciones de stock bajo y órdenes pendientes.
2. Endpoint `GET /api/dashboard/notificaciones` (aún **no desplegado**; el frontend no debe llamarlo hasta su liberación).

### H30 · Recuperar contraseña por correo (Historia)
**SP:** 5 · **Prioridad:** Media · **Labels:** `auth` · **Estado:** Tareas por hacer
1. Enlace "¿Olvidaste tu contraseña?" en el login que envía un enlace temporal (30 min) al correo.

### H31 · Devolución parcial de ventas (Historia)
**SP:** 8 · **Prioridad:** Media · **Labels:** `ventas`, `inventario` · **Estado:** Tareas por hacer
1. Permitir devolver parte de las líneas de una venta generando una nota de crédito y reingresando stock.

---

## Subtareas

| Padre | Subtarea | SP | Estado |
|---|---|---|---|
| SCRUM-2 (H01) | Backend: endpoint POST /api/auth/login con JWT *(SCRUM-4)* | 2 | Finalizada |
| H16 | Backend: recepción de OC, actualización de stock y kardex | 3 | Finalizada |
| H16 | Frontend: botón "Recibir mercadería" y estados de la orden | 2 | Finalizada |
| H20 | Frontend: formulario de venta con cálculo en tiempo real | 5 | Finalizada |
| H20 | Backend: endpoint POST /api/ventas con validación de stock y crédito | 5 | Finalizada |
| H20 | QA: diseño y ejecución de casos de prueba de ventas | 3 | Tareas por hacer |
