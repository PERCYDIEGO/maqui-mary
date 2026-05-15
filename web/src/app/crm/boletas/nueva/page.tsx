// ============================================
// PÁGINA: NUEVA BOLETA DE VENTA
// Formulario completo según especificaciones SUNAT
// ============================================

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calculator,
  Save,
  X,
  Search,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { 
  Boleta, 
  Cliente, 
  ItemDocumento, 
  UnidadMedida,
  EMPRESA_DATA 
} from '@/types/documentos';
import { 
  calcularItem, 
  calcularTotalesBoleta, 
  formatearMoneda,
  formatearNumeroDocumento,
  generarHashCPE,
  generarDatosQR,
  redondear
} from '@/lib/calculos';
import toast from 'react-hot-toast';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NuevaBoletaPage() {
  const router = useRouter();
  const { addBoleta, updateBoleta, boletas, clientes, productos, getSiguienteNumero } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  // Estados del formulario
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Datos de la boleta
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const clienteRef = useRef<HTMLDivElement>(null);
  
  // Cerrar lista al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clienteRef.current && !clienteRef.current.contains(event.target as Node)) {
        setMostrarClientes(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detectar modo edición vía ?edit=ID
  useEffect(() => {
    if (editLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (!editId) return;
    const boleta = boletas.find(b => b.id === editId);
    if (!boleta) return;
    setIsEditing(true);
    setEditingId(editId);
    setCliente(boleta.cliente);
    setClienteBusqueda(boleta.cliente.nombre);
    setFechaEmision(new Date(boleta.fechaEmision).toISOString().split('T')[0]);
    if (boleta.fechaVencimiento) setFechaVencimiento(new Date(boleta.fechaVencimiento).toISOString().split('T')[0]);
    setMoneda(boleta.moneda);
    setItems(boleta.items);
    setObservacion(boleta.observacion || '');
    setEditLoaded(true);
  }, [boletas, editLoaded]);
  
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN');
  const [observacion, setObservacion] = useState('');
  
  const [items, setItems] = useState<ItemDocumento[]>([]);
  const [otrosCargos, setOtrosCargos] = useState(0);
  
  // Buscar clientes
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) ||
    c.dni?.includes(clienteBusqueda) ||
    c.ruc?.includes(clienteBusqueda)
  );
  
  // Calcular totales
  const totales = calcularTotalesBoleta(items, otrosCargos);
  
  // Siguiente número
  const siguienteNumero = getSiguienteNumero('boleta');
  const numeroCompleto = formatearNumeroDocumento('EB01', siguienteNumero);
  
  // ============================================
  // HANDLERS
  // ============================================
  
  const handleSelectCliente = (c: Cliente) => {
    setCliente(c);
    setClienteBusqueda(c.nombre);
    setMostrarClientes(false);
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
    const item = { ...newItems[index], [campo]: valor };
    
    // Recalcular
    if (campo === 'cantidad' || campo === 'valorUnitario' || campo === 'descuento') {
      const calculado = calcularItem(
        item.cantidad,
        item.valorUnitario,
        item.descuento,
        false
      );
      item.valorVenta = calculado.valorVenta;
      item.igv = calculado.igv;
      item.importeTotal = calculado.importeTotal;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };
  
  const handleEliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (!cliente) {
      toast.error('Selecciona un cliente');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un item');
      return;
    }
    if (items.some(i => !i.descripcion || i.cantidad <= 0)) {
      toast.error('Completa todos los items');
      return;
    }
    
    setLoading(true);

    // Modo edición: actualizar boleta existente
    if (isEditing && editingId) {
      const original = boletas.find(b => b.id === editingId);
      if (original) {
        updateBoleta({ ...original, cliente: cliente!, clienteId: cliente!.id, fechaEmision: new Date(fechaEmision), fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined, moneda, items, observacion, updatedAt: new Date(), ...totales });
        toast.success('Boleta actualizada correctamente');
        router.push('/crm/boletas');
      }
      setLoading(false);
      return;
    }

    try {
      const hashCPE = generarHashCPE({
        rucEmisor: EMPRESA_DATA.ruc,
        tipoDocumento: '03',
        serie: 'EB01',
        numero: siguienteNumero,
        importeTotal: totales.importeTotal,
        fechaEmision: new Date(fechaEmision),
      });
      
      const qrData = generarDatosQR({
        rucEmisor: EMPRESA_DATA.ruc,
        tipoDocumento: '03',
        serie: 'EB01',
        numero: siguienteNumero,
        importeTotal: totales.importeTotal,
        fechaEmision: new Date(fechaEmision),
        hashCPE,
      });
      
      const boleta: Boleta = {
        id: Math.random().toString(36).substr(2, 9),
        tipo: 'boleta',
        serie: 'EB01',
        numero: siguienteNumero,
        numeroCompleto,
        fechaEmision: new Date(fechaEmision),
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
        clienteId: cliente.id,
        cliente,
        moneda,
        items,
        observacion,
        estado: 'borrador',
        hashCpe: hashCPE,
        qrCode: qrData,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...totales,
      };

      addBoleta(boleta);
      toast.success('Boleta guardada. Pendiente de envío a SUNAT.');
      router.push('/crm/boletas');
    } catch (error) {
      toast.error('Error al emitir la boleta');
    } finally {
      setLoading(false);
    }
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/crm/boletas"
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Boleta de Venta' : 'Nueva Boleta de Venta'}</h1>
          <p className="text-slate-500">{numeroCompleto}</p>
        </div>
      </div>
      
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
              ${step === s ? 'bg-amber-500 text-white' : 
                step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}
            `}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-sm ${step === s ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
              {s === 1 ? 'Cliente' : s === 2 ? 'Ítems' : 'Totales'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-slate-300 mx-2" />}
          </div>
        ))}
      </div>
      
      {/* Formulario */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Paso 1: Cliente */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Datos del Cliente</h2>
            
            <div className="space-y-4">
              {/* Buscador de clientes registrados */}
              <div className="relative" ref={clienteRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Buscar Cliente Registrado *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={clienteBusqueda}
                    onChange={(e) => {
                      setClienteBusqueda(e.target.value);
                      setMostrarClientes(true);
                    }}
                    onFocus={() => setMostrarClientes(true)}
                    placeholder="Escribe para filtrar clientes..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>
                
                {/* Dropdown clientes - muestra todos los registrados */}
                {mostrarClientes && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                      {clientesFiltrados.length} de {clientes.length} clientes registrados
                    </div>
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-4 text-slate-500 text-sm">
                        No se encontraron clientes. <Link href="/crm/clientes" className="text-amber-600 hover:underline">Crear nuevo cliente</Link>
                      </div>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCliente(c)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-600" />
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
              
              {/* Datos del cliente seleccionado */}
              {cliente && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{cliente.nombre}</p>
                      <p className="text-sm text-slate-600">{cliente.direccion}</p>
                      {cliente.dni && <p className="text-sm text-slate-600">DNI: {cliente.dni}</p>}
                    </div>
                    <button 
                      onClick={() => {
                        setCliente(null);
                        setClienteBusqueda('');
                      }}
                      className="p-2 hover:bg-amber-100 rounded-lg text-slate-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de Vencimiento (opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              
              {/* Moneda */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Moneda
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="PEN"
                      checked={moneda === 'PEN'}
                      onChange={() => setMoneda('PEN')}
                      className="w-4 h-4 text-amber-500"
                    />
                    <span>SOLES (PEN)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="USD"
                      checked={moneda === 'USD'}
                      onChange={() => setMoneda('USD')}
                      className="w-4 h-4 text-amber-500"
                    />
                    <span>DÓLARES (USD)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!cliente}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
        
        {/* Paso 2: Ítems */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Ítems de la Boleta</h2>
              <button
                onClick={handleAgregarItem}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Agregar Ítem
              </button>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay ítems agregados</p>
                <button
                  onClick={handleAgregarItem}
                  className="mt-3 text-amber-600 hover:text-amber-700 font-medium"
                >
                  Agregar primer ítem
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600">Ítem #{index + 1}</span>
                      <button
                        onClick={() => handleEliminarItem(index)}
                        className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      >
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
                                  valorUnitario: 0,
                                  valorVenta: 0,
                                  igv: 0,
                                  importeTotal: 0,
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
                                  valorUnitario: producto.precioUnitario,
                                  unidadMedida: producto.unidadMedida,
                                };
                                const calculado = calcularItem(
                                  newItems[index].cantidad,
                                  producto.precioUnitario,
                                  newItems[index].descuento,
                                  false
                                );
                                newItems[index].valorVenta = calculado.valorVenta;
                                newItems[index].igv = calculado.igv;
                                newItems[index].importeTotal = calculado.importeTotal;
                                setItems(newItems);
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm ${
                              !item.productoId
                                ? 'border-red-300 focus:ring-red-400'
                                : 'border-slate-200 focus:ring-amber-500'
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
                           <p className="text-xs text-amber-600 mt-1">
                             No hay productos registrados. <Link href="/crm/productos" className="underline">Crear producto</Link>
                           </p>
                         )}
                       </div>

                       {/* Detalle del Producto (se jala automáticamente) */}
                       {item.detalle && (
                         <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                           <label className="block text-xs font-medium text-amber-700 mb-1">
                             Detalle del Producto
                           </label>
                           <p className="text-sm text-slate-700">{item.detalle}</p>
                         </div>
                       )}

                       <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                         {/* Descripción (editable) */}
                         <div className="md:col-span-5">
                           <label className="block text-xs font-medium text-slate-600 mb-1">
                             Descripción
                           </label>
                           <input
                             type="text"
                             value={item.descripcion}
                             onChange={(e) => handleActualizarItem(index, 'descripcion', e.target.value)}
                             placeholder="Descripción del producto o servicio"
                             className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                           />
                         </div>
                         
                         {/* Cantidad */}
                         <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-600 mb-1">
                             Cantidad
                           </label>
                           <input
                             type="number"
                             min="1"
                             value={item.cantidad}
                             onChange={(e) => handleActualizarItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                             className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                           />
                         </div>
                         
                         {/* Unidad */}
                         <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-600 mb-1">
                             Unidad
                           </label>
                           <select
                             value={item.unidadMedida}
                             onChange={(e) => handleActualizarItem(index, 'unidadMedida', e.target.value)}
                             className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                           >
                             <option value="UNIDAD">UNIDAD</option>
                             <option value="CAJA">CAJA</option>
                             <option value="PAQUETE">PAQUETE</option>
                             <option value="KILO">KILO</option>
                             <option value="LITRO">LITRO</option>
                           </select>
                         </div>
                         
                         {/* Valor Unitario */}
                         <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-600 mb-1">
                             P. Unit. (sin IGV)
                           </label>
                           <input
                             type="number"
                             step="0.01"
                             min="0"
                             value={item.valorUnitario || ''}
                             onChange={(e) => handleActualizarItem(index, 'valorUnitario', parseFloat(e.target.value) || 0)}
                             className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                           />
                         </div>
                         
                         {/* Total */}
                         <div className="md:col-span-1">
                           <label className="block text-xs font-medium text-slate-600 mb-1">
                             Total
                           </label>
                           <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
                             {formatearMoneda(item.importeTotal, moneda)}
                           </div>
                         </div>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Anterior
              </button>
              <div className="flex flex-col items-end gap-1">
                {items.length > 0 && !items.every(i => i.productoId && i.descripcion && i.cantidad > 0 && i.valorUnitario > 0) && (
                  <p className="text-xs text-red-500">Completa todos los ítems antes de continuar</p>
                )}
                <button
                  onClick={() => setStep(3)}
                  disabled={!items.every(i => i.productoId && i.descripcion && i.cantidad > 0 && i.valorUnitario > 0) || items.length === 0}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Paso 3: Totales y Emisión */}
        {step === 3 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Resumen y Totales</h2>
            
            {/* Tabla de items */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Cant.</th>
                    <th className="px-4 py-2 text-left">Descripción</th>
                    <th className="px-4 py-2 text-right">P. Unit.</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-4 py-2">{item.cantidad}</td>
                      <td className="px-4 py-2">{item.descripcion}</td>
                      <td className="px-4 py-2 text-right">{formatearMoneda(item.valorUnitario, moneda)}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatearMoneda(item.importeTotal, moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Totales */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Operación Gravada</span>
                <span className="font-medium">{formatearMoneda(totales.operacionGravada, moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGV (18%)</span>
                <span className="font-medium">{formatearMoneda(totales.igvTotal, moneda)}</span>
              </div>
              {totales.icbperTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">ICBPER</span>
                  <span className="font-medium">{formatearMoneda(totales.icbperTotal, moneda)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-slate-800">IMPORTE TOTAL</span>
                  <span className="text-lg font-bold text-slate-800">{formatearMoneda(totales.importeTotal, moneda)}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{totales.importeEnLetras}</p>
              </div>
            </div>
            
            {/* Observación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Observación (opcional)
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                placeholder="Notas adicionales..."
              />
            </div>
            
            {/* Leyenda SUNAT */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm text-slate-600">
              <p className="font-medium text-amber-800 mb-1">Representación impresa de la Boleta de Venta Electrónica</p>
              <p>Generada en el Sistema de la SUNAT. Consulte su documento en www.sunat.gob.pe</p>
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Emitiendo...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {isEditing ? 'Guardar Cambios' : 'Emitir Boleta'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
