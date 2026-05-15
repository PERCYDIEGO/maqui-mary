// ============================================
// FORMULARIO: NUEVA FACTURA ELECTRÓNICA
// Con RUC, forma de pago crédito/contado, anticipos
// ============================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, X, Search, User, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Factura, Cliente, ItemDocumento, EMPRESA_DATA } from '@/types/documentos';
import {
  calcularItem,
  calcularTotalesFactura,
  formatearMoneda,
  formatearNumeroDocumento,
  generarHashCPE,
  generarDatosQR,
  redondear
} from '@/lib/calculos';
import toast from 'react-hot-toast';

export default function NuevaFacturaPage() {
  const router = useRouter();
  const { addFactura, updateFactura, facturas, clientes, productos, getSiguienteNumero } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Estados del formulario
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
    const factura = facturas.find(f => f.id === editId);
    if (!factura) return;
    setIsEditing(true);
    setEditingId(editId);
    setCliente(factura.cliente);
    setClienteBusqueda(`${factura.cliente.nombre} - RUC: ${factura.cliente.ruc}`);
    setFechaEmision(new Date(factura.fechaEmision).toISOString().split('T')[0]);
    if (factura.fechaVencimiento) setFechaVencimiento(new Date(factura.fechaVencimiento).toISOString().split('T')[0]);
    setFormaPago(factura.formaPago);
    setMoneda(factura.moneda);
    setItems(factura.items);
    setObservacion(factura.observacion || '');
    setEditLoaded(true);
  }, [facturas, editLoaded]);
  
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [formaPago, setFormaPago] = useState<'contado' | 'credito'>('contado');
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN');
  const [observacion, setObservacion] = useState('');
  
  const [items, setItems] = useState<ItemDocumento[]>([]);
  const [anticipoGlobal, setAnticipoGlobal] = useState(0);
  const [otrosCargos, setOtrosCargos] = useState(0);
  
  // Buscar clientes que tengan RUC
  const clientesFiltrados = clientes.filter(c =>
    c.ruc && (
      c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) ||
      c.ruc.includes(clienteBusqueda)
    )
  );
  
  // Calcular totales
  const totales = calcularTotalesFactura(items, otrosCargos, 0);
  
  // Siguiente número
  const siguienteNumero = getSiguienteNumero('factura');
  const numeroCompleto = formatearNumeroDocumento('E001', siguienteNumero);
  
  const handleSelectCliente = (c: Cliente) => {
    if (!c.ruc) {
      toast.error('Este cliente no tiene RUC registrado. Las facturas requieren RUC.');
      return;
    }
    setCliente(c);
    setClienteBusqueda(`${c.nombre} - RUC: ${c.ruc}`);
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
    
    if (campo === 'cantidad' || campo === 'valorUnitario' || campo === 'descuento' || campo === 'anticipos') {
      const calculado = calcularItem(item.cantidad, item.valorUnitario, item.descuento, false);
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
      toast.error('Selecciona un cliente con RUC');
      return;
    }
    if (!cliente.ruc) {
      toast.error('El cliente seleccionado no tiene RUC registrado');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un item');
      return;
    }
    
    setLoading(true);

    // Modo edición: actualizar factura existente
    if (isEditing && editingId) {
      const original = facturas.find(f => f.id === editingId);
      if (original) {
        updateFactura({ ...original, cliente: cliente!, clienteId: cliente!.id, fechaEmision: new Date(fechaEmision), fechaVencimiento: formaPago === 'credito' && fechaVencimiento ? new Date(fechaVencimiento) : undefined, formaPago, moneda, items, observacion, updatedAt: new Date(), ...totales });
        toast.success('Factura actualizada correctamente');
        router.push('/crm/facturas');
      }
      setLoading(false);
      return;
    }

    try {
      const hashCPE = generarHashCPE({
        rucEmisor: EMPRESA_DATA.ruc,
        tipoDocumento: '01',
        serie: 'E001',
        numero: siguienteNumero,
        importeTotal: totales.importeTotal,
        fechaEmision: new Date(fechaEmision),
      });
      
      const qrData = generarDatosQR({
        rucEmisor: EMPRESA_DATA.ruc,
        tipoDocumento: '01',
        serie: 'E001',
        numero: siguienteNumero,
        importeTotal: totales.importeTotal,
        fechaEmision: new Date(fechaEmision),
        hashCPE,
      });
      
      const factura: Factura = {
        id: Math.random().toString(36).substr(2, 9),
        tipo: 'factura',
        serie: 'E001',
        numero: siguienteNumero,
        numeroCompleto,
        fechaEmision: new Date(fechaEmision),
        fechaVencimiento: formaPago === 'credito' && fechaVencimiento ? new Date(fechaVencimiento) : undefined,
        clienteId: cliente.id,
        cliente,
        moneda,
        formaPago,
        items,
        observacion,
        estado: 'borrador',
        hashCpe: hashCPE,
        qrCode: qrData,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...totales,
      };
      
      addFactura(factura);
      toast.success('Factura guardada. Pendiente de envío a SUNAT.');
      router.push('/crm/facturas');
    } catch (error) {
      toast.error('Error al emitir la factura');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/facturas" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Factura Electrónica' : 'Nueva Factura Electrónica'}</h1>
          <p className="text-slate-500">{numeroCompleto}</p>
        </div>
      </div>
      
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
              ${step === s ? 'bg-purple-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-sm ${step === s ? 'text-purple-600 font-medium' : 'text-slate-500'}`}>
              {s === 1 ? 'Cliente' : s === 2 ? 'Ítems' : 'Resumen'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-slate-300 mx-2" />}
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {step === 1 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Datos del Cliente</h2>
            
            <div className="space-y-4">
              {/* Buscador */}
              <div className="relative" ref={clienteRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Buscar Cliente (Empresa con RUC) *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={clienteBusqueda}
                    onChange={(e) => { setClienteBusqueda(e.target.value); setMostrarClientes(true); }}
                    onFocus={() => setMostrarClientes(true)}
                    placeholder="Escribe para buscar cliente..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                {mostrarClientes && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                      {clientesFiltrados.length} de {clientes.length} clientes registrados
                    </div>
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-4 text-slate-500 text-sm">
                        No se encontraron clientes. <Link href="/crm/clientes" className="text-purple-600 hover:underline">Crear nuevo cliente</Link>
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
                              <Building2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{c.nombre}</p>
                              <p className="text-sm text-slate-500">{c.ruc ? `RUC: ${c.ruc}` : 'Sin RUC'}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {cliente && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{cliente.nombre}</p>
                      <p className="text-sm text-slate-600">RUC: {cliente.ruc}</p>
                      <p className="text-sm text-slate-600">{cliente.direccion}</p>
                    </div>
                    <button onClick={() => { setCliente(null); setClienteBusqueda(''); }} className="p-2 hover:bg-purple-100 rounded-lg">
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Fechas y forma de pago */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Emisión *</label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pago *</label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value as 'contado' | 'credito')}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>
                {formaPago === 'credito' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Vencimiento *</label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="PEN" checked={moneda === 'PEN'} onChange={() => setMoneda('PEN')} className="w-4 h-4 text-purple-600" />
                    <span>SOLES (PEN)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="USD" checked={moneda === 'USD'} onChange={() => setMoneda('USD')} className="w-4 h-4 text-purple-600" />
                    <span>DÓLARES (USD)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button onClick={() => setStep(2)} disabled={!cliente} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-xl font-semibold">
                Continuar
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Ítems de la Factura</h2>
              <button onClick={handleAgregarItem} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium">
                <Plus className="w-5 h-5" />
                Agregar Ítem
              </button>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <p className="text-slate-500">No hay ítems agregados</p>
                <button onClick={handleAgregarItem} className="mt-3 text-purple-600 font-medium">Agregar primer ítem</button>
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
                              : 'border-slate-200 focus:ring-purple-500'
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
                          <p className="text-xs text-purple-600 mt-1">
                            No hay productos registrados. <Link href="/crm/productos" className="underline">Crear producto</Link>
                          </p>
                        )}
                      </div>

                      {/* Detalle del Producto (se jala automáticamente) */}
                      {item.detalle && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <label className="block text-xs font-medium text-purple-700 mb-1">
                            Detalle del Producto
                          </label>
                          <p className="text-sm text-slate-700">{item.detalle}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <label className="block text-xs text-slate-600 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={item.descripcion}
                            onChange={(e) => handleActualizarItem(index, 'descripcion', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="Descripción del producto"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-600 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleActualizarItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
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
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-600 mb-1">P. Unit.</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.valorUnitario || ''}
                            onChange={(e) => handleActualizarItem(index, 'valorUnitario', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs text-slate-600 mb-1">Total</label>
                          <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium">
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
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold">
                Anterior
              </button>
              <div className="flex flex-col items-end gap-1">
                {items.length > 0 && !items.every(i => i.productoId && i.descripcion && i.cantidad > 0 && i.valorUnitario > 0) && (
                  <p className="text-xs text-red-500">Completa todos los ítems antes de continuar</p>
                )}
                <button
                  onClick={() => setStep(3)}
                  disabled={!items.every(i => i.productoId && i.descripcion && i.cantidad > 0 && i.valorUnitario > 0) || items.length === 0}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold disabled:bg-slate-300"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Resumen de Factura</h2>
            
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
            
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sub Total</span>
                <span className="font-medium">{formatearMoneda(totales.subTotal, moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Descuento</span>
                <span className="font-medium">{formatearMoneda(totales.descuentoTotal, moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Operación Gravada</span>
                <span className="font-medium">{formatearMoneda(totales.valorVenta, moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGV (18%)</span>
                <span className="font-medium">{formatearMoneda(totales.igvTotal, moneda)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-slate-800">IMPORTE TOTAL</span>
                  <span className="text-lg font-bold text-slate-800">{formatearMoneda(totales.importeTotal, moneda)}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{totales.importeEnLetras}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observación (opcional)</label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none"
              />
            </div>
            
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-sm text-slate-600">
              <p className="font-medium text-purple-800 mb-1">Representación impresa de la Factura Electrónica</p>
              <p>Consulte su documento en www.sunat.gob.pe</p>
            </div>
            
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold">
                Anterior
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-lg"
              >
                {loading ? 'Guardando...' : <><Save className="w-5 h-5" /> {isEditing ? 'Guardar Cambios' : 'Emitir Factura'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
