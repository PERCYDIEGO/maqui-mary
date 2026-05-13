---
name: testear
description: Ejecuta tests y reporta estado del proyecto.
usage: "/testear [opcional: patron de test]"
---

## Protocolo de Testing para Maqui Mary

### Tests disponibles

**Build (smoke test):**
```bash
cd web && npm run build
```
Este es el test más importante. Si pasa, el proyecto compila.

**Linter:**
```bash
cd web && npm run lint
```

**Scripts de verificación de DB:**
```bash
cd web && npm run db:status
```

**Scripts de verificación SUNAT:**
Revisar si existen scripts en `web/scripts/` para testear la firma XML o la conexión con SUNAT.

### Checklist de testing manual

#### Flujo de autenticación
- [ ] Login con alias y contraseña funciona.
- [ ] Logout limpia la sesión.
- [ ] Middleware redirige a `/crm/login` si no hay sesión.
- [ ] Usuario `admin` ve opciones que `vendedor` no ve.

#### Flujo de productos
- [ ] Catálogo muestra todos los productos.
- [ ] Crear producto nuevo guarda en DB.
- [ ] Editar producto actualiza stock y precio.

#### Flujo de facturación
- [ ] Crear factura calcula IGV correctamente (18%).
- [ ] Total = subtotal + IGV.
- [ ] Stock se descuenta al aprobar pedido.
- [ ] PDF de factura se genera y descarga.
- [ ] XML de SUNAT es válido (estructura UBL 2.1).

#### Flujo de pedidos
- [ ] Crear pedido con estado `pendiente`.
- [ ] Cambiar estado: `pendiente` → `pagado` → `aprobado`.
- [ ] Solo `admin` puede aprobar.

#### Responsive
- [ ] CRM funciona en mobile (375px).
- [ ] Landing page se ve bien en desktop y mobile.

### Reporte de salud
```
Estado general: [✅ Todo OK / ⚠️ Con advertencias / 🔴 Con errores]
Build:          [Pasa / Falla]
Lint:           [Pasa / Falla]
DB status:      [OK / Advertencias]
Tests manuales: [X/Y pasaron]
```

### Si hay errores
1. Listar cada error con archivo y línea.
2. Sugerir fix para cada uno.
3. Priorizar: auth > facturación > pedidos > UI.
