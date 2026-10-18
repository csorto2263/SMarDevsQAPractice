# SMarDevs Inventario

Sistema web de inventario y ventas: productos, categorías, bodegas, clientes, proveedores, órdenes de compra, existencias, kardex, ventas, reportes y auditoría.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalación (una sola vez)

```bash
npm run setup
```

Instala las dependencias del backend y del frontend y compila la aplicación.

## Ejecutar

```bash
npm start
```

Abre **http://localhost:4000** en el navegador.

La primera vez se crea la base de datos con datos de ejemplo. Para volver a los datos iniciales:

```bash
npm run reset-db
```

(Reinicia los datos y deja el servidor corriendo.)

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@smardevs.com | Admin123! |
| Vendedor | vendedor@smardevs.com | Vendedor123! |
| Bodeguero | bodega@smardevs.com | Bodega123! |
| Vendedor | carlos.rivas@smardevs.com | Vendedor123! |
| Bodeguero (inactivo) | sofia.castillo@smardevs.com | Bodega123! |

## Documentación

- Requerimientos y criterios de aceptación: [docs/BACKLOG.md](docs/BACKLOG.md) y el proyecto **SCRUM** en Jira (https://smardevs.atlassian.net).

## API

La aplicación expone un API REST en `/api` (autenticación con `Authorization: Bearer <token>`). Los principales recursos son `auth`, `usuarios`, `categorias`, `unidades`, `bodegas`, `productos`, `clientes`, `proveedores`, `compras`, `inventario`, `ventas`, `dashboard`, `reportes` y `auditoria`.

Los elementos clave de la interfaz tienen atributos `data-testid` para facilitar la automatización.
