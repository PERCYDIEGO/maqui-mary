---
name: facturacion-local
description: Skill local para lógica de facturación, pedidos y pagos en Maqui Mary.
---

## Cálculos financieros

### IGV (Impuesto General a las Ventas)
- **Tasa:** 18%
- **Fórmula:** `igv = valor_unitario * cantidad * 0.18`
- **Nota:** El IGV se calcula sobre el valor unitario (sin IGV incluido), no sobre el precio de venta.

### Totales
```
subtotal = Σ(cantidad * precio_unitario)
igv_total = subtotal * 0.18
total = subtotal + igv_total
```

### Ejemplo
| Producto | Cantidad | Precio Unit. | Subtotal |
|---|---|---|---|
| Esponja doble uso | 10 | S/ 2.50 | S/ 25.00 |
| Paño amarillo | 5 | S/ 1.80 | S/ 9.00 |
| **Subtotal** | | | **S/ 34.00** |
| **IGV (18%)** | | | **S/ 6.12** |
| **Total** | | | **S/ 40.12** |

## Flujo de pedidos

```
PENDIENTE → PAGADO → APROBADO → ENTREGADO
   ↑          ↑          ↑
   |          |          |
Cliente    Confirma    Admin
crea       pago        aprueba
pedido     (Yape/      y descuenta
           Plin/       stock
           Efectivo)
```

### Estados y permisos
| Estado | Quién puede cambiar | Acción |
|---|---|---|
| `pendiente` | Cliente / Vendedor | Crear pedido, cancelar |
| `pagado` | Vendedor / Admin | Confirmar pago, enviar evidencia |
| `aprobado` | Admin únicamente | Aprobar pedido, generar comprobante SUNAT |
| `entregado` | Vendedor / Admin | Marcar como entregado |

## Reglas de stock
1. **Al crear pedido:** No se descuenta stock (solo reserva lógica).
2. **Al aprobar:** Se descuenta stock físicamente de la tabla `productos`.
3. **Si stock insuficiente:** Bloquear aprobación y notificar "Stock insuficiente para [producto]".
4. **Al cancelar:** Si estaba aprobado, devolver stock.

## Medios de pago aceptados
- **Yape** (QR)
- **Plin**
- **Transferencia bancaria** (BBVA, BCP, Interbank)
- **Efectivo** (contra entrega)

## Comprobantes vs Pedidos
- **Pedido:** Solicitud del cliente. Puede no tener comprobante.
- **Factura (01):** Para empresas con RUC. Afecta contabilidad.
- **Boleta (03):** Para personas con DNI. No afecta contabilidad del cliente.
- **Guía (09):** Solo para traslado físico de mercancía.

## Reglas de numeración
- Facturas: `F001-` + número correlativo (9 dígitos).
- Boletas: `B001-` + número correlativo.
- Guias: `T001-` + número correlativo.
- El correlativo se almacena en la DB y se incrementa por tipo.
