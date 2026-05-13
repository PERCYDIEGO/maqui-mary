// ============================================
// UTILIDADES DE CÁLCULOS TRIBUTARIOS
// Maqui Mary - Sistema de Documentos Electrónicos
// ============================================

import { ItemDocumento } from '@/types/documentos';

// Tasas tributarias
export const TASAS = {
  IGV: 0.18,           // 18%
  ICBPER: 0.50,        // S/ 0.50 por unidad (2024)
  REDONDEO: 2,         // 2 decimales
} as const;

// ============================================
// CÁLCULOS DE ITEMS
// ============================================

export interface CalculoItemResult {
  valorUnitarioSinIgv: number;
  valorVenta: number;
  igv: number;
  icbper: number;
  descuento: number;
  importeTotal: number;
}

export function calcularItem(
  cantidad: number,
  valorUnitarioSinIgv: number,
  descuento: number = 0,
  aplicaIcbper: boolean = false
): CalculoItemResult {
  // Valor de venta (cantidad x precio unitario sin IGV)
  const valorVenta = redondear(cantidad * valorUnitarioSinIgv);
  
  // IGV (18% del valor de venta)
  const igv = redondear(valorVenta * TASAS.IGV);
  
  // ICBPER (si aplica)
  const icbper = aplicaIcbper ? redondear(cantidad * TASAS.ICBPER) : 0;
  
  // Importe total
  const importeTotal = redondear(valorVenta + igv + icbper - descuento);
  
  return {
    valorUnitarioSinIgv,
    valorVenta,
    igv,
    icbper,
    descuento,
    importeTotal,
  };
}

// ============================================
// CÁLCULOS DE TOTALES - BOLETA
// ============================================

export interface TotalesBoleta {
  operacionGravada: number;
  operacionExonerada: number;
  operacionInafecta: number;
  descuentoTotal: number;
  icbperTotal: number;
  igvTotal: number;
  otrosCargos: number;
  otrosTributos: number;
  montoRedondeo: number;
  importeTotal: number;
  importeEnLetras: string;
}

export function calcularTotalesBoleta(
  items: ItemDocumento[],
  otrosCargos: number = 0
): TotalesBoleta {
  const operacionGravada = redondear(
    items.reduce((sum, item) => sum + item.valorVenta, 0)
  );
  
  const descuentoTotal = redondear(
    items.reduce((sum, item) => sum + item.descuento, 0)
  );
  
  const icbperTotal = redondear(
    items.reduce((sum, item) => sum + item.icbper, 0)
  );
  
  const igvTotal = redondear(operacionGravada * TASAS.IGV);
  
  const importeSinRedondeo = operacionGravada + igvTotal + icbperTotal + otrosCargos - descuentoTotal;
  
  const importeTotal = redondear(importeSinRedondeo);
  const montoRedondeo = redondear(importeTotal - importeSinRedondeo);
  
  return {
    operacionGravada,
    operacionExonerada: 0,
    operacionInafecta: 0,
    descuentoTotal,
    icbperTotal,
    igvTotal,
    otrosCargos,
    otrosTributos: 0,
    montoRedondeo,
    importeTotal,
    importeEnLetras: numeroALetras(importeTotal, 'SOLES'),
  };
}

// ============================================
// CÁLCULOS DE TOTALES - FACTURA
// ============================================

export interface TotalesFactura {
  subTotal: number;
  valorVenta: number;
  descuentoTotal: number;
  anticiposTotal: number;
  isc: number;
  igvTotal: number;
  icbperTotal: number;
  otrosCargos: number;
  otrosTributos: number;
  montoRedondeo: number;
  importeTotal: number;
  importeEnLetras: string;
  operacionesGratuitas: number;
}

