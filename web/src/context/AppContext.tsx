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
  
  // Clientes ficticios
  const [clientes, setClientesState] = useState<Cliente[]>([
    {
      id: '1',
      tipo: 'natural',
      nombre: 'Juan Pérez García',
      apellidos: 'Pérez García',
      dni: '45678912',
      direccion: 'Av. Los Pinos 456, San Isidro, Lima',
      telefono: '987654321',
      email: 'juan.perez@email.com',
      esFrecuente: true,
      totalCompras: 15,
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      tipo: 'natural',
      nombre: 'María Rosa López',
      apellidos: 'Rosa López',
      dni: '47896523',
      direccion: 'Jr. Amazonas 123, Miraflores, Lima',
      telefono: '912345678',
      email: 'maria.lopez@email.com',
      esFrecuente: true,
      totalCompras: 8,
      createdAt: new Date('2024-02-20'),
    },
    {
      id: '3',
      tipo: 'juridica',
      nombre: 'Distribuciones del Norte S.A.C.',
      razonSocial: 'Distribuciones del Norte S.A.C.',
      ruc: '20548796321',
      direccion: 'Av. Industrial 789, Ate Vitarte, Lima',
      telefono: '01-4567890',
      email: 'ventas@distribucionesnorte.com',
      esFrecuente: true,
      totalCompras: 42,
      createdAt: new Date('2023-11-10'),
    },
    {
      id: '4',
      tipo: 'juridica',
      nombre: 'Supermercados La Económica E.I.R.L.',
      razonSocial: 'Supermercados La Económica E.I.R.L.',
      ruc: '20604578912',
      direccion: 'Av. Universitaria 3456, Comas, Lima',
      telefono: '01-7894561',
      email: 'compras@laeconomica.pe',
      esFrecuente: false,
      totalCompras: 3,
      createdAt: new Date('2024-05-10'),
    },
    {
      id: '5',
      tipo: 'natural',
      nombre: 'Carlos Alberto Mendoza',
      apellidos: 'Mendoza Castillo',
      dni: '41256398',
      direccion: 'Calle Las Flores 89, Surco, Lima',
      telefono: '956789123',
      email: 'carlos.mendoza@email.com',
      esFrecuente: false,
      totalCompras: 2,
      createdAt: new Date('2024-06-15'),
    },
    {
      id: '6',
      tipo: 'juridica',
      nombre: 'Tiendas Maxi S.A.',
      razonSocial: 'Tiendas Maxi S.A.',
      ruc: '20145678901',
      direccion: 'Av. Javier Prado 5678, San Borja, Lima',
      telefono: '01-2345678',
      email: 'proveedores@tiendasmaxi.com',
      esFrecuente: true,
      totalCompras: 28,
      createdAt: new Date('2023-08-05'),
    },
    {
      id: '7',
      tipo: 'natural',
      nombre: 'Ana Lucía Torres',
      apellidos: 'Torres Vega',
      dni: '48956231',
      direccion: 'Av. Arequipa 2345, Lince, Lima',
      telefono: '934567891',
      email: 'ana.torres@email.com',
      esFrecuente: false,
      totalCompras: 1,
      createdAt: new Date('2024-07-01'),
    },
    {
      id: '8',
      tipo: 'juridica',
      nombre: 'Comercial Los Andes S.R.L.',
      razonSocial: 'Comercial Los Andes S.R.L.',
      ruc: '20561234879',
      direccion: 'Jr. Cusco 456, Centro de Lima, Lima',
      telefono: '01-3456789',
      email: 'admin@comerciallosandes.com',
      esFrecuente: false,
      totalCompras: 5,
      createdAt: new Date('2024-03-20'),
    },
  ]);
  
  // Transportistas ficticios
  const [transportistas, setTransportistasState] = useState<Transportista[]>([
    {
      id: '1',
      nombres: 'Pedro José',
      apellidos: 'Vásquez Chávez',
      nombreCompleto: 'Vásquez Chávez, Pedro José',
      dni: '41526389',
      licenciaConducir: 'Q41526389',
      numeroPlaca: 'ABC-123',
      activo: true,
      createdAt: new Date('2023-06-15'),
      updatedAt: new Date('2024-01-10'),
    },
    {
      id: '2',
      nombres: 'Luis Alberto',
      apellidos: 'Quispe Mamani',
      nombreCompleto: 'Quispe Mamani, Luis Alberto',
      dni: '42879561',
      licenciaConducir: 'B42879561',
      numeroPlaca: 'XYZ-789',
      activo: true,
      createdAt: new Date('2023-08-20'),
      updatedAt: new Date('2024-02-15'),
    },
    {
      id: '3',
      nombres: 'Miguel Ángel',
      apellidos: 'Huamán Rojas',
      nombreCompleto: 'Huamán Rojas, Miguel Ángel',
      dni: '43987156',
      licenciaConducir: 'Q43987156',
      numeroPlaca: 'DEF-456',
      activo: true,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-06-20'),
    },
    {
      id: '4',
      nombres: 'Roberto Carlos',
      apellidos: 'Sánchez Pérez',
      nombreCompleto: 'Sánchez Pérez, Roberto Carlos',
      dni: '45612378',
      licenciaConducir: 'A45612378',
      numeroPlaca: 'GHI-789',
      activo: false,
      createdAt: new Date('2023-04-10'),
      updatedAt: new Date('2024-05-01'),
    },
    {
      id: '5',
      nombres: 'Jorge Enrique',
      apellidos: 'Castillo Vega',
      nombreCompleto: 'Castillo Vega, Jorge Enrique',
      dni: '46789523',
      licenciaConducir: 'B46789523',
      numeroPlaca: 'JKL-321',
      activo: true,
      createdAt: new Date('2024-03-15'),
      updatedAt: new Date('2024-07-10'),
    },
  ]);
  
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
        .order('categoria')
        .order('descripcion');

      if (error) {
        console.error('Error cargando productos:', error);
        setProductosLoaded(true); // Marcar como cargado incluso si hay error
        return;
      }

      if (data && data.length > 0) {
        // Mapear los datos de Supabase al formato Producto
        const productosMapeados: Producto[] = data.map((p: any) => ({
          id: p.id,
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

  // Cargar productos desde Supabase al iniciar
  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

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
