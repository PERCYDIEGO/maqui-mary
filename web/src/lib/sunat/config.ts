import { SunatConfig, SunatEnviroment } from './types'

export const SUNAT_DEMO_RUC = '10456789012'
export const SUNAT_DEMO_RZ = 'ES PONJAS MAQUI MARY'
export const SUNAT_DEMO_DIRECCION = 'Calle Las Quebradas Mz E Lote 10, Ate Vitarte'

export const SUNAT_ENDPOINTS: Record<SunatEnviroment, { billService: string; statusService: string }> = {
  demo: {
    billService: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    statusService: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
  },
  beta: {
    billService: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    statusService: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
  },
  produccion: {
    billService: 'https://e-gw.sunat.gob.pe/ol-ti-itcpfegem/billService',
    statusService: 'https://e-gw.sunat.gob.pe/ol-ti-itcpfegem/billService',
  },
}

export function getSunatConfig(): SunatConfig {
  const env = (process.env.SUNAT_ENVIRONMENT || 'demo') as SunatEnviroment

  return {
    environment: env,
    ruc: process.env.SUNAT_RUC || SUNAT_DEMO_RUC,
    razonSocial: process.env.SUNAT_RAZON_SOCIAL || SUNAT_DEMO_RZ,
    nombreComercial: process.env.SUNAT_NOMBRE_COMERCIAL || 'MAQUI MARY',
    address: process.env.SUNAT_DIRECCION || SUNAT_DEMO_DIRECCION,
    urbanizacion: process.env.SUNAT_URBANIZACION || 'LAS QUEBRADAS',
    provincia: process.env.SUNAT_PROVINCIA || 'LIMA',
    departamento: process.env.SUNAT_DEPARTAMENTO || 'LIMA',
    distrito: process.env.SUNAT_DISTRITO || 'ATE',
    codigoPais: 'PE',
    ubigeo: process.env.SUNAT_UBIGEO || '150103',

    solUser: process.env.SUNAT_SOL_USER || 'DEMO_USER',
    solPassword: process.env.SUNAT_SOL_PASSWORD || 'DEMO_PASS',

    certPath: process.env.SUNAT_CERT_PATH || '',
    certPassword: process.env.SUNAT_CERT_PASSWORD || '',

    seriesFactura: process.env.SUNAT_SERIES_FACTURA || 'F001',
    seriesBoleta: process.env.SUNAT_SERIES_BOLETA || 'B001',
    seriesNC: process.env.SUNAT_SERIES_NC || 'FC01',
    seriesND: process.env.SUNAT_SERIES_ND || 'FD01',
  }
}

export function isDemoMode(): boolean {
  return (process.env.SUNAT_ENVIRONMENT || 'demo') === 'demo'
}

export const IGV_PERCENT = 0.18
export const IGV_CODE = '1000'
export const IGV_NAME = 'IGV'
export const IGV_TYPE = 'VAT'
