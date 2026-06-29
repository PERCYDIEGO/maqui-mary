// ============================================
// CONTEXT GLOBAL DEL SISTEMA
// Estado compartido entre todos los módulos
// ============================================

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Boleta, 
  Factura, 
  GuiaRemision, 
  Cliente, 
  Transportista,
  Producto,
  ConfiguracionSerie,
  CATALOGO_MOTIVOS_TRASLADO,
  EMPRESA_DATA
} from '@/types/documentos';

// ============================================
// TIPOS DEL CONTEXT
// ============================================

interface AppState {
  // Listas principales
  boletas: Boleta[];
  facturas: Factura[];
  guias: GuiaRemision[];
  clientes: Cliente[];
  transportistas: Transportista[];
  productos: Producto[];
  
  // Configuración
  series: ConfiguracionSerie[];
  
  // Estado UI
  isLoading: boolean;
  error: string | null;
  notificacion: {
    tipo: 'success' | 'error' | 'info' | 'warning';
    mensaje: string;
    visible: boolean;
  } | null;
  
  // Estado productos
  productosLoaded: boolean;
}

interface AppContextType extends AppState {
  // Actions
  setBoletas: (boletas: Boleta[]) => void;
  addBoleta: (boleta: Boleta) => void;
  updateBoleta: (boleta: Boleta) => void;
  
  setFacturas: (facturas: Factura[]) => void;
  addFactura: (factura: Factura) => void;
  updateFactura: (factura: Factura) => void;
  
  setGuias: (guias: GuiaRemision[]) => void;
  addGuia: (guia: GuiaRemision) => void;
  updateGuia: (guia: GuiaRemision) => void;
  
  setClientes: (clientes: Cliente[]) => void;
  addCliente: (cliente: Cliente) => void;
  updateCliente: (cliente: Cliente) => void;
  
  setTransportistas: (transportistas: Transportista[]) => void;
  addTransportista: (transportista: Transportista) => void;
  updateTransportista: (transportista: Transportista) => void;
  
  setProductos: (productos: Producto[]) => void;
  refreshProductos: () => Promise<void>;
  refreshClientes: () => Promise<void>;
  refreshTransportistas: () => Promise<void>;
  refreshDocuments: () => Promise<void>;

  // SUNAT - Envío de documentos
  enviarDocumentoSUNAT: (documentoId: string, tipo: 'boleta' | 'factura') => Promise<{ success: boolean; message: string }>;
  enviarGuiaSUNAT: (guiaId: string) => Promise<{ success: boolean; message: string }>;
  aprobarDocumento: (documentoId: string, tipo: 'boleta' | 'factura') => Promise<void>;
  rechazarDocumento: (documentoId: string, tipo: 'boleta' | 'factura', motivo: string) => Promise<void>;
  eliminarDocumentoRechazado: (documentoId: string, tipo: 'boleta' | 'factura' | 'guia') => Promise<void>;

  // Carga bajo demanda para CRM
  loadCrmData: () => Promise<void>;

  // Utilidades
  showNotificacion: (tipo: 'success' | 'error' | 'info' | 'warning', mensaje: string) => void;
  hideNotificacion: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Obtener siguiente número de serie
  getSiguienteNumero: (tipo: 'boleta' | 'factura' | 'guia') => number;
}