export function calcularTotalesFactura(
  items: ItemDocumento[],
  otrosCargos: number = 0,
  operacionesGratuitas: number = 0
): TotalesFactura {
  const subTotal = redondear(
    items.reduce((sum, item) => sum + (item.cantidad * item.valorUnitario), 0)
  );
  
  const valorVenta = redondear(
    items.reduce((sum, item) => sum + item.valorVenta, 0)
  );
  
  const descuentoTotal = redondear(
    items.reduce((sum, item) => sum + item.descuento, 0)
  );
  
  const anticiposTotal = redondear(
    items.reduce((sum, item) => sum + item.anticipos, 0)
  );
  
  const icbperTotal = redondear(
    items.reduce((sum, item) => sum + item.icbper, 0)
  );
  
  const igvTotal = redondear(valorVenta * TASAS.IGV);
  const isc = 0; // Si aplica
  
  const importeSinRedondeo = valorVenta + igvTotal + isc + icbperTotal + otrosCargos - descuentoTotal - anticiposTotal;
  
  const importeTotal = redondear(importeSinRedondeo);
  const montoRedondeo = redondear(importeTotal - importeSinRedondeo);
  
  return {
    subTotal,
    valorVenta,
    descuentoTotal,
    anticiposTotal,
    isc,
    igvTotal,
    icbperTotal,
    otrosCargos,
    otrosTributos: 0,
    montoRedondeo,
    importeTotal,
    importeEnLetras: numeroALetras(importeTotal, 'SOLES'),
    operacionesGratuitas,
  };
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

export function redondear(valor: number, decimales: number = 2): number {
  return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
}

export function formatearMoneda(valor: number, moneda: 'PEN' | 'USD' = 'PEN'): string {
  const simbolo = moneda === 'PEN' ? 'S/' : '$';
  return `${simbolo} ${valor.toFixed(2)}`;
}

export function formatearNumeroDocumento(serie: string, numero: number): string {
  return `${serie}-${numero.toString().padStart(6, '0')}`;
}

// ============================================
// NÚMERO A LETRAS
// ============================================

const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
const ESPECIALES = [
  'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 
  'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO',
  'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
];

export function numeroALetras(numero: number, moneda: 'SOLES' | 'DOLARES' = 'SOLES'): string {
  if (numero === 0) return `CERO ${moneda}`;
  
  const esNegativo = numero < 0;
  numero = Math.abs(numero);
  
  const parteEntera = Math.floor(numero);
  const parteDecimal = Math.round((numero - parteEntera) * 100);
  
  let resultado = '';
  
  if (parteEntera === 0) {
    resultado = 'CERO';
  } else {
    resultado = convertirMillones(parteEntera);
  }
  
  const nombreMoneda = moneda === 'SOLES' ? 'SOLES' : 'DÓLARES AMERICANOS';
  const centimosStr = parteDecimal.toString().padStart(2, '0');
  
  return `${esNegativo ? 'MENOS ' : ''}${resultado} ${nombreMoneda} CON ${centimosStr}/100`;
}

function convertirMillones(numero: number): string {
  if (numero >= 1000000) {
    const millones = Math.floor(numero / 1000000);
    const resto = numero % 1000000;
    
    if (millones === 1) {
      return resto === 0 ? 'UN MILLÓN' : `UN MILLÓN ${convertirMiles(resto)}`;
    } else {
      return resto === 0 
        ? `${convertirMiles(millones)} MILLONES` 
        : `${convertirMiles(millones)} MILLONES ${convertirMiles(resto)}`;
    }
  }
  return convertirMiles(numero);
}

function convertirMiles(numero: number): string {
  if (numero >= 1000) {
    const miles = Math.floor(numero / 1000);
    const resto = numero % 1000;
    
    if (miles === 1) {
      return resto === 0 ? 'MIL' : `MIL ${convertirCentenas(resto)}`;
    } else {
      return resto === 0 
        ? `${convertirCentenas(miles)} MIL` 
        : `${convertirCentenas(miles)} MIL ${convertirCentenas(resto)}`;
    }
  }
  return convertirCentenas(numero);
}

function convertirCentenas(numero: number): string {
  if (numero >= 100) {
    const centenas = Math.floor(numero / 100);
    const resto = numero % 100;
    
    if (centenas === 1 && resto === 0) return 'CIEN';
    
    return resto === 0 
      ? CENTENAS[centenas] 
      : `${CENTENAS[centenas]} ${convertirDecenas(resto)}`;
  }
  return convertirDecenas(numero);
}

function convertirDecenas(numero: number): string {
  if (numero >= 11 && numero <= 29) {
    return ESPECIALES[numero - 11];
  }
  
  if (numero >= 10) {
    const decenas = Math.floor(numero / 10);
    const unidades = numero % 10;
    
    if (unidades === 0) return DECENAS[decenas];
    return `${DECENAS[decenas]} Y ${UNIDADES[unidades]}`;
  }
  
  return UNIDADES[numero];
}

// ============================================
// VALIDACIONES
// ============================================

export function validarRUC(ruc: string): boolean {
  if (!ruc || ruc.length !== 11) return false;
  if (!/^\d{11}$/.test(ruc)) return false;
  
  // Validar dígito verificador (algoritmo de SUNAT)
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const ultimoDigito = parseInt(ruc.charAt(10));
  
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(ruc.charAt(i)) * factores[i];
  }
  
  const resto = suma % 11;
  const digitoVerificador = resto === 0 ? 0 : 11 - resto;
  
  return digitoVerificador === ultimoDigito;
}

export function validarDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

export function formatearRUC(ruc: string): string {
  // 20606218801
  return ruc;
}

export function formatearDNI(dni: string): string {
  // 12345678
  return dni;
}

// ============================================
// GENERACIÓN DE HASH Y QR
// ============================================

export function generarHashCPE(documento: {
  rucEmisor: string;
  tipoDocumento: string;
  serie: string;
  numero: number;
  importeTotal: number;
  fechaEmision: Date;
}): string {
  // Hash simplificado - en producción usar algoritmo oficial de SUNAT
  const data = `${documento.rucEmisor}|${documento.tipoDocumento}|${documento.serie}|${documento.numero}|${documento.importeTotal.toFixed(2)}|${documento.fechaEmision.toISOString().split('T')[0]}`;
  
  // Simulación de hash - en producción usar crypto
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

export function generarDatosQR(documento: {
  rucEmisor: string;
  tipoDocumento: string;
  serie: string;
  numero: number;
  importeTotal: number;
  fechaEmision: Date;
  hashCPE: string;
}): string {
  // Formato estándar SUNAT para QR
  return [
    documento.rucEmisor,
    documento.tipoDocumento,
    documento.serie,
    documento.numero.toString(),
    documento.importeTotal.toFixed(2),
    documento.fechaEmision.toISOString().split('T')[0],
    documento.hashCPE,
  ].join('|');
}
