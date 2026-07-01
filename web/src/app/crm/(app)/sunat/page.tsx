'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, Clock, FileText, AlertTriangle, Eye, X, Code, User, Trash2, Stethoscope, FlaskConical, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatearMoneda } from '@/lib/calculos';
import { EMPRESA_DATA } from '@/types/documentos';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type TipoDocumento = 'boleta' | 'factura' | 'guia';

interface DocumentoPendiente {
  id: string;
  tipo: TipoDocumento;
  numeroCompleto: string;
  serie: string;
  numero: number;
  cliente: { nombre: string; dni?: string; ruc?: string; direccion?: string };
  fechaEmision: Date;
  createdAt: Date;
  importeTotal: number;
  moneda: 'PEN' | 'USD';
  estado: string;
  items?: any[];
  igvTotal?: number;
  operacionGravada?: number;
  createdBy?: string;
  enviadoPor?: string;
  enviadoAt?: Date;
}

// Selector de ambiente al momento de enviar: un solo trigger (no ocupa espacio extra en
// mobile) que abre un menú con las 2 opciones fuertemente diferenciadas por color/ícono/texto.
// Producción nunca se ejecuta directo desde acá — dispara la confirmación del padre.
function EnviarSunatMenu({
  doc, label, loading, abierto, onAbrir, onCerrar, onElegir,
}: {
  doc: DocumentoPendiente;
  label: string;
  loading: boolean;
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  onElegir: (ambiente: 'sandbox' | 'produccion') => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => (abierto ? onCerrar() : onAbrir())}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent-terracotta hover:bg-accent-terracotta/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5" />
        )}
        {loading ? 'Enviando...' : label}
        {!loading && <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={onCerrar} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-ink-200 rounded-xl shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => onElegir('sandbox')}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-ink-50 transition-colors"
            >
              <FlaskConical className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-medium text-ink-700">Probar en Sandbox</span>
                <span className="block text-[11px] text-ink-400">Ambiente de pruebas, sin validez tributaria</span>
              </span>
            </button>
            <button
              onClick={() => onElegir('produccion')}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left bg-red-50 hover:bg-red-100 border-t border-red-200 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold text-red-700">Enviar a SUNAT — PRODUCCIÓN</span>
                <span className="block text-[11px] text-red-500">Válido tributariamente. No se puede deshacer.</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SunatPage() {
  const { boletas, facturas, guias, enviarDocumentoSUNAT, enviarGuiaSUNAT, aprobarDocumento, rechazarDocumento, eliminarDocumentoRechazado } = useApp();
  const [procesando, setProcesando] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [documentoRechazando, setDocumentoRechazando] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<DocumentoPendiente | null>(null);
  const [mostrarXML, setMostrarXML] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<DocumentoPendiente | null>(null);
  const [ambienteGlobal, setAmbienteGlobal] = useState<'sandbox' | 'produccion'>('sandbox');
  const [menuEnviarAbierto, setMenuEnviarAbierto] = useState<string | null>(null);
  const [confirmarProduccion, setConfirmarProduccion] = useState<{ doc: DocumentoPendiente; reenvio: boolean } | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, alias').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        for (const p of data) {
          map[p.id] = p.full_name || p.alias || p.id.slice(0, 8)
        }
        setUserMap(map)
      }
    })
    supabase.from('sunat_config').select('apisunat_environment').eq('id', 1).single().then(({ data }) => {
      if (data?.apisunat_environment === 'produccion') setAmbienteGlobal('produccion')
    })
  }, [])

  // Generar XML UBL que se enviará a SUNAT
  const generarXMLUBL = (doc: DocumentoPendiente): string => {
    if (doc.tipo === 'guia') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2" 
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${doc.serie}-${String(doc.numero).padStart(8, '0')}</cbc:ID>
  <cbc:IssueDate>${new Date(doc.fechaEmision).toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:DespatchAdviceTypeCode>09</cbc:DespatchAdviceTypeCode>
  <!-- Documento simplificado para vista previa -->
  <cac:DespatchSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${EMPRESA_DATA.razonSocial}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:DespatchSupplierParty>
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${doc.cliente.nombre}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:DeliveryCustomerParty>
</DespatchAdvice>`;
    }
    const tipoDoc = doc.tipo === 'boleta' ? '03' : '01';
    const tipoDocTexto = doc.tipo === 'boleta' ? 'Boleta de Venta' : 'Factura';
    
    const itemsXml = doc.items?.map((item: any, index: number) => `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${item.unidadMedida}">${item.cantidad}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${doc.moneda}">${item.valorVenta?.toFixed(2) || '0.00'}</cbc:LineExtensionAmount>
      <cac:PricingReference>
        <cac:AlternativeConditionPrice>
          <cbc:PriceAmount currencyID="${doc.moneda}">${item.importeTotal?.toFixed(2) || '0.00'}</cbc:PriceAmount>
          <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
        </cac:AlternativeConditionPrice>
      </cac:PricingReference>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${doc.moneda}">${item.igv?.toFixed(2) || '0.00'}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${doc.moneda}">${item.valorVenta?.toFixed(2) || '0.00'}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${doc.moneda}">${item.igv?.toFixed(2) || '0.00'}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:Percent>18.00</cbc:Percent>
            <cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>
            <cac:TaxScheme>
              <cbc:ID>1000</cbc:ID>
              <cbc:Name>IGV</cbc:Name>
              <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Description>${item.descripcion}</cbc:Description>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${doc.moneda}">${item.valorUnitario?.toFixed(2) || '0.00'}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join('') || '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- CABECERA DEL DOCUMENTO -->
  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${doc.numeroCompleto}</cbc:ID>
  <cbc:IssueDate>${new Date(doc.fechaEmision).toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:IssueTime>${new Date(doc.fechaEmision).toTimeString().split(' ')[0]}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="${tipoDoc}" listAgencyName="PE:SUNAT" 
                       listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${tipoDoc}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" 
                            listName="Currency">${doc.moneda}</cbc:DocumentCurrencyCode>
  
  <!-- EMISOR (MAQUI MARY) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" 
                schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${EMPRESA_DATA.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${EMPRESA_DATA.razonSocial}</cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode>0001</cbc:AddressTypeCode>
          <cbc:CitySubdivisionName>${EMPRESA_DATA.direccion}</cbc:CitySubdivisionName>
          <cbc:CityName>${EMPRESA_DATA.provincia}</cbc:CityName>
          <cbc:CountrySubentity>${EMPRESA_DATA.departamento}</cbc:CountrySubentity>
          <cbc:District>${EMPRESA_DATA.distrito}</cbc:District>
          <cac:Country>
            <cbc:IdentificationCode>PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- ADQUIRIENTE (CLIENTE) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${doc.cliente.dni ? '1' : '6'}" schemeName="Documento de Identidad" 
                schemeAgencyName="PE:SUNAT">${doc.cliente.dni || doc.cliente.ruc || '00000000'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${doc.cliente.nombre}</cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
          <cbc:CitySubdivisionName>${doc.cliente.direccion || 'Direccion no especificada'}</cbc:CitySubdivisionName>
          <cac:Country>
            <cbc:IdentificationCode>PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- TOTALES -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${doc.moneda}">${(doc.igvTotal || 0).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${doc.moneda}">${(doc.operacionGravada || 0).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${doc.moneda}">${(doc.igvTotal || 0).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">S</cbc:ID>
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${doc.moneda}">${(doc.operacionGravada || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${doc.moneda}">${doc.importeTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${doc.moneda}">${doc.importeTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- ÍTEMS / DETALLE -->${itemsXml}
  
</Invoice>`;
  };

  const sortDesc = (a: DocumentoPendiente, b: DocumentoPendiente) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  // Mapear guías al formato DocumentoPendiente
  const guiasPendientes: DocumentoPendiente[] = guias
    .filter(g => g.estado === 'borrador' || g.estado === 'pendiente_envio')
    .map(g => ({
      id: g.id,
      tipo: 'guia' as TipoDocumento,
      numeroCompleto: g.numeroCompleto,
      serie: g.serie,
      numero: g.numero,
      cliente: { 
        nombre: g.destinatarioNombre, 
        ruc: g.destinatarioDniRuc?.length === 11 ? g.destinatarioDniRuc : undefined,
        dni: g.destinatarioDniRuc?.length === 8 ? g.destinatarioDniRuc : undefined,
        direccion: g.puntoLlegada 
      },
      fechaEmision: g.fechaEmision,
      createdAt: g.createdAt,
      importeTotal: 0,
      moneda: 'PEN' as 'PEN' | 'USD',
      estado: g.estado,
      items: g.bienes?.map((b: any) => ({
        descripcion: b.descripcion,
        cantidad: b.cantidad,
        unidadMedida: b.unidadMedida || 'NIU',
        valorVenta: 0,
        importeTotal: 0,
        igv: 0,
      })),
      igvTotal: 0,
      operacionGravada: 0,
    }));

  const guiasEnviadas: DocumentoPendiente[] = guias
    .filter(g => g.estado === 'enviado' || g.estado === 'aprobado' || g.estado === 'rechazado')
    .map(g => ({
      id: g.id,
      tipo: 'guia' as TipoDocumento,
      numeroCompleto: g.numeroCompleto,
      serie: g.serie,
      numero: g.numero,
      cliente: { 
        nombre: g.destinatarioNombre, 
        ruc: g.destinatarioDniRuc?.length === 11 ? g.destinatarioDniRuc : undefined,
        dni: g.destinatarioDniRuc?.length === 8 ? g.destinatarioDniRuc : undefined,
        direccion: g.puntoLlegada 
      },
      fechaEmision: g.fechaEmision,
      createdAt: g.createdAt,
      importeTotal: 0,
      moneda: 'PEN' as 'PEN' | 'USD',
      estado: g.estado,
      items: g.bienes?.map((b: any) => ({
        descripcion: b.descripcion,
        cantidad: b.cantidad,
        unidadMedida: b.unidadMedida || 'NIU',
        valorVenta: 0,
        importeTotal: 0,
        igv: 0,
      })),
      igvTotal: 0,
      operacionGravada: 0,
    }));

  // Documentos pendientes de envío (borrador o pendiente_envio)
  const documentosPendientes: DocumentoPendiente[] = [
    ...boletas
      .filter(b => b.estado === 'borrador' || b.estado === 'pendiente_envio')
      .map(b => ({ ...b, tipo: 'boleta' as TipoDocumento })),
    ...facturas
      .filter(f => f.estado === 'borrador' || f.estado === 'pendiente_envio')
      .map(f => ({ ...f, tipo: 'factura' as TipoDocumento })),
    ...guiasPendientes,
  ].sort(sortDesc);

  // Documentos enviados a SUNAT
  const documentosEnviados: DocumentoPendiente[] = [
    ...boletas
      .filter(b => b.estado === 'enviado' || b.estado === 'aprobado' || b.estado === 'rechazado')
      .map(b => ({ ...b, tipo: 'boleta' as TipoDocumento })),
    ...facturas
      .filter(f => f.estado === 'enviado' || f.estado === 'aprobado' || f.estado === 'rechazado')
      .map(f => ({ ...f, tipo: 'factura' as TipoDocumento })),
    ...guiasEnviadas,
  ].sort(sortDesc);

  const handleEnviar = async (doc: DocumentoPendiente, ambiente: 'sandbox' | 'produccion') => {
    setMenuEnviarAbierto(null);
    setProcesando(doc.id);
    try {
      if (doc.tipo === 'guia') {
        const resultado = await enviarGuiaSUNAT(doc.id, ambiente);
        if (resultado.success) {
          toast.success(resultado.message);
        } else {
          toast.error(resultado.message);
        }
      } else {
        const resultado = await enviarDocumentoSUNAT(doc.id, doc.tipo, ambiente);
        if (resultado.success) {
          toast.success(resultado.message);
        } else {
          toast.error(resultado.message);
        }
      }
    } catch (error) {
      toast.error('Error al enviar documento');
    } finally {
      setProcesando(null);
    }
  };

  // Punto único de entrada del selector: sandbox va directo, producción exige confirmación
  const handleElegirAmbiente = (doc: DocumentoPendiente, ambiente: 'sandbox' | 'produccion', reenvio: boolean) => {
    setMenuEnviarAbierto(null);
    if (ambiente === 'produccion') {
      setConfirmarProduccion({ doc, reenvio });
      return;
    }
    if (reenvio) handleReenviar(doc, 'sandbox');
    else handleEnviar(doc, 'sandbox');
  };

  const handleAprobar = async (doc: DocumentoPendiente) => {
    if (doc.tipo === 'guia') {
      toast.error('Las guías no se aprueban manualmente. Envíalas directamente a SUNAT.');
      return;
    }
    setProcesando(doc.id);
    try {
      await aprobarDocumento(doc.id, doc.tipo);
    } catch (error) {
      toast.error('Error al aprobar documento');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (doc: DocumentoPendiente) => {
    if (doc.tipo === 'guia') {
      toast.error('Las guías no se rechazan desde aquí. Usa la bandeja de guías.');
      return;
    }
    if (!motivoRechazo.trim()) {
      toast.error('Debe ingresar un motivo de rechazo');
      return;
    }
    setProcesando(doc.id);
    try {
      await rechazarDocumento(doc.id, doc.tipo, motivoRechazo);
      setMotivoRechazo('');
      setDocumentoRechazando(null);
    } catch (error) {
      toast.error('Error al rechazar documento');
    } finally {
      setProcesando(null);
    }
  };

  const handleEliminar = async (doc: DocumentoPendiente) => {
    setEliminando(doc.id);
    try {
      await eliminarDocumentoRechazado(doc.id, doc.tipo);
      setConfirmarEliminar(null);
      toast.success(`${doc.tipo === 'guia' ? 'Guía' : doc.tipo === 'boleta' ? 'Boleta' : 'Factura'} eliminada correctamente`);
    } catch {
      toast.error('Error al eliminar el documento');
    } finally {
      setEliminando(null);
    }
  };

  const handleReenviar = async (doc: DocumentoPendiente, ambiente: 'sandbox' | 'produccion') => {
    setMenuEnviarAbierto(null);
    setProcesando(doc.id);
    try {
      if (doc.tipo === 'guia') {
        const resultado = await enviarGuiaSUNAT(doc.id, ambiente);
        if (resultado.success) {
          toast.success(resultado.message);
        } else {
          toast.error(resultado.message);
        }
      } else {
        const resultado = await enviarDocumentoSUNAT(doc.id, doc.tipo, ambiente);
        if (resultado.success) {
          toast.success(resultado.message);
        } else {
          toast.error(resultado.message);
        }
      }
    } catch {
      toast.error('Error al re-enviar documento');
    } finally {
      setProcesando(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700"><Clock className="w-3 h-3" /> Borrador</span>;
      case 'pendiente_envio':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock className="w-3 h-3" /> Pendiente</span>;
      case 'enviado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Send className="w-3 h-3" /> Enviado</span>;
      case 'aprobado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Aprobado</span>;
      case 'rechazado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Rechazado</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{estado}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink-800">Envío a SUNAT</h1>
          <p className="text-ink-500">Gestiona el envío de documentos electrónicos a SUNAT</p>
        </div>
        <span
          title="Ambiente por defecto configurado en Configuración > SUNAT. Cada envío puede elegir sandbox o producción individualmente."
          className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-xs font-semibold border ${
            ambienteGlobal === 'produccion'
              ? 'bg-red-100 text-red-700 border-red-300'
              : 'bg-blue-50 text-blue-600 border-blue-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${ambienteGlobal === 'produccion' ? 'bg-red-500 animate-pulse' : 'bg-blue-400'}`} />
          Default: {ambienteGlobal === 'produccion' ? 'PRODUCCIÓN' : 'SANDBOX'}
        </span>
      </div>

      {/* Alerta informativa */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-800">Módulo de Envío a SUNAT</h3>
            <p className="text-sm text-amber-700 mt-1">
              Desde aquí los administradores pueden enviar boletas y facturas a SUNAT para su validación.
              Los documentos deben estar en estado &quot;Pendiente&quot; para poder enviarse.
            </p>
          </div>
          <Link
            href="/crm/sunat/diagnostico"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Diagnóstico
          </Link>
        </div>
      </div>

      {/* Documentos Pendientes */}
      <div className="bg-accent-cream rounded-xl border border-ink-200 shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-heading font-semibold text-ink-800">Documentos Pendientes de Envío</h2>
            <span className="ml-2 px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              {documentosPendientes.length}
            </span>
          </div>
        </div>

        {documentosPendientes.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-ink-600 font-medium">No hay documentos pendientes</p>
            <p className="text-ink-400 text-sm mt-1">Todos los documentos han sido enviados a SUNAT</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {documentosPendientes.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-ink-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-ink-200">
                      <FileText className="w-5 h-5 text-accent-terracotta" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.tipo === 'boleta' ? 'bg-amber-100 text-amber-700' : doc.tipo === 'guia' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                          {doc.tipo === 'boleta' ? 'Boleta' : doc.tipo === 'guia' ? 'Guía' : 'Factura'}
                        </span>
                        <span className="font-mono font-medium text-ink-800">{doc.numeroCompleto}</span>
                        {getEstadoBadge(doc.estado)}
                      </div>
                      <p className="text-sm text-ink-600 mt-1">{doc.cliente.nombre}</p>
                      <p className="text-xs text-ink-400">
                        {doc.cliente.dni ? `DNI: ${doc.cliente.dni}` : doc.cliente.ruc ? `RUC: ${doc.cliente.ruc}` : 'Sin documento'}
                        {' • '}
                        {new Date(doc.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' '}
                        <span className="font-medium">{new Date(doc.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                      {doc.createdBy && userMap[doc.createdBy] && (
                        <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Generado por: {userMap[doc.createdBy]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {doc.tipo !== 'guia' && (
                        <>
                          <p className="font-heading font-bold text-accent-terracotta">
                            {formatearMoneda(doc.importeTotal, doc.moneda)}
                          </p>
                          <p className="text-xs text-ink-400">{doc.moneda === 'PEN' ? 'Soles' : 'Dólares'}</p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setVistaPrevia(doc)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                      title="Ver formato que se enviará a SUNAT"
                    >
                      <Eye className="w-4 h-4" />
                      Vista previa
                    </button>
                    <EnviarSunatMenu
                      doc={doc}
                      label="Enviar"
                      loading={procesando === doc.id}
                      abierto={menuEnviarAbierto === doc.id}
                      onAbrir={() => setMenuEnviarAbierto(doc.id)}
                      onCerrar={() => setMenuEnviarAbierto(null)}
                      onElegir={(ambiente) => handleElegirAmbiente(doc, ambiente, false)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentos Enviados */}
      <div className="bg-accent-cream rounded-xl border border-ink-200 shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="font-heading font-semibold text-ink-800">Historial de Envíos</h2>
            <span className="ml-2 px-2.5 py-0.5 bg-slate-200 text-ink-700 rounded-full text-xs font-medium">
              {documentosEnviados.length}
            </span>
          </div>
        </div>

        {documentosEnviados.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-ink-300 mx-auto mb-3" />
            <p className="text-ink-400">No hay documentos enviados aún</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {documentosEnviados.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-ink-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-ink-200">
                      <FileText className="w-5 h-5 text-accent-terracotta" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.tipo === 'boleta' ? 'bg-amber-100 text-amber-700' : doc.tipo === 'guia' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                          {doc.tipo === 'boleta' ? 'Boleta' : doc.tipo === 'guia' ? 'Guía' : 'Factura'}
                        </span>
                        <span className="font-mono font-medium text-ink-800">{doc.numeroCompleto}</span>
                        {getEstadoBadge(doc.estado)}
                      </div>
                      <p className="text-sm text-ink-600 mt-1">{doc.cliente.nombre}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' '}
                        <span className="font-medium">{new Date(doc.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                      {doc.createdBy && userMap[doc.createdBy] && (
                        <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Generado por: {userMap[doc.createdBy]}
                        </p>
                      )}
                      {doc.enviadoPor && userMap[doc.enviadoPor] && (
                        <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Enviado por: {userMap[doc.enviadoPor]}
                          {doc.enviadoAt && ` • ${new Date(doc.enviadoAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(doc.enviadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {doc.tipo !== 'guia' && (
                        <p className="font-heading font-bold text-accent-terracotta">
                          {formatearMoneda(doc.importeTotal, doc.moneda)}
                        </p>
                      )}
                    </div>

                    {doc.estado === 'enviado' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAprobar(doc)}
                          disabled={procesando === doc.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => setDocumentoRechazando(doc.id)}
                          disabled={procesando === doc.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Rechazar
                        </button>
                      </div>
                    )}

                    {doc.estado === 'rechazado' && (
                      <div className="flex gap-2">
                        <EnviarSunatMenu
                          doc={doc}
                          label="Re-enviar"
                          loading={procesando === doc.id}
                          abierto={menuEnviarAbierto === doc.id}
                          onAbrir={() => setMenuEnviarAbierto(doc.id)}
                          onCerrar={() => setMenuEnviarAbierto(null)}
                          onElegir={(ambiente) => handleElegirAmbiente(doc, ambiente, true)}
                        />
                        <button
                          onClick={() => setConfirmarEliminar(doc)}
                          disabled={eliminando === doc.id}
                          title="Eliminar documento rechazado"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Motivo de rechazo SUNAT */}
                {doc.estado === 'rechazado' && ((doc as any).cdr?.mensaje || (doc as any).errorSUNAT) && (
                  <div className="mt-3 ml-11 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-700 mb-0.5">Motivo del rechazo:</p>
                    <p className="text-xs text-red-600">{(doc as any).cdr?.mensaje || (doc as any).errorSUNAT || 'Error desconocido'}</p>
                  </div>
                )}

                {/* Formulario de rechazo */}
                {documentoRechazando === doc.id && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <label className="block text-sm font-medium text-red-700 mb-2">
                      Motivo del rechazo:
                    </label>
                    <textarea
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                      rows={2}
                      placeholder="Ingrese el motivo del rechazo..."
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleRechazar(doc)}
                        disabled={procesando === doc.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                      >
                        Confirmar Rechazo
                      </button>
                      <button
                        onClick={() => {
                          setDocumentoRechazando(null);
                          setMotivoRechazo('');
                        }}
                        className="px-4 py-2 border border-red-200 text-red-700 rounded-lg font-medium text-sm hover:bg-red-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-heading font-semibold text-slate-800 mb-3">Proceso de Envío a SUNAT</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mb-2">
              <span className="font-bold text-slate-600">1</span>
            </div>
            <h4 className="font-medium text-slate-800">Creación</h4>
            <p className="text-sm text-slate-500 mt-1">El empleado crea la boleta o factura</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mb-2">
              <span className="font-bold text-amber-600">2</span>
            </div>
            <h4 className="font-medium text-slate-800">Vista Previa</h4>
            <p className="text-sm text-slate-500 mt-1">Admin revisa el formato UBL/XML antes de enviar</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <span className="font-bold text-blue-600">3</span>
            </div>
            <h4 className="font-medium text-slate-800">Envío</h4>
            <p className="text-sm text-slate-500 mt-1">Admin envía a SUNAT y espera respuesta</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <span className="font-bold text-green-600">4</span>
            </div>
            <h4 className="font-medium text-slate-800">Aprobación</h4>
            <p className="text-sm text-slate-500 mt-1">SUNAT aprueba y se genera el CDR</p>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-elevated p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-ink-800">
                  ¿Eliminar {confirmarEliminar.tipo === 'guia' ? 'guía' : confirmarEliminar.tipo === 'boleta' ? 'boleta' : 'factura'} rechazada?
                </h3>
                <p className="text-sm text-ink-500 mt-1">
                  Esto eliminará permanentemente{' '}
                  <span className="font-medium text-ink-700">{confirmarEliminar.numeroCompleto}</span>
                  {' '}de la base de datos.
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  {confirmarEliminar.tipo === 'guia' 
                    ? 'Si SUNAT no tiene registro de esta guía, podrás volver a emitir con el mismo número creando una nueva guía.'
                    : 'Si SUNAT no tiene registro de este documento (fue rechazado antes de llegar a sus servidores), podrás volver a emitir con el mismo número creando un nuevo comprobante.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setConfirmarEliminar(null)}
                disabled={eliminando === confirmarEliminar.id}
                className="px-4 py-2 border border-ink-200 text-ink-700 rounded-xl font-medium hover:bg-ink-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmarEliminar)}
                disabled={eliminando === confirmarEliminar.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {eliminando === confirmarEliminar.id
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación — envío a SUNAT producción (irreversible, valor tributario real) */}
      {confirmarProduccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-elevated p-6 space-y-4 border-2 border-red-500">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-ink-800">Enviar a SUNAT — Producción</h3>
                <p className="text-sm text-ink-500 mt-1">
                  Vas a emitir <span className="font-medium text-ink-700">{confirmarProduccion.doc.numeroCompleto}</span>
                  {' '}({confirmarProduccion.doc.cliente.nombre}
                  {confirmarProduccion.doc.tipo !== 'guia' ? `, ${formatearMoneda(confirmarProduccion.doc.importeTotal, confirmarProduccion.doc.moneda)}` : ''})
                </p>
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                  Esto emite un comprobante real ante SUNAT. No se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setConfirmarProduccion(null)}
                className="px-4 py-2 border border-ink-200 text-ink-700 rounded-xl font-medium hover:bg-ink-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { doc, reenvio } = confirmarProduccion;
                  setConfirmarProduccion(null);
                  if (reenvio) handleReenviar(doc, 'produccion');
                  else handleEnviar(doc, 'produccion');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                Sí, emitir a SUNAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa */}
      {vistaPrevia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-elevated">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-ink-200">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-accent-terracotta" />
                <div>
                  <h3 className="font-heading font-semibold text-ink-800">
                    Resumen: {vistaPrevia.numeroCompleto}
                  </h3>
                  <p className="text-xs text-ink-500">
                    {vistaPrevia.tipo === 'boleta' ? 'Boleta de Venta' : vistaPrevia.tipo === 'guia' ? 'Guía de Remisión' : 'Factura'} — revisa antes de enviar a SUNAT
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setVistaPrevia(null); setMostrarXML(false); }}
                className="p-2 hover:bg-ink-100 rounded-lg text-ink-400 hover:text-ink-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {/* Emisor / Adquiriente */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-accent-cream rounded-xl border border-ink-200">
                    <h4 className="font-medium text-ink-700 mb-2">Emisor</h4>
                    <p className="text-sm text-ink-800 font-medium">{EMPRESA_DATA.razonSocial}</p>
                    <p className="text-xs text-ink-500">RUC: {EMPRESA_DATA.ruc}</p>
                  </div>
                  <div className="p-4 bg-accent-cream rounded-xl border border-ink-200">
                    <h4 className="font-medium text-ink-700 mb-2">Adquiriente</h4>
                    <p className="text-sm text-ink-800 font-medium">{vistaPrevia.cliente.nombre}</p>
                    <p className="text-xs text-ink-500">
                      {vistaPrevia.cliente.dni ? `DNI: ${vistaPrevia.cliente.dni}` : vistaPrevia.cliente.ruc ? `RUC: ${vistaPrevia.cliente.ruc}` : 'Sin documento'}
                    </p>
                  </div>
                </div>

                {/* Detalle del documento */}
                <div className="p-4 bg-accent-cream rounded-xl border border-ink-200">
                  <h4 className="font-medium text-ink-700 mb-3">Detalle del Documento</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-ink-500">Tipo:</span>
                      <p className="font-medium text-ink-800">{vistaPrevia.tipo === 'boleta' ? 'Boleta de Venta' : vistaPrevia.tipo === 'guia' ? 'Guía de Remisión' : 'Factura'}</p>
                    </div>
                    <div>
                      <span className="text-ink-500">Número:</span>
                      <p className="font-medium text-ink-800">{vistaPrevia.numeroCompleto}</p>
                    </div>
                    <div>
                      <span className="text-ink-500">Fecha:</span>
                      <p className="font-medium text-ink-800">
                        {new Date(vistaPrevia.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' '}
                        {new Date(vistaPrevia.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {vistaPrevia.tipo !== 'guia' && (
                      <>
                        <div>
                          <span className="text-ink-500">Moneda:</span>
                          <p className="font-medium text-ink-800">{vistaPrevia.moneda === 'PEN' ? 'Soles (PEN)' : 'Dólares (USD)'}</p>
                        </div>
                        <div>
                          <span className="text-ink-500">Total:</span>
                          <p className="font-medium text-accent-terracotta">{formatearMoneda(vistaPrevia.importeTotal, vistaPrevia.moneda)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-ink-500">Ítems:</span>
                      <p className="font-medium text-ink-800">{vistaPrevia.items?.length || 0}</p>
                    </div>
                    {vistaPrevia.createdBy && userMap[vistaPrevia.createdBy] && (
                      <div>
                        <span className="text-ink-500">Generado por:</span>
                        <p className="font-medium text-ink-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-ink-400" />
                          {userMap[vistaPrevia.createdBy]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de ítems */}
                {vistaPrevia.items && vistaPrevia.items.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-ink-200">
                    <table className="w-full text-sm">
                      <thead className="bg-ink-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-ink-600">N°</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-ink-600">Descripción</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-ink-600">Cant.</th>
                          {vistaPrevia.tipo !== 'guia' && (
                            <>
                              <th className="px-3 py-2 text-right text-xs font-medium text-ink-600">P. Unit.</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-ink-600">Total</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {vistaPrevia.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-ink-50/50">
                            <td className="px-3 py-2 text-ink-600">{idx + 1}</td>
                            <td className="px-3 py-2 text-ink-800">{item.descripcion}</td>
                            <td className="px-3 py-2 text-center text-ink-600">{item.cantidad}</td>
                            {vistaPrevia.tipo !== 'guia' && (
                              <>
                                <td className="px-3 py-2 text-right text-ink-600">{formatearMoneda(item.valorUnitario, vistaPrevia.moneda)}</td>
                                <td className="px-3 py-2 text-right font-medium text-ink-800">{formatearMoneda(item.importeTotal, vistaPrevia.moneda)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* XML técnico — colapsable, oculto por defecto */}
                <div className="border border-ink-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setMostrarXML(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-ink-50 hover:bg-ink-100 transition-colors text-xs text-ink-500"
                  >
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5" />
                      Ver XML técnico (UBL 2.1)
                    </span>
                    <span>{mostrarXML ? '▲' : '▼'}</span>
                  </button>
                  {mostrarXML && (
                    <div className="bg-slate-900 p-4 overflow-x-auto">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                        {generarXMLUBL(vistaPrevia)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-ink-200 bg-ink-50 rounded-b-2xl">
              <div className="flex items-center gap-2 text-sm text-ink-500">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Revise cuidadosamente antes de enviar a SUNAT</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setVistaPrevia(null)}
                  className="px-4 py-2 border border-ink-200 text-ink-700 rounded-lg font-medium hover:bg-ink-100 transition-colors"
                >
                  Cerrar
                </button>
                <EnviarSunatMenu
                  doc={vistaPrevia}
                  label="Enviar a SUNAT"
                  loading={procesando === vistaPrevia.id}
                  abierto={menuEnviarAbierto === vistaPrevia.id}
                  onAbrir={() => setMenuEnviarAbierto(vistaPrevia.id)}
                  onCerrar={() => setMenuEnviarAbierto(null)}
                  onElegir={(ambiente) => { setVistaPrevia(null); handleElegirAmbiente(vistaPrevia, ambiente, false); }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