// ============================================
// CONTEXT
// ============================================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Estados con datos ficticios
  const [boletas, setBoletasState] = useState<Boleta[]>([]);
  const [facturas, setFacturasState] = useState<Factura[]>([]);
  const [guias, setGuiasState] = useState<GuiaRemision[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [clientes, setClientesState] = useState<Cliente[]>([]);
  
  const [transportistas, setTransportistasState] = useState<Transportista[]>([]);
  
  // Productos - iniciales + se cargan desde Supabase
  const [productos, setProductosState] = useState<Producto[]>([
    {
      id: '1',
      codigo: 'PRO-001',
      descripcion: 'Mix x10 Esponjas Colores',
      detalle: 'Pack de 10 esponjas de colores variados. Suaves para limpieza general de vajilla y superficies delicadas.',
      unidadMedida: 'PAQUETE',
      precioOriginal: 18.00,
      precioUnitario: 12.90,
      stock: 500,
      categoria: 'Esponjas',
      imagen: '/img/esponjas-colores.png',
      activo: true,
      usosFrecuentes: 145,
    },
    {
      id: '2',
      codigo: 'PRO-002',
      descripcion: 'Esponja Doble Uso',
      detalle: 'Un lado suave para delicados, otro lado abrasivo para suciedad difícil. Perfecta para ollas y sartenes.',
      unidadMedida: 'UNIDAD',
      precioOriginal: 3.50,
      precioUnitario: 2.50,
      stock: 350,
      categoria: 'Esponjas',
      imagen: '/img/esponja_doble_uso_cuadrada.png',
      activo: true,
      usosFrecuentes: 98,
    },
    {
      id: '3',
      codigo: 'PRO-003',
      descripcion: 'Paño Absorbente Amarillo',
      detalle: 'Paño de microfibra super absorbente. Ideal para secar, limpiar vidrios y pulir superficies sin dejar pelusa.',
      unidadMedida: 'UNIDAD',
      precioOriginal: 5.00,
      precioUnitario: 3.50,
      stock: 200,
      categoria: 'Limpieza',
      imagen: '/img/paño_amarillo.png',
      activo: true,
      usosFrecuentes: 67,
    },
  ]);
  const [productosLoaded, setProductosLoaded] = useState(false);
  const [series, setSeries] = useState<ConfiguracionSerie[]>([
    { tipo: 'boleta', serie: 'EB01', numeroActual: 134, activo: true },
    { tipo: 'factura', serie: 'E001', numeroActual: 882, activo: true },
    { tipo: 'guia', serie: 'T001', numeroActual: 294, activo: true },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificacion, setNotificacion] = useState<AppState['notificacion']>(null);

  // Función para cargar productos desde Supabase (centralizada)
  const loadProductos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('category')
        .order('name');

      if (error) {
        console.error('Error cargando productos:', error);
        setProductosLoaded(true); // Marcar como cargado incluso si hay error
        return;
      }

      if (data && data.length > 0) {
        // Mapear los datos de Supabase al formato Producto
        const productosMapeados: Producto[] = data.map((p: any) => ({
          id: String(p.id),
          codigo: p.codigo,
          descripcion: p.name,
          detalle: p.description || '',
          unidadMedida: p.unidad_de_medida || 'UNIDAD',
          precioOriginal: Number(p.precio_original || p.price || 0),
          precioUnitario: Number(p.price || 0),
          stock: p.stock || 0,
          categoria: p.category || 'General',
          imagen: p.imagen || p.image || '',
          activo: p.activo !== false,
          usosFrecuentes: p.usosFrecuentes || 0,
          codigoSunat: p.codigoSunat,
          partidaArancelaria: p.partidaArancelaria,
          gtin: p.gtin,
        }));
        setProductosState(productosMapeados);
      }
      // Si no hay datos en Supabase, mantener los productos iniciales
      setProductosLoaded(true);
    } catch (err) {
      console.error('Error cargando productos:', err);
      setProductosLoaded(true); // Marcar como cargado incluso si hay error
    }
  }, []);

  const loadClientes = useCallback(async () => {
    try {
      const [{ data: clientesData, error }, { data: dirsData }] = await Promise.all([
        supabase.from('clientes').select('*').order('name'),
        supabase.from('cliente_direcciones').select('*').order('id'),
      ])
      if (error) { console.error('Error cargando clientes:', error); return; }
      if (clientesData) {
        setClientesState(clientesData.map((row: any): Cliente => ({
          id: String(row.id),
          codigo: row.codigo || undefined,
          tipo: row.tipo_documento === '6' ? 'juridica' : 'natural',
          nombre: row.name,
          razonSocial: row.tipo_documento === '6' ? row.name : undefined,
          ruc: row.tipo_documento === '6' ? (row.num_documento || '') : undefined,
          dni: row.tipo_documento !== '6' ? (row.num_documento || row.dni || '') : (row.dni || undefined),
          direccion: row.address || '',
          direccionesReferencia: (dirsData || [])
            .filter((d: any) => d.cliente_id === row.id)
            .map((d: any) => ({ id: d.id, etiqueta: d.etiqueta, direccion: d.direccion })),
          telefono: row.phone || undefined,
          email: row.email || undefined,
          esFrecuente: false,
          totalCompras: 0,
          createdAt: new Date(row.created_at),
        })))
      }
    } catch (err) {
      console.error('Error cargando clientes:', err)
    }
  }, [])

  const loadTransportistas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transportistas')
        .select('*')
        .eq('activo', true)
        .order('apellidos')
      if (error) { console.error('Error cargando transportistas:', error); return; }
      if (data) {
        setTransportistasState(data.map((row: any): Transportista => {
          const modalidad: 'privado' | 'publico' = row.modalidad === 'publico' ? 'publico' : 'privado';
          const nombreCompleto = modalidad === 'publico'
            ? row.nombres  // empresa externa — solo el nombre/razón social
            : row.nombre_completo || `${row.apellidos}, ${row.nombres}`;
          return {
            id: String(row.id),
            codigo: row.codigo || undefined,
            modalidad,
            nombres: row.nombres,
            apellidos: row.apellidos || '',
            nombreCompleto,
            dni: row.dni || undefined,
            licenciaConducir: row.licencia_conducir || undefined,
            numeroPlaca: row.numero_placa || undefined,
            ruc: row.ruc || undefined,
            numeroRegistroMTC: row.numero_registro_mtc || undefined,
            direccion: row.direccion || undefined,
            activo: row.activo,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at || row.created_at),
          };
        }))
      }
    } catch (err) {
      console.error('Error cargando transportistas:', err)
    }
  }, [])

  // ============================================
  // Helper: mapear estado interno a estado_sunat
  // ============================================
  const mapEstadoToSunat = (estado: string): string => {
    switch (estado) {
      case 'borrador': return 'PENDIENTE';
      case 'pendiente_envio': return 'PENDIENTE';
      case 'enviado': return 'ENVIADO';
      case 'aprobado': return 'ACEPTADO';
      case 'rechazado': return 'RECHAZADO';
      default: return 'PENDIENTE';
    }
  }

  // ============================================
  // Helper: revivir fechas en objetos reconstruidos
  // ============================================
  const reviveDates = (obj: any): any => {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(obj)) return new Date(obj)
    if (Array.isArray(obj)) return obj.map(reviveDates)
    if (typeof obj === 'object') {
      const result: any = {}
      for (const key of Object.keys(obj)) {
        result[key] = reviveDates(obj[key])
      }
      return result
    }
    return obj
  }

  // ============================================
  // Cargar boletas/facturas desde Supabase
  // ============================================
  const loadDocuments = useCallback(async () => {
    try {
      // Cargar facturas y boletas
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('origen', 'crm')
        .order('created_at', { ascending: false })

      if (error) { console.error('Error cargando documentos:', error); return }

      if (!data) return

      const boletasBD: Boleta[] = []
      const facturasBD: Factura[] = []

      for (const row of data) {
        const doc = reviveDates(row.data_json || {})
        if (!doc || !doc.id) continue

        if (row.created_by) doc.createdBy = row.created_by

        if (row.tipo_comprobante === '03') {
          boletasBD.push(doc as Boleta)
        } else if (row.tipo_comprobante === '01') {
          facturasBD.push(doc as Factura)
        }
      }

      if (boletasBD.length > 0) setBoletasState(boletasBD)
      if (facturasBD.length > 0) setFacturasState(facturasBD)

      // Cargar guías
      const { data: guiasData, error: guiasError } = await supabase
        .from('guias')
        .select('*')
        .order('created_at', { ascending: false })

      if (guiasError) { console.error('Error cargando guías:', guiasError); return }

      if (guiasData && guiasData.length > 0) {
        const guiasBD: GuiaRemision[] = guiasData.map((row: any) => {
          const dataJson = reviveDates(row.data_json || {})
          return {
            ...dataJson,
            id: row.id,
            estado: row.estado || 'borrador',
            estadoSUNAT: row.estado_sunat,
            hashSUNAT: row.ticket_sunat,
            cdrSUNAT: row.cdr_sunat,
            xmlSUNAT: row.xml_sunat,
            pdfSUNAT: row.pdf_ticket_sunat,
            errorSUNAT: row.error_sunat,
            enviadoPor: row.enviado_por,
            enviadoAt: row.enviado_at ? new Date(row.enviado_at) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            // Fallback a columnas individuales — siempre con coerción a string
            // para evitar que reviveDates() convierta campos texto a Date (TypeError en .toLowerCase())
            numeroCompleto: (typeof dataJson.numeroCompleto === 'string' ? dataJson.numeroCompleto : null) ||
              (row.serie && row.numero !== undefined ? `${row.serie}-${String(row.numero).padStart(8, '0')}` : undefined),
            destinatarioNombre: String(typeof dataJson.destinatarioNombre === 'string' ? dataJson.destinatarioNombre : (row.destinatario_nombre ?? '')),
            puntoLlegada: String(typeof dataJson.puntoLlegada === 'string' ? dataJson.puntoLlegada : (row.punto_llegada ?? '')),
            motivoTraslado: String(typeof dataJson.motivoTraslado === 'string' ? dataJson.motivoTraslado : (row.motivo_traslado ?? '')),
            bienes: Array.isArray(dataJson.bienes) ? dataJson.bienes : [],
          } as GuiaRemision
        })
        setGuiasState(guiasBD)
        const maxGuia = guiasData.reduce((max: number, row: any) => Math.max(max, row.numero || 0), 0)
        if (maxGuia > 0) {
          setSeries(prev => prev.map(s =>
            s.tipo === 'guia' ? { ...s, numeroActual: Math.max(s.numeroActual, maxGuia) } : s
          ))
        }
      }
    } catch (err) {
      console.error('Error cargando documentos:', err)
    }
  }, [])

  // ============================================
  // Obtener sesión al iniciar (sin cargar datos)
  // Productos se cargan bajo demanda desde cada página
  // ============================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id)
    })
  }, []);

  // BUG-14: sincronizar series desde sunat_config para que el número preview coincida con SUNAT
  const loadSeries = useCallback(async () => {
    try {
      const { data } = await supabase.from('sunat_config').select('series_boleta,series_factura,next_number_boleta,next_number_factura').eq('id', 1).single()
      if (!data) return
      setSeries(prev => prev.map(s => {
        if (s.tipo === 'boleta') return { ...s, serie: data.series_boleta || s.serie, numeroActual: Math.max(0, (data.next_number_boleta || 1) - 1) }
        if (s.tipo === 'factura') return { ...s, serie: data.series_factura || s.serie, numeroActual: Math.max(0, (data.next_number_factura || 1) - 1) }
        return s
      }))
    } catch {
      // mantener valores locales si falla la carga
    }
  }, [])

  // Cargar clientes, transportistas y documentos solo si estamos en CRM
  const loadCrmData = useCallback(async () => {
    await Promise.all([
      loadClientes(),
      loadTransportistas(),
      loadDocuments(),
      loadProductos(),
      loadSeries(),
    ])
  }, [loadClientes, loadTransportistas, loadDocuments, loadProductos, loadSeries])

  // ============================================
  // ACTIONS - BOLETAS
  // ============================================
  
  const setBoletas = useCallback((nuevasBoletas: Boleta[]) => {
    setBoletasState(nuevasBoletas);
  }, []);

  const addBoleta = useCallback((boleta: Boleta) => {
    const boletaConUsuario = { ...boleta, createdBy: userId } as any;
    setBoletasState(prev => [boletaConUsuario, ...prev]);
    setSeries(prev => prev.map(s =>
      s.tipo === 'boleta' && s.serie === boleta.serie
        ? { ...s, numeroActual: s.numeroActual + 1 }
        : s
    ));
    supabase.from('sunat_config').update({ next_number_boleta: boleta.numero + 1 }).eq('id', 1)
      .then(({ error }) => { if (error) console.error('Error actualizando contador boleta:', error) });
    supabase.from('facturas').insert({
      series: boleta.serie,
      number: boleta.numero,
      cliente_nombre: boleta.cliente.nombre,
      cliente_ruc: boleta.cliente.ruc || boleta.cliente.dni || '',
      cliente_direccion: boleta.cliente.direccion || '',
      total: boleta.importeTotal,
      moneda: boleta.moneda,
      tipo_comprobante: '03',
      origen: 'crm',
      estado_sunat: mapEstadoToSunat(boleta.estado),
      data_json: JSON.parse(JSON.stringify(boletaConUsuario)),
      created_by: userId,
    }).then(({ error }) => {
      if (error) console.error('Error persistiendo boleta:', error)
    })
  }, [userId]);

  const updateBoleta = useCallback((boleta: Boleta) => {
    setBoletasState(prev => 
      prev.map(b => b.id === boleta.id ? boleta : b)
    );
  }, []);

  // ============================================
  // ACTIONS - FACTURAS
  // ============================================
  
  const setFacturas = useCallback((nuevasFacturas: Factura[]) => {
    setFacturasState(nuevasFacturas);
  }, []);

  const addFactura = useCallback((factura: Factura) => {
    const facturaConUsuario = { ...factura, createdBy: userId } as any;
    setFacturasState(prev => [facturaConUsuario, ...prev]);
    setSeries(prev => prev.map(s =>
      s.tipo === 'factura' && s.serie === factura.serie
        ? { ...s, numeroActual: s.numeroActual + 1 }
        : s
    ));
    supabase.from('sunat_config').update({ next_number_factura: factura.numero + 1 }).eq('id', 1)
      .then(({ error }) => { if (error) console.error('Error actualizando contador factura:', error) });
    supabase.from('facturas').insert({
      series: factura.serie,
      number: factura.numero,
      cliente_nombre: factura.cliente.razonSocial || factura.cliente.nombre,
      cliente_ruc: factura.cliente.ruc || '',
      cliente_direccion: factura.cliente.direccion || '',
      total: factura.importeTotal,
      moneda: factura.moneda,
      tipo_comprobante: '01',
      origen: 'crm',
      estado_sunat: mapEstadoToSunat(factura.estado),
      data_json: JSON.parse(JSON.stringify(facturaConUsuario)),
      created_by: userId,
    }).then(({ error }) => {
      if (error) console.error('Error persistiendo factura:', error)
    })
  }, [userId]);

  const updateFactura = useCallback((factura: Factura) => {
    setFacturasState(prev => 
      prev.map(f => f.id === factura.id ? factura : f)
    );
  }, []);

  // ============================================
  // ACTIONS - GUÍAS
  // ============================================
  
  const setGuias = useCallback((nuevasGuias: GuiaRemision[]) => {
    setGuiasState(nuevasGuias);
  }, []);

  const addGuia = useCallback((guia: GuiaRemision) => {
    setGuiasState(prev => [guia, ...prev]);
    setSeries(prev => prev.map(s => 
      s.tipo === 'guia' && s.serie === guia.serie
        ? { ...s, numeroActual: s.numeroActual + 1 }
        : s
    ));
  }, []);

  const updateGuia = useCallback((guia: GuiaRemision) => {
    setGuiasState(prev => 
      prev.map(g => g.id === guia.id ? guia : g)
    );
  }, []);

  // ============================================
  // ACTIONS - CLIENTES
  // ============================================
  
  const setClientes = useCallback((nuevosClientes: Cliente[]) => {
    setClientesState(nuevosClientes);
  }, []);

  const addCliente = useCallback((cliente: Cliente) => {
    setClientesState(prev => [cliente, ...prev]);
  }, []);

  const updateCliente = useCallback((cliente: Cliente) => {
    setClientesState(prev => 
      prev.map(c => c.id === cliente.id ? cliente : c)
    );
  }, []);

  // ============================================
  // ACTIONS - TRANSPORTISTAS
  // ============================================
  
  const setTransportistas = useCallback((nuevosTransportistas: Transportista[]) => {
    setTransportistasState(nuevosTransportistas);
  }, []);

  const addTransportista = useCallback((transportista: Transportista) => {
    setTransportistasState(prev => [transportista, ...prev]);
  }, []);

  const updateTransportista = useCallback((transportista: Transportista) => {
    setTransportistasState(prev => 
      prev.map(t => t.id === transportista.id ? transportista : t)
    );
  }, []);

  // ============================================
  // ACTIONS - PRODUCTOS
  // ============================================

  const setProductos = useCallback((nuevosProductos: Producto[]) => {
    setProductosState(nuevosProductos);
  }, []);

  // ============================================
  // UTILIDADES
  // ============================================

  const showNotificacion = useCallback((tipo: 'success' | 'error' | 'info' | 'warning', mensaje: string) => {
    setNotificacion({ tipo, mensaje, visible: true });
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      setNotificacion(null);
    }, 5000);
  }, []);

  // ============================================
  // SUNAT - ENVÍO DE DOCUMENTOS
  // ============================================

  const enviarDocumentoSUNAT = useCallback(async (documentoId: string, tipo: 'boleta' | 'factura'): Promise<{ success: boolean; message: string }> => {
    try {
      // Obtener el documento
      const documento = tipo === 'boleta' 
        ? boletas.find(b => b.id === documentoId)
        : facturas.find(f => f.id === documentoId);

      if (!documento) {
        return { success: false, message: 'Documento no encontrado' };
      }

      // Transformar items al formato de la API
      // unit_price debe ser SIN IGV: valorVenta es el total de la línea sin IGV,
      // dividido entre cantidad da el precio unitario sin IGV que espera el XML-builder.
      const items = documento.items.map(item => ({
        producto_id: item.productoId || null,
        codigo: item.productoId || `ITEM-${item.numeroOrden}`,
        description: item.descripcion,
        quantity: item.cantidad,
        unit_price: item.cantidad > 0 ? item.valorVenta / item.cantidad : item.valorUnitario / 1.18,
      }));

      // Determinar tipo de comprobante
      const tipo_comprobante = tipo === 'factura' ? '01' : '03';

      // Preparar datos del cliente
      const cliente_id = documento.cliente.id;
      const cliente_nombre = tipo === 'boleta' 
        ? (documento as Boleta).cliente.nombre 
        : (documento as Factura).cliente.razonSocial || documento.cliente.nombre;
      const cliente_ruc = documento.cliente.ruc || documento.cliente.dni || '';
      const cliente_tipo_doc = documento.cliente.ruc ? '6' : '1';
      const cliente_direccion = documento.cliente.direccion || '';

      // BUG-03: incluir token en Authorization header para que la ruta API pueda verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      const authHeaders: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) authHeaders['Authorization'] = `Bearer ${session.access_token}`

      // BUG-01: enviar serie y número del documento para que SUNAT use el mismo que ve el usuario
      const response = await fetch('/api/sunat/emit', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cliente_id,
          cliente_nombre,
          cliente_ruc,
          cliente_tipo_doc,
          cliente_direccion,
          tipo_comprobante,
          items,
          notes: documento.observacion || '',
          origen: 'crm',
          moneda: documento.moneda,
          serie_override: documento.serie,
          numero_override: documento.numero,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const errorMsg = result.error || 'Error en el envío a SUNAT';
        const docActualizado: any = {
          estado: 'rechazado',
          enviadoPor: userId,
          enviadoAt: new Date(),
          cdr: {
            codigo: result.estado_sunat || 'ERROR',
            mensaje: errorMsg,
            fechaRecepcion: new Date(),
          }
        }

        if (tipo === 'boleta') {
          setBoletasState(prev => prev.map(b =>
            b.id === documentoId ? { ...b, ...docActualizado } : b
          ));
        } else {
          setFacturasState(prev => prev.map(f =>
            f.id === documentoId ? { ...f, ...docActualizado } : f
          ));
        }

        supabase.from('facturas').update({
          estado_sunat: 'RECHAZADO',
          data_json: JSON.parse(JSON.stringify({ ...documento, ...docActualizado })),
        }).eq('data_json->>id', documentoId).then(({ error }) => {
          if (error) console.error('Error persistiendo rechazo:', error)
        })

        return { success: false, message: errorMsg };
      }

      const estadoSunat = result.estado_sunat || 'PENDIENTE';
      let nuevoEstado: 'enviado' | 'aprobado' | 'rechazado';

      if (estadoSunat === 'ACEPTADO') {
        nuevoEstado = 'aprobado';
      } else if (estadoSunat === 'RECHAZADO' || estadoSunat === 'ERROR') {
        nuevoEstado = 'rechazado';
      } else {
        nuevoEstado = 'enviado';
      }

      const ahora = new Date()
      const docActualizadoOk: any = {
        estado: nuevoEstado,
        enviadoPor: userId,
        enviadoAt: ahora,
        cdr: {
          codigo: nuevoEstado === 'aprobado'
            ? (result.factura?.ticket_sunat || result.factura?.cdr_codigo || '0')
            : (result.factura?.cdr_codigo || result.estado_sunat || 'ERROR'),
          mensaje: nuevoEstado === 'aprobado'
            ? (result.mensaje || 'Documento aceptado por SUNAT')
            : (result.error_ose || result.factura?.cdr_descripcion || result.mensaje || 'Documento rechazado por SUNAT'),
          fechaRecepcion: ahora,
        },
      }

      if (tipo === 'boleta') {
        setBoletasState(prev => prev.map(b =>
          b.id === documentoId ? { ...b, ...docActualizadoOk } : b
        ));
      } else {
        setFacturasState(prev => prev.map(f =>
          f.id === documentoId ? { ...f, ...docActualizadoOk } : f
        ));
      }

      supabase.from('facturas').update({
        estado_sunat: estadoSunat,
        data_json: JSON.parse(JSON.stringify({ ...documento, ...docActualizadoOk })),
      }).eq('data_json->>id', documentoId).then(({ error }) => {
        if (error) console.error('Error persistiendo envio SUNAT:', error)
      })

      return {
        success: nuevoEstado === 'aprobado',
        message: nuevoEstado === 'aprobado'
          ? (result.mensaje || 'Documento aceptado por SUNAT')
          : (result.error_ose || result.factura?.cdr_descripcion || result.mensaje || 'Documento rechazado o con error'),
      };
    } catch (error: any) {
      console.error('Error enviando a SUNAT:', error);
      return { success: false, message: error.message || 'Error al enviar a SUNAT' };
    }
  }, [boletas, facturas, userId]);

  const enviarGuiaSUNAT = useCallback(async (guiaId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const guia = guias.find(g => g.id === guiaId);
      if (!guia) {
        return { success: false, message: 'Guía no encontrada' };
      }

      const tipoGuia = guia.tipoGuia === 'transportista' ? '31' : '09';
      // Usar la serie y numero REALES de la guía, no de sunat_config
      const serie = guia.serie || 'T001';
      const numero = guia.numero || 1;

      // SUNAT valida que fecha_emision sea hoy o hasta 3 días previos (hora Perú UTC-5).
      // Usamos la hora actual en Perú — no la stored en DB que pudo grabarse en UTC.
      const peruNow = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const fechaEmision = peruNow.toISOString().slice(0, 10);  // YYYY-MM-DD hora Perú
      const horaEmision  = peruNow.toISOString().slice(11, 19); // HH:MM:SS hora Perú

      // Preparar datos del destinatario
      const destTipoDoc = guia.destinatarioDniRuc?.length === 11 ? '6' : '1';
      
      // Preparar datos del transportista (APISUNAT espera object)
      let transportistaRuc: string | undefined;
      let transportistaDenominacion: string | undefined;
      let transportistaRegistroMTC: string | undefined;

      // Preparar conductores y vehículos (APISUNAT espera arrays)
      const conductores: any[] = [];
      const vehiculos: any[] = [];

      if (guia.transportista) {
        const t = guia.transportista;
        if (t.modalidad === 'publico') {
          // Transportista público: va en object transportista
          transportistaRuc = t.ruc || '';
          transportistaDenominacion = t.nombreCompleto;
          transportistaRegistroMTC = t.numeroRegistroMTC || '';
        } else {
          // Transportista privado: va en arrays conductores + vehiculos
          conductores.push({
            tipo_de_documento: '1',
            numero_de_documento: t.dni || '',
            nombres: t.nombres || '',
            apellidos: t.apellidos || '',
            numero_licencia_conducir: t.licenciaConducir || '',
          });
          vehiculos.push({
            numero_de_placa: t.numeroPlaca || '',
          });
        }
      }

      // Documentos relacionados (APISUNAT espera: documento, serie, numero, ruc_emisor)
      const docsRelacionados = guia.documentosRelacionados?.map(d => {
        // Extraer serie y número del númeroCompleto (ej: "F001-000123" -> serie=F001, numero=000123)
        const parts = d.numero.split('-');
        const docSerie = parts[0] || '';
        const docNumero = parts[1] || d.numero;
        return {
          tipo: d.tipo === 'factura' ? 'factura' : d.tipo === 'boleta' ? 'boleta' : 'guia',
          serie: docSerie,
          numero: docNumero,
          ruc_emisor: EMPRESA_DATA.ruc,
        };
      }) || [];

      // BUG-03: incluir token en Authorization header
      const { data: { session: guiaSession } } = await supabase.auth.getSession()
      const guiaHeaders: HeadersInit = { 'Content-Type': 'application/json' }
      if (guiaSession?.access_token) guiaHeaders['Authorization'] = `Bearer ${guiaSession.access_token}`

      const response = await fetch('/api/sunat/guia', {
        method: 'POST',
        headers: guiaHeaders,
        body: JSON.stringify({
          guia_id: guiaId,
          tipo_guia: tipoGuia,
          serie,
          numero,
          fecha_emision: fechaEmision,
          hora_emision: horaEmision,
          moneda: 'PEN',
          modalidad_traslado: guia.modalidadTraslado,
          motivo_traslado: guia.motivoTraslado,
          descripcion_motivo: CATALOGO_MOTIVOS_TRASLADO.find(m => m.value === guia.motivoTraslado)?.label || '',
          fecha_inicio_traslado: new Date(guia.fechaInicioTraslado).toISOString().split('T')[0],
          destinatario_tipo_doc: destTipoDoc,
          destinatario_num_doc: guia.destinatarioDniRuc || '',
          destinatario_nombre: guia.destinatarioNombre,
          destinatario_direccion: guia.puntoLlegada,
          punto_partida_ubigeo: '150118', // Lurigancho (Chosica)
          punto_partida: guia.puntoPartida,
          punto_llegada_ubigeo: '150122', // Default, se puede mejorar
          punto_llegada: guia.puntoLlegada,
          peso_total: guia.pesoTotal,
          unidad_peso: guia.unidadMedidaPeso,
          numero_bultos: guia.bienes?.length || 1,
          observaciones: guia.observacion || null,
          transportista_ruc: transportistaRuc,
          transportista_denominacion: transportistaDenominacion,
          transportista_registro_mtc: transportistaRegistroMTC,
          conductores,
          vehiculos,
          bienes: guia.bienes.map(b => ({
            codigo_interno: b.productoId || '0001',
            descripcion: b.descripcion,
            unidad_de_medida: b.unidadMedida || 'NIU',
            cantidad: b.cantidad,
          })),
          documentos_relacionados: docsRelacionados,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const errorMsg = result.error || 'Error al enviar guía a SUNAT';
        
        setGuiasState(prev => prev.map(g =>
          g.id === guiaId ? { ...g, estado: 'rechazado' as any, errorSUNAT: errorMsg } : g
        ));

        return { success: false, message: errorMsg };
      }

      setGuiasState(prev => prev.map(g =>
        g.id === guiaId ? { 
          ...g, 
          estado: 'aprobado' as any,
          hashSUNAT: result.hash,
          cdrSUNAT: result.cdr,
        } : g
      ));

      return {
        success: true,
        message: result.message || 'Guía aceptada por SUNAT',
      };

    } catch (error: any) {
      console.error('Error enviando guía a SUNAT:', error);
      return { success: false, message: error.message || 'Error al enviar guía a SUNAT' };
    }
  }, [guias, series]);

  const aprobarDocumento = useCallback(async (documentoId: string, tipo: 'boleta' | 'factura') => {
    const docExistente = tipo === 'boleta'
      ? boletas.find(b => b.id === documentoId)
      : facturas.find(f => f.id === documentoId);

    const cdrData = {
      codigo: '0',
      mensaje: 'La Boleta de Venta o Factura ha sido aceptada',
      fechaRecepcion: new Date(),
    };

    const docActualizado: any = { estado: 'aprobado', cdr: cdrData };

    if (tipo === 'boleta') {
      setBoletasState(prev => prev.map(b =>
        b.id === documentoId ? { ...b, ...docActualizado } : b
      ));
    } else {
      setFacturasState(prev => prev.map(f =>
        f.id === documentoId ? { ...f, ...docActualizado } : f
      ));
    }

    const docCompleto = docExistente ? { ...docExistente, ...docActualizado } : docActualizado;
    supabase.from('facturas').update({
      estado_sunat: 'ACEPTADO',
      data_json: JSON.parse(JSON.stringify(docCompleto)),
    }).eq('data_json->>id', documentoId).then(({ error }) => {
      if (error) console.error('Error persistiendo aprobacion:', error)
    })

    showNotificacion('success', 'Documento aprobado por SUNAT');
  }, [boletas, facturas, showNotificacion]);

  const eliminarDocumentoRechazado = useCallback(async (documentoId: string, tipo: 'boleta' | 'factura' | 'guia') => {
    // Para guías, usar tabla guias
    if (tipo === 'guia') {
      const { error } = await supabase
        .from('guias')
        .delete()
        .eq('id', documentoId)

      if (error) {
        console.error('Error eliminando guía:', error)
        showNotificacion('error', 'No se pudo eliminar la guía')
        return
      }

      setGuiasState(prev => prev.filter(g => g.id !== documentoId))
      showNotificacion('success', 'Guía eliminada correctamente')
      return
    }

    // Para boletas/facturas, usar tabla facturas
    const lista = tipo === 'boleta' ? boletas : facturas
    const doc = lista.find(d => d.id === documentoId)
    if (!doc) return

    const { error } = await supabase
      .from('facturas')
      .delete()
      .eq('data_json->>id', documentoId)

    if (error) {
      console.error('Error eliminando documento:', error)
      showNotificacion('error', 'No se pudo eliminar el documento')
      return
    }

    if (tipo === 'boleta') {
      setBoletasState(prev => prev.filter(b => b.id !== documentoId))
    } else {
      setFacturasState(prev => prev.filter(f => f.id !== documentoId))
    }

    showNotificacion('success', 'Documento eliminado correctamente')
  }, [boletas, facturas, guias, showNotificacion])

  const rechazarDocumento = useCallback(async (documentoId: string, tipo: 'boleta' | 'factura', motivo: string) => {
    const docExistente = tipo === 'boleta'
      ? boletas.find(b => b.id === documentoId)
      : facturas.find(f => f.id === documentoId);

    const cdrData = {
      codigo: 'ERROR',
      mensaje: motivo,
      fechaRecepcion: new Date(),
    };

    const docActualizado: any = { estado: 'rechazado', cdr: cdrData };

    if (tipo === 'boleta') {
      setBoletasState(prev => prev.map(b =>
        b.id === documentoId ? { ...b, ...docActualizado } : b
      ));
    } else {
      setFacturasState(prev => prev.map(f =>
        f.id === documentoId ? { ...f, ...docActualizado } : f
      ));
    }

    const docCompleto = docExistente ? { ...docExistente, ...docActualizado } : docActualizado;
    supabase.from('facturas').update({
      estado_sunat: 'RECHAZADO',
      data_json: JSON.parse(JSON.stringify(docCompleto)),
    }).eq('data_json->>id', documentoId).then(({ error }) => {
      if (error) console.error('Error persistiendo rechazo:', error)
    })

    showNotificacion('error', `Documento rechazado: ${motivo}`);
  }, [boletas, facturas, showNotificacion]);

  // ============================================
  // UTILIDADES (continuación)
  // ============================================

  const hideNotificacion = useCallback(() => {
    setNotificacion(null);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const getSiguienteNumero = useCallback((tipo: 'boleta' | 'factura' | 'guia'): number => {
    const serie = series.find(s => s.tipo === tipo && s.activo);
    return serie ? serie.numeroActual + 1 : 1;
  }, [series]);

  const refreshDocuments = useCallback(async () => {
    await loadDocuments()
  }, [loadDocuments])

  // ============================================
  // VALUE
  // ============================================
  
  const value: AppContextType = {
    boletas,
    facturas,
    guias,
    clientes,
    transportistas,
    productos,
    series,
    isLoading,
    error,
    notificacion,
    productosLoaded,
    setBoletas,
    addBoleta,
    updateBoleta,
    setFacturas,
    addFactura,
    updateFactura,
    setGuias,
    addGuia,
    updateGuia,
    setClientes,
    addCliente,
    updateCliente,
    setTransportistas,
    addTransportista,
    updateTransportista,
    setProductos,
    refreshProductos: loadProductos,
    refreshClientes: loadClientes,
    refreshTransportistas: loadTransportistas,
    refreshDocuments,
    enviarDocumentoSUNAT,
    enviarGuiaSUNAT,
    aprobarDocumento,
    rechazarDocumento,
    eliminarDocumentoRechazado,
    showNotificacion,
    hideNotificacion,
    setLoading,
    setError,
    getSiguienteNumero,
    loadCrmData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
}
