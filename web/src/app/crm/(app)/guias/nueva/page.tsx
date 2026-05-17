// ============================================
// FORMULARIO: NUEVA GUÍA DE REMISIÓN
// Vinculación a documentos, transportistas
// ============================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, X, Search, Truck, Package, User, FileText, Link2, Link2Off, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { GuiaRemision, DocRelacionado, ItemDocumento, Transportista, Cliente, Boleta, Factura, EMPRESA_DATA } from '@/types/documentos';
import { formatearNumeroDocumento, generarHashCPE, calcularItem, generarDatosQR } from '@/lib/calculos';
import toast from 'react-hot-toast';

const MOTIVOS_TRASLADO = [
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra' },
  { value: 'venta_sujeta_confirmar', label: 'Venta sujeta a confirmar' },
  { value: 'traslado_entre_establecimientos', label: 'Traslado entre establecimientos' },
  { value: 'traslado_misma_ubigeo', label: 'Traslado misma ubigeo' },
  { value: 'importacion', label: 'Importación' },
  { value: 'exportacion', label: 'Exportación' },
  { value: 'zona_primaria', label: 'A zona primaria' },
];

export default function NuevaGuiaPage() {
  const router = useRouter();
  const { addGuia, updateGuia, guias, transportistas, boletas, facturas, clientes, productos } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Estados del formulario
  const [transportista, setTransportista] = useState<Transportista | null>(null);
  const [transportistaBusqueda, setTransportistaBusqueda] = useState('');
  const [mostrarTransportistas, setMostrarTransportistas] = useState(false);
  const transportistaRef = useRef<HTMLDivElement>(null);

  const [destinatario, setDestinatario] = useState<Cliente | null>(null);
  const [destinatarioBusqueda, setDestinatarioBusqueda] = useState('');
  const [mostrarDestinatarios, setMostrarDestinatarios] = useState(false);
  const destinatarioRef = useRef<HTMLDivElement>(null);

  // Detectar precarga desde boleta o factura vía ?boleta=ID o ?factura=ID
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (preloadedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const boletaId = params.get('boleta');
    const facturaId = params.get('factura');
    if (boletaId && boletas.length > 0) {
      const doc = boletas.find(b => b.id === boletaId);
      if (doc) { handleVincularDoc(doc, 'Boleta'); preloadedRef.current = true; }
    } else if (facturaId && facturas.length > 0) {
      const doc = facturas.find(f => f.id === facturaId);
      if (doc) { handleVincularDoc(doc, 'Factura'); preloadedRef.current = true; }
    }
  }, [boletas, facturas]);

  // Detectar modo edición vía ?edit=ID
  useEffect(() => {
    if (editLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (!editId) return;
    const guia = guias.find(g => g.id === editId);
    if (!guia) return;
    setIsEditing(true);
    setEditingId(editId);
    setTransportista(guia.transportista || null);
    if (guia.transportista) setTransportistaBusqueda(`${guia.transportista.nombreCompleto} - Placa: ${guia.transportista.numeroPlaca}`);
    const dest = clientes.find(c => c.id === guia.destinatarioId) || null;
    setDestinatario(dest);
    if (dest) setDestinatarioBusqueda(dest.nombre);
    setMotivoTraslado(guia.motivoTraslado);
    setPuntoLlegada(guia.puntoLlegada);
    setFechaInicioTraslado(new Date(guia.fechaInicioTraslado).toISOString().split('T')[0]);
    setModalidadTraslado(guia.modalidadTraslado || 'privado');
    setItems(guia.bienes);
    // Restaurar documentos relacionados
    if (guia.documentosRelacionados?.length) {
      setDocsRelacionados(guia.documentosRelacionados);
    } else if (guia.documentoRelacionadoId) {
      // Backward compat: single doc
      const docF = facturas.find(f => f.id === guia.documentoRelacionadoId);
      const docB = boletas.find(b => b.id === guia.documentoRelacionadoId);
      const doc = docF || docB;
      if (doc) {
        setDocsRelacionados([{
          id: doc.id,
          tipo: doc.tipo === 'factura' ? 'factura' : 'boleta',
          numero: doc.numeroCompleto,
          serie: doc.serie,
          clienteNombre: doc.cliente.nombre,
        }]);
      }
    }
    if (guia.pesoTotal) setPesoTotal(guia.pesoTotal);
    setEditLoaded(true);
  }, [guias, clientes, editLoaded]);

  // Cerrar listas al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (transportistaRef.current && !transportistaRef.current.contains(event.target as Node)) {
        setMostrarTransportistas(false);
      }
      if (destinatarioRef.current && !destinatarioRef.current.contains(event.target as Node)) {
        setMostrarDestinatarios(false);
      }
      if (docRef.current && !docRef.current.contains(event.target as Node)) {
        setShowDocSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [modalidadTraslado, setModalidadTraslado] = useState<'privado' | 'publico'>('privado');
  const [motivoTraslado, setMotivoTraslado] = useState<string>('venta');
  const [puntoLlegada, setPuntoLlegada] = useState('');
  const [fechaInicioTraslado, setFechaInicioTraslado] = useState(new Date().toISOString().split('T')[0]);

  // Documentos relacionados — múltiples boletas y/o facturas
  const [docsRelacionados, setDocsRelacionados] = useState<DocRelacionado[]>([]);
  const [searchDoc, setSearchDoc] = useState('');
  const [showDocSearch, setShowDocSearch] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  // Peso bruto total
  const [pesoTotal, setPesoTotal] = useState<number>(0);
  const [rawPeso, setRawPeso] = useState<string | null>(null);

  const [items, setItems] = useState<ItemDocumento[]>([]);

  // Lista combinada boletas + facturas para vincular
  const documentosDisponibles = [
    ...facturas.map(f => ({ doc: f as Boleta | Factura, tipo: 'Factura' as const, label: `Factura ${f.numeroCompleto}`, cliente: f.cliente.nombre })),
    ...boletas.map(b => ({ doc: b as Boleta | Factura, tipo: 'Boleta' as const, label: `Boleta ${b.numeroCompleto}`, cliente: b.cliente.nombre })),
  ].filter(d =>
    d.label.toLowerCase().includes(searchDoc.toLowerCase()) ||
    d.cliente.toLowerCase().includes(searchDoc.toLowerCase())
  );
  
  const puntoPartida = 'PRO. QUINTA AVENIDA MZ. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACOTO ALTO - LURIGANCHO - LIMA - LIMA';
  
  // Filtrar transportistas activos según modalidad seleccionada
  const transportistasActivos = transportistas.filter(t => {
    if (!t.activo) return false;
    if (t.modalidad !== modalidadTraslado) return false;
    const q = transportistaBusqueda.toLowerCase();
    return (
      t.nombreCompleto.toLowerCase().includes(q) ||
      (t.numeroPlaca || '').toLowerCase().includes(q) ||
      (t.ruc || '').includes(transportistaBusqueda)
    );
  });
  
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(destinatarioBusqueda.toLowerCase()) ||
    c.dni?.includes(destinatarioBusqueda) ||
    c.ruc?.includes(destinatarioBusqueda)
  );
  
  // Siguiente número
  const siguienteNumero = 1; // Simulado
  const numeroCompleto = formatearNumeroDocumento('EG07', siguienteNumero);
  
  function handleVincularDoc(doc: Boleta | Factura, tipo: 'Boleta' | 'Factura') {
    // Evitar duplicados
    if (docsRelacionados.some(d => d.id === doc.id)) {
      toast.error('Este documento ya está vinculado');
      return;
    }

    const nuevo: DocRelacionado = {
      id: doc.id,
      tipo: doc.tipo === 'factura' ? 'factura' : 'boleta',
      numero: doc.numeroCompleto,
      serie: doc.serie,
      clienteNombre: doc.cliente.nombre,
    };
    setDocsRelacionados(prev => [...prev, nuevo]);
    setShowDocSearch(false);
    setSearchDoc('');

    // Si es el primer doc vinculado, auto-llenar destinatario e items
    if (docsRelacionados.length === 0) {
      setDestinatario(doc.cliente);
      setDestinatarioBusqueda(doc.cliente.nombre);
      if (doc.cliente.direccion) setPuntoLlegada(doc.cliente.direccion);
      setItems(doc.items.map((it, idx) => ({
        ...it,
        id: Math.random().toString(36).substr(2, 9),
        numeroOrden: idx + 1,
      })));
    } else {
      // Agregar items adicionales del nuevo documento
      setItems(prev => {
        const nuevosItems = doc.items
          .filter(it => !prev.some(p => p.productoId === it.productoId))
          .map((it, idx) => ({
            ...it,
            id: Math.random().toString(36).substr(2, 9),
            numeroOrden: prev.length + idx + 1,
          }));
        return [...prev, ...nuevosItems];
      });
    }

    toast.success(`${tipo} ${doc.numeroCompleto} vinculada`);
  }

  function handleDesvincularDoc(id: string) {
    setDocsRelacionados(prev => prev.filter(d => d.id !== id));
  }

  const handleSelectTransportista = (t: Transportista) => {
    setTransportista(t);
    setTransportistaBusqueda(
      t.modalidad === 'publico'
        ? `${t.nombreCompleto} — RUC: ${t.ruc || '—'}`
        : `${t.nombreCompleto} — Placa: ${t.numeroPlaca || '—'}`
    );
    setMostrarTransportistas(false);
  };
  
  const handleSelectDestinatario = (c: Cliente) => {
    setDestinatario(c);
    setDestinatarioBusqueda(c.nombre);
    setPuntoLlegada(c.direccion);
    setMostrarDestinatarios(false);
  };
  
  const handleAgregarItem = () => {
    const newItem: ItemDocumento = {
      id: Math.random().toString(36).substr(2, 9),
      numeroOrden: items.length + 1,
      cantidad: 1,
      unidadMedida: 'UNIDAD',
      descripcion: '',
      valorUnitario: 0,
      descuento: 0,
      anticipos: 0,
      icbper: 0,
      valorVenta: 0,
      igv: 0,
      importeTotal: 0,
    };
    setItems([...items, newItem]);
  };
  
  const handleActualizarItem = (index: number, campo: keyof ItemDocumento, valor: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [campo]: valor };
    setItems(newItems);
  };
  
  const handleEliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (!transportista) {
      toast.error('Selecciona un transportista');
      return;
    }
    if (!destinatario) {
      toast.error('Selecciona un destinatario');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un item');
      return;
    }
    
    setLoading(true);

    // Modo edición: actualizar guía existente
    if (isEditing && editingId) {
      const original = guias.find(g => g.id === editingId);
      if (original) {
        updateGuia({
          ...original,
          transportistaId: transportista?.id,
          transportista: transportista ?? undefined,
          destinatarioId: destinatario!.id,
          destinatarioNombre: destinatario!.nombre,
          destinatarioDniRuc: destinatario!.dni || destinatario!.ruc || '',
          motivoTraslado: motivoTraslado as any,
          puntoLlegada,
          fechaInicioTraslado: new Date(fechaInicioTraslado),
          bienes: items,
          documentosRelacionados: docsRelacionados,
          pesoTotal: pesoTotal || 1,
          updatedAt: new Date(),
        });
        toast.success('Guía actualizada correctamente');
        router.push('/crm/guias');
      }
      setLoading(false);
      return;
    }

    try {
      const hashCPE = generarHashCPE({
        rucEmisor: EMPRESA_DATA.ruc,
        tipoDocumento: '09',
        serie: 'EG07',
        numero: siguienteNumero,
        importeTotal: 0,
        fechaEmision: new Date(),
      });

      const qrData = generarDatosQR({
        rucEmisor: EMPRESA_DATA.ruc,
        tipoDocumento: '09',
        serie: 'EG07',
        numero: siguienteNumero,
        importeTotal: 0,
        fechaEmision: new Date(),
        hashCPE,
      });

      const guia: GuiaRemision = {
        id: Math.random().toString(36).substr(2, 9),
        tipo: 'guia',
        serie: 'EG07',
        numero: siguienteNumero,
        numeroCompleto,
        fechaEmision: new Date(),
        fechaInicioTraslado: new Date(fechaInicioTraslado),
        motivoTraslado: motivoTraslado as any,
        puntoPartida,
        puntoLlegada,
        destinatarioId: destinatario.id,
        destinatarioNombre: destinatario.nombre,
        destinatarioDniRuc: destinatario.dni || destinatario.ruc || '',
        transportistaId: transportista?.id,
        transportista,
        documentosRelacionados: docsRelacionados,
        bienes: items,
        pesoTotal: pesoTotal || 1,
        unidadMedidaPeso: 'KGM',
        modalidadTraslado,
        transbordoProgramado: false,
        retornoEnvasesVacios: false,
        trasladoVehiculoM1L: false,
        retornoVehiculoVacio: false,
        observacion: '',
        estado: 'borrador',
        hashCpe: hashCPE,
        qrCode: qrData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addGuia(guia);
      toast.success('Guía guardada. Pendiente de envío a SUNAT.');
      router.push('/crm/guias');
    } catch (error) {
      toast.error('Error al emitir la guía');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/guias" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Guía de Remisión' : 'Nueva Guía de Remisión'}</h1>
          <p className="text-slate-500">{numeroCompleto}</p>
        </div>
      </div>
      
      {/* Banner punto de partida */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Punto de Partida (Fijo):</strong> {puntoPartida}
        </p>
      </div>
      
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
              ${step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-sm ${step === s ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>
              {s === 1 ? 'Datos' : s === 2 ? 'Ítems' : 'Resumen'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-slate-300 mx-2" />}
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {step === 1 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Datos del Traslado</h2>
            
            <div className="space-y-4">

              {/* Selector Modalidad de Traslado */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Modalidad de Traslado *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setModalidadTraslado('privado'); setTransportista(null); setTransportistaBusqueda(''); }}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      modalidadTraslado === 'privado'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold">Privado</p>
                      <p className="text-xs font-normal opacity-75">Vehículo propio</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalidadTraslado('publico'); setTransportista(null); setTransportistaBusqueda(''); }}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      modalidadTraslado === 'publico'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold">Público</p>
                      <p className="text-xs font-normal opacity-75">Empresa contratada</p>
                    </div>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {modalidadTraslado === 'privado'
                    ? 'Selecciona el conductor y vehículo propio. SUNAT registra placa + licencia.'
                    : 'Selecciona la empresa de transporte contratada. SUNAT registra RUC + N° MTC.'}
                </p>
              </div>

              {/* Transportista */}
              <div className="relative" ref={transportistaRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transportista *</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={transportistaBusqueda}
                    onChange={(e) => { setTransportistaBusqueda(e.target.value); setMostrarTransportistas(true); }}
                    onFocus={() => setMostrarTransportistas(true)}
                    placeholder="Escribe para buscar conductor o placa..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {mostrarTransportistas && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    <div className={`p-2 text-xs border-b border-slate-200 ${
                      modalidadTraslado === 'privado' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {transportistasActivos.length} {modalidadTraslado === 'privado' ? 'conductores' : 'empresas'} disponibles
                    </div>
                    {transportistasActivos.length === 0 ? (
                      <div className="p-4 text-slate-500 text-sm">
                        No hay transportistas {modalidadTraslado === 'privado' ? 'privados' : 'públicos'} activos.{' '}
                        <Link href="/crm/transportistas" className="text-indigo-600 hover:underline">Crear transportista</Link>
                      </div>
                    ) : (
                      transportistasActivos.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSelectTransportista(t)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              modalidadTraslado === 'privado' ? 'bg-indigo-100' : 'bg-amber-100'
                            }`}>
                              {modalidadTraslado === 'privado'
                                ? <Truck className="w-5 h-5 text-indigo-600" />
                                : <Building2 className="w-5 h-5 text-amber-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{t.nombreCompleto}</p>
                              <p className="text-sm text-slate-500">
                                {modalidadTraslado === 'privado'
                                  ? `DNI: ${t.dni || '—'} | Placa: ${t.numeroPlaca || '—'} | Lic: ${t.licenciaConducir || '—'}`
                                  : `RUC: ${t.ruc || '—'} | MTC: ${t.numeroRegistroMTC || '—'}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Destinatario */}
              <div className="relative" ref={destinatarioRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destinatario *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={destinatarioBusqueda}
                    onChange={(e) => { setDestinatarioBusqueda(e.target.value); setMostrarDestinatarios(true); }}
                    onFocus={() => setMostrarDestinatarios(true)}
                    placeholder="Escribe para buscar cliente..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                {mostrarDestinatarios && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                      {clientesFiltrados.length} de {clientes.length} clientes registrados
                    </div>
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-4 text-slate-500 text-sm">
                        No se encontraron clientes. <Link href="/crm/clientes" className="text-indigo-600 hover:underline">Crear nuevo cliente</Link>
                      </div>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectDestinatario(c)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{c.nombre}</p>
                              <p className="text-sm text-slate-500">
                                {c.dni ? `DNI: ${c.dni}` : c.ruc ? `RUC: ${c.ruc}` : 'Sin documento'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {/* Documentos relacionados — múltiples boletas/facturas */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Documentos relacionados <span className="text-slate-400 font-normal">(boletas y/o facturas — puede ser más de uno)</span>
                </label>

                {/* Lista de docs vinculados */}
                {docsRelacionados.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {docsRelacionados.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${d.tipo === 'factura' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                          {d.tipo === 'factura' ? 'F' : 'B'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-indigo-800 text-sm">
                            {d.tipo === 'factura' ? 'Factura' : 'Boleta de Venta'} N° {d.numero} — RUC 20606218801
                          </p>
                          <p className="text-xs text-slate-500 truncate">{d.clienteNombre}</p>
                        </div>
                        <button type="button" onClick={() => handleDesvincularDoc(d.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors">
                          <Link2Off className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buscador para agregar más documentos */}
                <div className="relative" ref={docRef}>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchDoc}
                      onChange={e => { setSearchDoc(e.target.value); setShowDocSearch(true); }}
                      onFocus={() => setShowDocSearch(true)}
                      placeholder={docsRelacionados.length === 0 ? 'Buscar boleta o factura...' : 'Agregar otro documento...'}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>

                  {showDocSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {documentosDisponibles.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">No se encontraron boletas ni facturas.</div>
                      ) : (
                        documentosDisponibles.map(({ doc, tipo, label, cliente }) => {
                          const yaVinculado = docsRelacionados.some(d => d.id === doc.id);
                          return (
                            <button key={doc.id} onClick={() => handleVincularDoc(doc, tipo)} disabled={yaVinculado}
                              className={`w-full px-4 py-3 text-left border-b border-slate-100 last:border-0 ${yaVinculado ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${tipo === 'Factura' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {tipo === 'Factura' ? 'F' : 'B'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 text-sm">{label}</p>
                                  <p className="text-xs text-slate-500 truncate">{cliente}</p>
                                </div>
                                {yaVinculado && <span className="text-xs text-slate-400 shrink-0">Ya vinculado</span>}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo y fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de Traslado *</label>
                  <select
                    value={motivoTraslado}
                    onChange={(e) => setMotivoTraslado(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {MOTIVOS_TRASLADO.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio Traslado *</label>
                  <input
                    type="date"
                    value={fechaInicioTraslado}
                    onChange={(e) => setFechaInicioTraslado(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              
              {/* Punto de llegada */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Punto de Llegada *</label>
                <textarea
                  value={puntoLlegada}
                  onChange={(e) => setPuntoLlegada(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Dirección completa de destino"
                />
              </div>

              {/* Peso bruto total */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Peso Bruto Total <span className="text-slate-400 font-normal">(KGM)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rawPeso !== null ? rawPeso : pesoTotal > 0 ? String(pesoTotal) : ''}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || v === '.' || /^\d*\.?\d*$/.test(v)) {
                      setRawPeso(v);
                      const n = parseFloat(v);
                      setPesoTotal(isNaN(n) ? 0 : n);
                    }
                  }}
                  onBlur={() => setRawPeso(null)}
                  placeholder="Ej: 25.5"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setStep(2)} 
                disabled={!transportista || !destinatario}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:bg-slate-300"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Ítems a Transportar</h2>
              <button onClick={handleAgregarItem} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium">
                <Plus className="w-5 h-5" />
                Agregar Ítem
              </button>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay ítems agregados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600">Ítem #{index + 1}</span>
                      <button onClick={() => handleEliminarItem(index)} className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {/* Selector de Producto */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Seleccionar Producto
                        </label>
                        <select
                          value={item.productoId || ''}
                          onChange={(e) => {
                            const productoId = e.target.value;
                            if (!productoId) {
                              const newItems = [...items];
                              newItems[index] = {
                                ...newItems[index],
                                productoId: undefined,
                                descripcion: '',
                                detalle: '',
                              };
                              setItems(newItems);
                              return;
                            }
                            const producto = productos.find(p => String(p.id) === productoId);
                            if (producto) {
                              const newItems = [...items];
                              newItems[index] = {
                                ...newItems[index],
                                productoId: producto.id,
                                descripcion: producto.descripcion,
                                detalle: producto.detalle || '',
                                unidadMedida: producto.unidadMedida,
                              };
                              setItems(newItems);
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm ${
                            !item.productoId
                              ? 'border-red-300 focus:ring-red-400'
                              : 'border-slate-200 focus:ring-indigo-500'
                          }`}
                        >
                          <option value="">-- Selecciona un producto --</option>
                          {productos
                            .filter(p => !items.some((i, idx) => i.productoId === p.id && idx !== index))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.descripcion} - S/ {p.precioUnitario.toFixed(2)}
                              </option>
                            ))}
                        </select>
                        {productos.length === 0 && (
                          <p className="text-xs text-indigo-600 mt-1">
                            No hay productos registrados. <Link href="/crm/productos" className="underline">Crear producto</Link>
                          </p>
                        )}
                      </div>

                      {/* Detalle del Producto */}
                      {item.detalle && (
                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                          <label className="block text-xs font-medium text-indigo-700 mb-1">
                            Detalle del Producto
                          </label>
                          <p className="text-sm text-slate-700">{item.detalle}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6">
                          <label className="block text-xs text-slate-600 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={item.descripcion}
                            onChange={(e) => handleActualizarItem(index, 'descripcion', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="Descripción del producto"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-slate-600 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleActualizarItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-slate-600 mb-1">Unidad</label>
                          <select
                            value={item.unidadMedida}
                            onChange={(e) => handleActualizarItem(index, 'unidadMedida', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="UNIDAD">UNIDAD</option>
                            <option value="CAJA">CAJA</option>
                            <option value="PAQUETE">PAQUETE</option>
                            <option value="KILO">KILO</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold">
                Anterior
              </button>
              <div className="flex flex-col items-end gap-1">
                {items.length > 0 && !items.every(i => i.productoId && i.descripcion && i.cantidad > 0) && (
                  <p className="text-xs text-red-500">Completa todos los ítems antes de continuar</p>
                )}
                <button
                  onClick={() => setStep(3)}
                  disabled={!items.every(i => i.productoId && i.descripcion && i.cantidad > 0) || items.length === 0}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:bg-slate-300"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Resumen de Guía</h2>
            
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {modalidadTraslado === 'privado'
                    ? <Truck className="w-4 h-4 text-indigo-500" />
                    : <Building2 className="w-4 h-4 text-amber-500" />}
                  <p className="text-sm text-slate-600">
                    {modalidadTraslado === 'privado' ? 'Conductor (Privado)' : 'Transportista Público'}
                  </p>
                </div>
                <p className="font-medium">{transportista?.nombreCompleto}</p>
                {modalidadTraslado === 'privado' ? (
                  <>
                    <p className="text-sm text-slate-500">DNI: {transportista?.dni || '—'}</p>
                    <p className="text-sm text-slate-500">Placa: {transportista?.numeroPlaca || '—'}</p>
                    <p className="text-sm text-slate-500">Licencia: {transportista?.licenciaConducir || '—'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-500">RUC: {transportista?.ruc || '—'}</p>
                    <p className="text-sm text-slate-500">N° MTC: {transportista?.numeroRegistroMTC || '—'}</p>
                  </>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Destinatario</p>
                <p className="font-medium">{destinatario?.nombre}</p>
                <p className="text-sm text-slate-500">{destinatario?.dni ? `DNI: ${destinatario.dni}` : destinatario?.ruc ? `RUC: ${destinatario.ruc}` : ''}</p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600">Punto de Llegada</p>
              <p className="font-medium">{puntoLlegada}</p>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="font-medium text-indigo-800 mb-2">Ítems a transportar ({items.length})</p>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span>{i + 1}. {item.descripcion}</span>
                    <span className="font-medium">{item.cantidad} {item.unidadMedida}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {docsRelacionados.length > 0 && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <p className="font-medium text-indigo-800 text-sm">
                    Documentos relacionados ({docsRelacionados.length})
                  </p>
                </div>
                <ul className="space-y-1">
                  {docsRelacionados.map(d => (
                    <li key={d.id} className="text-sm text-slate-700">
                      {d.tipo === 'factura' ? 'Factura' : 'Boleta de Venta'} N° {d.numero} — RUC {EMPRESA_DATA.ruc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pesoTotal > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                <span className="text-slate-600">Peso bruto total</span>
                <span className="font-semibold">{pesoTotal} KGM</span>
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm">
              <p className="font-medium text-blue-800 mb-1">Guía de Remisión Electrónica</p>
              <p>Consulte su documento en www.sunat.gob.pe</p>
            </div>
            
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold">
                Anterior
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg"
              >
                {loading ? 'Guardando...' : <><Save className="w-5 h-5" /> {isEditing ? 'Guardar Cambios' : 'Emitir Guía'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
