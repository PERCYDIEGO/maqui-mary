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
  ConfiguracionSerie
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

  // SUNAT - Envío de documentos
  enviarDocumentoSUNAT: (documentoId: string, tipo: 'boleta' | 'factura') => Promise<{ success: boolean; message: string }>;
  aprobarDocumento: (documentoId: string, tipo: 'boleta' | 'factura') => Promise<void>;
  rechazarDocumento: (documentoId: string, tipo: 'boleta' | 'factura', motivo: string) => Promise<void>;

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
      imagen: '/img/doble-uso.png',
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
      imagen: '/img/panos-amarillos.png',
      activo: true,
      usosFrecuentes: 67,
    },
  ]);
  const [productosLoaded, setProductosLoaded] = useState(false);
  const [series, setSeries] = useState<ConfiguracionSerie[]>([
    { tipo: 'boleta', serie: 'EB01', numeroActual: 134, activo: true },
    { tipo: 'factura', serie: 'E001', numeroActual: 882, activo: true },
    { tipo: 'guia', serie: 'EG07', numeroActual: 293, activo: true },
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
          descripcion: p.name || p.descripcion,
          detalle: p.detalle || p.description || '',
          unidadMedida: p.unidadMedida || 'UNIDAD',
          precioOriginal: Number(p.precioOriginal || p.precioUnitario || p.price || 0),
          precioUnitario: Number(p.precioUnitario || p.price || 0),
          stock: p.stock || 0,
          categoria: p.categoria || p.category || 'General',
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
      const { data, error } = await supabase.from('clientes').select('*').order('name')
      if (error) { console.error('Error cargando clientes:', error); return; }
      if (data) {
        setClientesState(data.map((row: any): Cliente => ({
          id: String(row.id),
          tipo: row.tipo_documento === '6' ? 'juridica' : 'natural',
          nombre: row.name,
          razonSocial: row.tipo_documento === '6' ? row.name : undefined,
          ruc: row.tipo_documento === '6' ? (row.num_documento || '') : undefined,
          dni: row.tipo_documento !== '6' ? (row.num_documento || row.dni || '') : (row.dni || undefined),
          direccion: row.address || '',
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
        setTransportistasState(data.map((row: any): Transportista => ({
          id: String(row.id),
          nombres: row.nombres,
          apellidos: row.apellidos,
          nombreCompleto: row.nombre_completo || `${row.apellidos}, ${row.nombres}`,
          dni: row.dni,
          licenciaConducir: row.licencia_conducir || '',
          numeroPlaca: row.numero_placa || '',
          activo: row.activo,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at || row.created_at),
        })))
      }
    } catch (err) {
      console.error('Error cargando transportistas:', err)
    }
  }, [])

  // Cargar datos desde Supabase al iniciar
  useEffect(() => {
    loadProductos();
    loadClientes();
    loadTransportistas();
  }, [loadProductos, loadClientes, loadTransportistas]);

  // ============================================
  // ACTIONS - BOLETAS
  // ============================================
  
  const setBoletas = useCallback((nuevasBoletas: Boleta[]) => {
    setBoletasState(nuevasBoletas);
  }, []);

  const addBoleta = useCallback((boleta: Boleta) => {
    setBoletasState(prev => [boleta, ...prev]);
    // Incrementar contador de serie
    setSeries(prev => prev.map(s => 
      s.tipo === 'boleta' && s.serie === boleta.serie
        ? { ...s, numeroActual: s.numeroActual + 1 }
        : s
    ));
  }, []);

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
    setFacturasState(prev => [factura, ...prev]);
    setSeries(prev => prev.map(s => 
      s.tipo === 'factura' && s.serie === factura.serie
        ? { ...s, numeroActual: s.numeroActual + 1 }
        : s
    ));
  }, []);

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
      const items = documento.items.map(item => ({
        producto_id: item.productoId || null,
        codigo: item.productoId || `ITEM-${item.numeroOrden}`,
        description: item.descripcion,
        quantity: item.cantidad,
        unit_price: item.valorUnitario,
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

      // Llamar a la API de SUNAT
      const response = await fetch('/api/sunat/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const errorMsg = result.error || 'Error en el envío a SUNAT';
        
        // Actualizar estado a rechazado
        if (tipo === 'boleta') {
          setBoletasState(prev => prev.map(b =>
            b.id === documentoId
              ? { 
                  ...b, 
                  estado: 'rechazado', 
                  cdr: {
                    codigo: result.estado_sunat || 'ERROR',
                    mensaje: errorMsg,
                    fechaRecepcion: new Date(),
                  }
                }
              : b
          ));
        } else {
          setFacturasState(prev => prev.map(f =>
            f.id === documentoId
              ? { 
                  ...f, 
                  estado: 'rechazado', 
                  cdr: {
                    codigo: result.estado_sunat || 'ERROR',
                    mensaje: errorMsg,
                    fechaRecepcion: new Date(),
                  }
                }
              : f
          ));
        }
        
        return { success: false, message: errorMsg };
      }

      // Determinar el estado final basado en la respuesta de SUNAT
      const estadoSunat = result.estado_sunat || 'PENDIENTE';
      let nuevoEstado: 'enviado' | 'aprobado' | 'rechazado';
      
      if (estadoSunat === 'ACEPTADO') {
        nuevoEstado = 'aprobado';
      } else if (estadoSunat === 'RECHAZADO' || estadoSunat === 'ERROR') {
        nuevoEstado = 'rechazado';
      } else {
        nuevoEstado = 'enviado';
      }

      // Actualizar estado del documento
      if (tipo === 'boleta') {
        setBoletasState(prev => prev.map(b =>
          b.id === documentoId
            ? { 
                ...b, 
                estado: nuevoEstado, 
                enviadoAt: new Date(),
                cdr: nuevoEstado === 'aprobado' ? {
                  codigo: result.factura?.ticket_sunat || '0',
                  mensaje: result.mensaje || 'Documento aceptado por SUNAT',
                  fechaRecepcion: new Date(),
                } : b.cdr
              }
            : b
        ));
      } else {
        setFacturasState(prev => prev.map(f =>
          f.id === documentoId
            ? { 
                ...f, 
                estado: nuevoEstado, 
                enviadoAt: new Date(),
                cdr: nuevoEstado === 'aprobado' ? {
                  codigo: result.factura?.ticket_sunat || '0',
                  mensaje: result.mensaje || 'Documento aceptado por SUNAT',
                  fechaRecepcion: new Date(),
                } : f.cdr
              }
            : f
        ));
      }

      return { 
        success: true, 
        message: result.mensaje || 'Documento procesado correctamente' 
      };
    } catch (error: any) {
      console.error('Error enviando a SUNAT:', error);
      return { success: false, message: error.message || 'Error al enviar a SUNAT' };
    }
  }, [boletas, facturas]);

  const aprobarDocumento = useCallback(async (documentoId: string, tipo: 'boleta' | 'factura') => {
    const cdrData = {
      codigo: '0',
      mensaje: 'La Boleta de Venta o Factura ha sido aceptada',
      fechaRecepcion: new Date(),
    };

    if (tipo === 'boleta') {
      setBoletasState(prev => prev.map(b =>
        b.id === documentoId
          ? { ...b, estado: 'aprobado', cdr: cdrData }
          : b
      ));
    } else {
      setFacturasState(prev => prev.map(f =>
        f.id === documentoId
          ? { ...f, estado: 'aprobado', cdr: cdrData }
          : f
      ));
    }

    showNotificacion('success', 'Documento aprobado por SUNAT');
  }, [showNotificacion]);

  const rechazarDocumento = useCallback(async (documentoId: string, tipo: 'boleta' | 'factura', motivo: string) => {
    const cdrData = {
      codigo: 'ERROR',
      mensaje: motivo,
      fechaRecepcion: new Date(),
    };

    if (tipo === 'boleta') {
      setBoletasState(prev => prev.map(b =>
        b.id === documentoId
          ? { ...b, estado: 'rechazado', cdr: cdrData }
          : b
      ));
    } else {
      setFacturasState(prev => prev.map(f =>
        f.id === documentoId
          ? { ...f, estado: 'rechazado', cdr: cdrData }
          : f
      ));
    }

    showNotificacion('error', `Documento rechazado: ${motivo}`);
  }, [showNotificacion]);

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
    enviarDocumentoSUNAT,
    aprobarDocumento,
    rechazarDocumento,
    showNotificacion,
    hideNotificacion,
    setLoading,
    setError,
    getSiguienteNumero,
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
