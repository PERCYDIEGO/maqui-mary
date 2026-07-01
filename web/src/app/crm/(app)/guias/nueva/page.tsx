// ============================================
// FORMULARIO: NUEVA GUÍA DE REMISIÓN
// Vinculación a documentos, transportistas
// ============================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, X, Search, Truck, Package, User, FileText, Link2, Link2Off, Building2, RefreshCw, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { GuiaRemision, DocRelacionado, ItemDocumento, Transportista, Cliente, Boleta, Factura, EMPRESA_DATA, CATALOGO_MOTIVOS_TRASLADO, MotivoTraslado } from '@/types/documentos';
import { formatearNumeroDocumento, generarHashCPE, generarDatosQR } from '@/lib/calculos';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function NuevaGuiaPage() {
  const router = useRouter();
  const { addGuia, updateGuia, guias, transportistas, boletas, facturas, clientes, productos, series, getSiguienteNumero, refreshTransportistas } = useApp();

  useEffect(() => { refreshTransportistas(); }, [refreshTransportistas]);

  const [numeroSeguro, setNumeroSeguro] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit')) return;
    supabase
      .from('guias')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.numero) setNumeroSeguro(data.numero + 1);
      });
  }, []);

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

  // GRE Remitente vinculada (para GRE Transportista)
  const [grrVinculado, setGrrVinculado] = useState<GuiaRemision | null>(null);
  const [searchGRR, setSearchGRR] = useState('');
  const [showGRRSearch, setShowGRRSearch] = useState(false);

  // Datos de flete (opcional)
  const [showFlete, setShowFlete] = useState(false);
  const [quienPagaFlete, setQuienPagaFlete] = useState<'remitente' | 'destinatario' | 'tercero'>('remitente');
  const [rucTercero, setRucTercero] = useState('');
  const [razonSocialTercero, setRazonSocialTercero] = useState('');

  // Filtrar guías de tipo remitente para vincular como GRR
  const guiasRemitentes = guias.filter(g => g.tipoGuia === 'remitente');
  const guiasRemitentesFiltrados = guiasRemitentes.filter(g =>
    String(g.numeroCompleto || '').toLowerCase().includes(searchGRR.toLowerCase()) ||
    String(g.destinatarioNombre || '').toLowerCase().includes(searchGRR.toLowerCase())
  );

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
    setTipoGuia(guia.tipoGuia || 'remitente');
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
    // Restaurar GRR vinculado (para transportista)
    if (guia.tipoGuia === 'transportista') {
      const grr = guias.find(g => g.tipoGuia === 'remitente' && guia.documentosRelacionados?.some(d => d.id === g.id));
      if (grr) setGrrVinculado(grr);
    }
    // Restaurar datos de flete
    if (guia.datosFlete) {
      setShowFlete(true);
      setQuienPagaFlete(guia.datosFlete.quienPaga);
      if (guia.datosFlete.rucTercero) setRucTercero(guia.datosFlete.rucTercero);
      if (guia.datosFlete.razonSocialTercero) setRazonSocialTercero(guia.datosFlete.razonSocialTercero);
    }
    // Restaurar flags de traslado
    setTransbordoProgramado(guia.transbordoProgramado || false);
    setRetornoEnvasesVacios(guia.retornoEnvasesVacios || false);
    setRetornoVehiculoVacio(guia.retornoVehiculoVacio || false);
    setTrasladoVehiculoM1L(guia.trasladoVehiculoM1L || false);
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
      if (puntoLlegadaRef.current && !puntoLlegadaRef.current.contains(event.target as Node)) {
        setMostrarPuntosLlegada(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [tipoGuia, setTipoGuia] = useState<'remitente' | 'transportista'>('remitente');
  const [modalidadTraslado, setModalidadTraslado] = useState<'privado' | 'publico'>('privado');
  const [motivoTraslado, setMotivoTraslado] = useState<MotivoTraslado>('01');
  const [puntoLlegada, setPuntoLlegada] = useState('');
  const [puntoLlegadaBusqueda, setPuntoLlegadaBusqueda] = useState('');
  const [mostrarPuntosLlegada, setMostrarPuntosLlegada] = useState(false);
  const [transportistaLlegadaSeleccionado, setTransportistaLlegadaSeleccionado] = useState<Transportista | null>(null);
  const puntoLlegadaRef = useRef<HTMLDivElement>(null);
  const [fechaInicioTraslado, setFechaInicioTraslado] = useState(
    new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10) // fecha Perú UTC-5
  );

  // Documentos relacionados — múltiples boletas y/o facturas
  const [docsRelacionados, setDocsRelacionados] = useState<DocRelacionado[]>([]);
  const [searchDoc, setSearchDoc] = useState('');
  const [showDocSearch, setShowDocSearch] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  // Transbordo y retorno — flags SUNAT opcionales
  const [transbordoProgramado, setTransbordoProgramado] = useState(false);
  const [retornoEnvasesVacios, setRetornoEnvasesVacios] = useState(false);
  const [retornoVehiculoVacio, setRetornoVehiculoVacio] = useState(false);
  const [trasladoVehiculoM1L, setTrasladoVehiculoM1L] = useState(false);

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
  
  const puntoPartida = `${EMPRESA_DATA.direccion} - ${EMPRESA_DATA.distrito} - ${EMPRESA_DATA.provincia} - ${EMPRESA_DATA.departamento}`;
  
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

  // Transportistas públicos para Punto de Llegada
  const puntosLlegadaOpciones = transportistas.filter(t =>
    t.modalidad === 'publico' && t.activo && (
      !puntoLlegadaBusqueda ||
      t.nombreCompleto.toLowerCase().includes(puntoLlegadaBusqueda.toLowerCase()) ||
      (t.ruc || '').includes(puntoLlegadaBusqueda) ||
      (t.direccion || '').toLowerCase().includes(puntoLlegadaBusqueda.toLowerCase())
    )
  );
  
  const serieActiva = series.find(s => s.tipo === 'guia' && s.activo);
  const serieGuia = serieActiva?.serie || 'T001';
  const siguienteNumero = numeroSeguro ?? getSiguienteNumero('guia');
  const numeroCompleto = formatearNumeroDocumento(serieGuia, siguienteNumero);
  
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
      if (modalidadTraslado === 'publico' && doc.cliente.direccion) setPuntoLlegada(doc.cliente.direccion);
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
    if (grrVinculado?.id === id) setGrrVinculado(null);
  }

  function handleVincularGRR(grr: GuiaRemision) {
    if (docsRelacionados.some(d => d.id === grr.id)) {
      toast.error('Esta GRR ya está vinculada');
      return;
    }

    const nuevo: DocRelacionado = {
      id: grr.id,
      tipo: 'gre',
      numero: grr.numeroCompleto,
      serie: grr.serie,
      clienteNombre: grr.destinatarioNombre,
      rucEmisorGRR: EMPRESA_DATA.ruc,
      serieGRR: grr.serie,
      numeroGRR: String(grr.numero).padStart(8, '0'),
    };

    setDocsRelacionados(prev => [...prev, nuevo]);
    setGrrVinculado(grr);
    setShowGRRSearch(false);
    setSearchGRR('');

    // Auto-llenar desde GRR
    if (grr.bienes?.length) {
      const dest = clientes.find(c =>
        c.id === grr.destinatarioId ||
        c.nombre === grr.destinatarioNombre
      ) || null;
      if (dest) {
        setDestinatario(dest);
        setDestinatarioBusqueda(dest.nombre);
      }
      if (grr.puntoLlegada) setPuntoLlegada(grr.puntoLlegada);
      setItems(grr.bienes.map((it, idx) => ({
        ...it,
        id: Math.random().toString(36).substr(2, 9),
        numeroOrden: idx + 1,
      })));
    }

    toast.success(`GRR ${grr.numeroCompleto} vinculada`);
  }

  function handleDesvincularGRR() {
    if (!grrVinculado) return;
    setDocsRelacionados(prev => prev.filter(d => d.id !== grrVinculado.id));
    setGrrVinculado(null);
    setItems([]);
    setDestinatario(null);
    setDestinatarioBusqueda('');
    setPuntoLlegada('');
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
    if (tipoGuia === 'transportista' && !grrVinculado) {
      toast.error('Vincula una GRE Remitente (GRR) para la GRE Transportista');
      return;
    }
    const hoyPeru = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (fechaInicioTraslado < hoyPeru) {
      toast.error('La fecha de inicio de traslado no puede ser anterior a hoy — SUNAT rechaza la guía si el traslado es antes de la emisión');
      return;
    }

    const datosFleteVal = showFlete ? {
      quienPaga: quienPagaFlete,
      ...(quienPagaFlete === 'tercero' ? { rucTercero, razonSocialTercero } : {}),
    } : undefined;
    
    setLoading(true);

    const codTipoDoc = tipoGuia === 'transportista' ? '31' : '09';
    let hashCPE = '';
    try {
      hashCPE = await generarHashCPE({
        rucEmisor: EMPRESA_DATA.ruc,
        tipoDocumento: codTipoDoc,
        serie: serieGuia,
        numero: siguienteNumero,
        importeTotal: 0,
        fechaEmision: new Date(),
      });
    } catch {
      hashCPE = '';
    }

    const qrData = generarDatosQR({
      rucEmisor: EMPRESA_DATA.ruc,
      tipoDocumento: codTipoDoc,
      serie: serieGuia,
      numero: siguienteNumero,
      importeTotal: 0,
      fechaEmision: new Date(),
      hashCPE,
    });

    const guiaData = {
      id: isEditing ? editingId : generateUUID(),
      tipo: 'guia',
      tipoGuia,
      serie: serieGuia,
      numero: siguienteNumero,
      numeroCompleto,
      fechaEmision: new Date(),
      fechaInicioTraslado: new Date(fechaInicioTraslado),
      motivoTraslado,
      puntoPartida,
      puntoLlegada,
      destinatarioId: destinatario.id,
      destinatarioNombre: destinatario.nombre,
      destinatarioDniRuc: destinatario.dni || destinatario.ruc || '',
      transportistaId: transportista?.id,
      transportista,
      documentosRelacionados: docsRelacionados,
      datosFlete: datosFleteVal,
      bienes: items,
      pesoTotal: pesoTotal || 1,
      unidadMedidaPeso: 'KGM',
      modalidadTraslado,
      transbordoProgramado,
      retornoEnvasesVacios,
      trasladoVehiculoM1L,
      retornoVehiculoVacio,
      observacion: '',
      estado: 'borrador',
      hashCpe: hashCPE,
      qrCode: qrData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Guardar en base de datos
    try {
      const dbPayload = {
        id: guiaData.id,
        serie: serieGuia,
        numero: siguienteNumero,
        tipo_guia: codTipoDoc,
        fecha_emision: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10), // fecha Perú UTC-5
        fecha_inicio_traslado: fechaInicioTraslado,
        motivo_traslado: motivoTraslado,
        destinatario_id: destinatario.id,
        destinatario_nombre: destinatario.nombre,
        destinatario_tipo_doc: destinatario.ruc ? '6' : '1',
        destinatario_num_doc: destinatario.dni || destinatario.ruc || '',
        destinatario_direccion: puntoLlegada,
        punto_partida: puntoPartida,
        punto_llegada: puntoLlegada,
        modalidad_traslado: modalidadTraslado,
        peso_total: pesoTotal || 1,
        unidad_peso: 'KGM',
        transportista_id: transportista?.id,
        transportista_nombre: transportista?.nombreCompleto,
        transportista_tipo_doc: transportista?.modalidad === 'publico' ? '6' : '1',
        transportista_num_doc: transportista?.modalidad === 'publico' ? transportista.ruc : transportista?.dni,
        transportista_placa: transportista?.modalidad === 'privado' ? transportista.numeroPlaca : undefined,
        transportista_licencia: transportista?.modalidad === 'privado' ? transportista.licenciaConducir : undefined,
        transportista_registro_mtc: transportista?.modalidad === 'publico' ? transportista.numeroRegistroMTC : undefined,
        bienes: JSON.stringify(items.map(it => ({
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          unidadMedida: it.unidadMedida,
          codigo: it.productoId,
        }))),
        documentos_relacionados: JSON.stringify(docsRelacionados.map(d => ({
          tipo: d.tipo,
          numero: d.numero,
        }))),
        observacion: '',
        estado: 'borrador',
        data_json: JSON.parse(JSON.stringify(guiaData)),
      };

      if (isEditing && editingId) {
        const { error } = await supabase.from('guias').update(dbPayload).eq('id', editingId);
        if (error) throw error;
        updateGuia({ ...guiaData, id: editingId } as GuiaRemision);
        toast.success('Guía actualizada correctamente');
      } else {
        const { error } = await supabase.from('guias').insert(dbPayload);
        if (error) throw error;
        addGuia(guiaData as GuiaRemision);
        toast.success('Guía guardada. Pendiente de envío a SUNAT.');
      }
      
      router.push('/crm/guias');
    } catch (error: any) {
      console.error('Error guardando guía:', error);
      toast.error('Error al guardar guía: ' + (error.message || 'Error desconocido'));
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
              ${step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-800'}`}>
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

              {/* Tipo de Guía — Siempre GRE Remitente */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-sm font-medium text-indigo-800">
                  <Package className="w-4 h-4 inline-block mr-1" />
                  GRE Remitente <span className="text-xs font-normal opacity-75">(Código SUNAT 09 — siempre)</span>
                </p>
              </div>

              {/* Selector Modalidad de Traslado */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Modalidad de Traslado *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setModalidadTraslado('privado'); setTransportista(null); setTransportistaBusqueda(''); setPuntoLlegada(''); setPuntoLlegadaBusqueda(''); setTransportistaLlegadaSeleccionado(null); }}
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
                    onClick={() => { setModalidadTraslado('publico'); setTransportista(null); setTransportistaBusqueda(''); setPuntoLlegada(''); setPuntoLlegadaBusqueda(''); setTransportistaLlegadaSeleccionado(null); }}
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
              
              {/* Documentos relacionados — condicional según tipo de guía */}
              {tipoGuia === 'transportista' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GRR Vinculada (Guía de Remisión Remitente) *{' '}
                    <span className="text-slate-400 font-normal">(paso 2: vincular GRR)</span>
                  </label>

                  {grrVinculado ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">GR</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-emerald-800 text-sm">
                          GRE Remitente N° {grrVinculado.numeroCompleto} — RUC {EMPRESA_DATA.ruc}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{grrVinculado.destinatarioNombre}</p>
                        <p className="text-xs text-slate-400">Serie: {grrVinculado.serie} | N°: {String(grrVinculado.numero).padStart(8, '0')}</p>
                      </div>
                      <button type="button" onClick={handleDesvincularGRR}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-slate-700 hover:text-red-500 transition-colors">
                        <Link2Off className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchGRR}
                          onChange={e => { setSearchGRR(e.target.value); setShowGRRSearch(true); }}
                          onFocus={() => setShowGRRSearch(true)}
                          placeholder="Buscar GRE Remitente existente..."
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                      </div>
                      {showGRRSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                          {guiasRemitentesFiltrados.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500">
                              No se encontraron GRE Remitente. Crea primero una guía de tipo Remitente.
                            </div>
                          ) : (
                            guiasRemitentesFiltrados.map(g => (
                              <button key={g.id} onClick={() => handleVincularGRR(g)}
                                className="w-full px-4 py-3 text-left border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">GR</div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-800 text-sm">GRE Remitente N° {g.numeroCompleto}</p>
                                    <p className="text-xs text-slate-500 truncate">Destinatario: {g.destinatarioNombre} | Ítems: {g.bienes?.length || 0}</p>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
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
                            className="p-1.5 rounded-lg hover:bg-red-100 text-slate-700 hover:text-red-500 transition-colors">
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
              )}

              {/* Motivo y fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de Traslado *</label>
                  <select
                    value={motivoTraslado}
                    onChange={(e) => setMotivoTraslado(e.target.value as MotivoTraslado)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {CATALOGO_MOTIVOS_TRASLADO.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio Traslado *</label>
                  <input
                    type="date"
                    value={fechaInicioTraslado}
                    min={new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                    onChange={(e) => setFechaInicioTraslado(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">No puede ser anterior a hoy — SUNAT rechaza guías con traslado antes de la fecha de emisión.</p>
                </div>
              </div>
              
              {/* Punto de Llegada */}
              <div className="relative" ref={puntoLlegadaRef}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Punto de Llegada *
                </label>

                {/* PRIVADO: muestra direcciones del destinatario como opciones rápidas */}
                {modalidadTraslado === 'privado' && destinatario && !transportistaLlegadaSeleccionado && (() => {
                  const refs = destinatario.direccionesReferencia ?? [];
                  const opciones = [
                    { id: 'fiscal', label: 'Dirección Fiscal', dir: destinatario.direccion, esFiscal: true },
                    ...refs.map(r => ({ id: String(r.id), label: r.etiqueta || 'Referencia', dir: r.direccion, esFiscal: false })),
                  ];
                  return (
                    <div className="space-y-2 mb-3">
                      {opciones.map(op => {
                        const activa = puntoLlegada === op.dir;
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => { setPuntoLlegada(op.dir); setPuntoLlegadaBusqueda(''); setMostrarPuntosLlegada(false); }}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                              activa ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${activa ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-xs font-semibold uppercase tracking-wide ${op.esFiscal ? 'text-amber-700' : 'text-indigo-700'}`}>
                                  {op.label}
                                </span>
                                {op.esFiscal && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold uppercase">Fiscal</span>
                                )}
                              </div>
                              <p className={`text-sm leading-snug ${activa ? 'text-indigo-800' : 'text-slate-600'}`}>{op.dir || '—'}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              activa ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                            }`}>
                              {activa && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                      <p className="text-xs text-slate-400 pt-1">O elige una empresa de transporte como punto de llegada:</p>
                    </div>
                  );
                })()}

                {/* Empresa de transporte seleccionada — chip de feedback */}
                {transportistaLlegadaSeleccionado && (
                  <div className="flex items-center gap-3 p-3 mb-3 rounded-xl border-2 border-indigo-500 bg-indigo-50">
                    <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-indigo-800">{transportistaLlegadaSeleccionado.nombreCompleto}</p>
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold uppercase">Transporte</span>
                      </div>
                      <p className="text-xs text-indigo-600 mt-0.5">{transportistaLlegadaSeleccionado.direccion || 'Sin dirección'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTransportistaLlegadaSeleccionado(null); setPuntoLlegada(modalidadTraslado === 'privado' && destinatario ? destinatario.direccion : ''); setPuntoLlegadaBusqueda(''); }}
                      className="p-1 hover:bg-indigo-200 rounded-lg transition-colors text-indigo-500"
                      title="Quitar selección"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Campo de búsqueda de empresa de transporte (siempre visible, oculto si ya hay transportista seleccionado) */}
                {!transportistaLlegadaSeleccionado && (
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={puntoLlegadaBusqueda}
                      onChange={(e) => { setPuntoLlegadaBusqueda(e.target.value); setMostrarPuntosLlegada(true); }}
                      onFocus={() => setMostrarPuntosLlegada(true)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Busca empresa de transporte por nombre o RUC..."
                    />
                  </div>
                )}

                {/* Dropdown resultados */}
                {mostrarPuntosLlegada && !transportistaLlegadaSeleccionado && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 text-xs border-b border-slate-200 bg-amber-50 text-amber-700">
                      {puntosLlegadaOpciones.length} empresa{puntosLlegadaOpciones.length !== 1 ? 's' : ''} de transporte público
                    </div>
                    {puntosLlegadaOpciones.length === 0 ? (
                      <div className="p-4 text-slate-500 text-sm">
                        No se encontraron empresas de transporte. Verifica el nombre o RUC.
                      </div>
                    ) : (
                      puntosLlegadaOpciones.map((t) => (
                        <button
                          key={`t-${t.id}`}
                          type="button"
                          onClick={() => {
                            setTransportistaLlegadaSeleccionado(t);
                            setPuntoLlegada(t.direccion || '');
                            setPuntoLlegadaBusqueda('');
                            setMostrarPuntosLlegada(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-slate-100 last:border-0 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-100 shrink-0">
                              <Building2 className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm">{t.nombreCompleto}</p>
                              <p className="text-xs text-slate-500">RUC: {t.ruc || '—'}</p>
                              <p className="text-xs text-slate-500 truncate">{t.direccion || 'Sin dirección'}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Peso bruto total */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Peso Bruto Total <span className="text-slate-400 font-normal">(KGM)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rawPeso ?? (pesoTotal > 0 ? String(pesoTotal) : '')}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || v === '.' || /^\d*\.?\d*$/.test(v)) {
                      setRawPeso(v);
                      if (v !== '') {
                        const n = parseFloat(v);
                        setPesoTotal(isNaN(n) ? 0 : n);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (rawPeso === '') setPesoTotal(0);
                    setRawPeso(null);
                  }}
                  placeholder="Ej: 25.5"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Opciones de traslado — flags SUNAT opcionales */}
              <details className="p-3 border border-slate-200 rounded-xl">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                  Opciones de Traslado <span className="text-slate-400 font-normal">(opcional)</span>
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                    <input type="checkbox" checked={transbordoProgramado}
                      onChange={e => setTransbordoProgramado(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-slate-700">Transbordo Programado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                    <input type="checkbox" checked={retornoEnvasesVacios}
                      onChange={e => setRetornoEnvasesVacios(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-slate-700">Retorno Envases Vacíos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                    <input type="checkbox" checked={retornoVehiculoVacio}
                      onChange={e => setRetornoVehiculoVacio(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-slate-700">Retorno Vehículo Vacío</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                    <input type="checkbox" checked={trasladoVehiculoM1L}
                      onChange={e => setTrasladoVehiculoM1L(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-slate-700">Traslado Vehículo M1L</span>
                  </label>
                </div>
              </details>

              {/* Datos de Flete — opcional (slide paso 9) */}
              {tipoGuia === 'transportista' && (
                <div className="p-4 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      Datos de Flete <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFlete(!showFlete)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        showFlete ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {showFlete ? 'Quitar' : 'Agregar'}
                    </button>
                  </div>
                  {showFlete && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">¿Quién paga el flete?</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['remitente', 'destinatario', 'tercero'] as const).map(op => (
                            <button
                              key={op}
                              type="button"
                              onClick={() => setQuienPagaFlete(op)}
                              className={`p-2 rounded-lg text-xs font-medium border-2 transition-all capitalize ${
                                quienPagaFlete === op
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {op === 'remitente' ? 'Remitente' : op === 'destinatario' ? 'Destinatario' : 'Tercero'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {quienPagaFlete === 'tercero' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">RUC del Tercero</label>
                            <input
                              type="text"
                              value={rucTercero}
                              onChange={e => setRucTercero(e.target.value)}
                              placeholder="20123456789"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Razón Social</label>
                            <input
                              type="text"
                              value={razonSocialTercero}
                              onChange={e => setRazonSocialTercero(e.target.value)}
                              placeholder="Nombre del tercero"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-400">
                        ✓ Marcar para empresas de transporte contratadas (servicio público)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setStep(2)} 
                disabled={!transportista || !destinatario || (tipoGuia === 'transportista' && !grrVinculado)}
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
                      <button onClick={() => handleEliminarItem(index)} className="p-1.5 hover:bg-red-100 text-slate-700 hover:text-red-500 rounded-lg">
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
                      {d.tipo === 'gre'
                        ? `GRE Remitente N° ${d.numero} — RUC ${d.rucEmisorGRR || EMPRESA_DATA.ruc} (Serie: ${d.serieGRR}, N°: ${d.numeroGRR})`
                        : `${d.tipo === 'factura' ? 'Factura' : 'Boleta de Venta'} N° ${d.numero} — RUC ${EMPRESA_DATA.ruc}`
                      }
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showFlete && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <p className="font-medium text-amber-800 text-sm">Datos de Flete</p>
                </div>
                <p className="text-sm text-slate-700">
                  Quien paga: <strong className="capitalize">{quienPagaFlete}</strong>
                  {quienPagaFlete === 'tercero' && rucTercero && (
                    <> — RUC: {rucTercero} {razonSocialTercero ? `(${razonSocialTercero})` : ''}</>
                  )}
                </p>
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
