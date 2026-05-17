// ============================================
// GENERADOR DE PDFs SUNAT
// Formato oficial para Boletas, Facturas y Guías
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { Download, Printer, FileText } from 'lucide-react';
import { Boleta, Factura, GuiaRemision, DocumentoBase, EMPRESA_DATA } from '@/types/documentos';
import { formatearMoneda, formatearNumeroDocumento } from '@/lib/calculos';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

interface PDFGeneratorProps {
  documento: Boleta | Factura | GuiaRemision;
  tipo: 'boleta' | 'factura' | 'guia';
}

export default function PDFGenerator({ documento, tipo }: PDFGeneratorProps) {
  const [generando, setGenerando] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [empresaConfig, setEmpresaConfig] = useState<any>(null);

  useEffect(() => {
    supabase.from('sunat_config').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setEmpresaConfig(data) })
  }, []);

  // Generar QR cuando cambie el documento
  useEffect(() => {
    const generarQR = async () => {
      if (documento.qrCode) {
        try {
          const dataUrl = await QRCode.toDataURL(documento.qrCode, {
            width: 150,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          setQrDataUrl(dataUrl);
        } catch (error) {
          console.error('Error generando QR:', error);
        }
      }
    };
    generarQR();
  }, [documento]);

  const generarContenidoHTML = (): string => {
    const esBoleta = tipo === 'boleta';
    const esFactura = tipo === 'factura';
    const esGuia = tipo === 'guia';

    const doc = documento as any;
    const items = doc.items || [];
    const logoUrl = `${window.location.origin}/img/logo_oficial.png`;

    // Datos de empresa: prioriza sunat_config (editado en Configuración) sobre el fallback hardcodeado
    const empresa = {
      razonSocial: empresaConfig?.razon_social || EMPRESA_DATA.razonSocial,
      ruc:         empresaConfig?.ruc          || EMPRESA_DATA.ruc,
      direccion:   empresaConfig?.address      || EMPRESA_DATA.direccion,
      distrito:    empresaConfig?.distrito     || EMPRESA_DATA.distrito,
      provincia:   empresaConfig?.provincia    || EMPRESA_DATA.provincia,
      departamento:empresaConfig?.departamento || EMPRESA_DATA.departamento,
    };
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 11px; 
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .documento {
          max-width: 210mm;
          margin: 0 auto;
          border: 2px solid #333;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
          margin-bottom: 15px;
        }
        .empresa-info { flex: 1; }
        .empresa-info h1 {
          font-size: 16px;
          font-weight: bold;
          margin: 0 0 5px 0;
          color: #000;
        }
        .empresa-info p { margin: 2px 0; }
        .empresa-logo { width: 64px; height: 64px; object-fit: contain; margin-right: 12px; }
        .empresa-header { display: flex; align-items: center; }
        .documento-info {
          border: 1px solid #333;
          padding: 10px;
          text-align: center;
          min-width: 150px;
        }
        .documento-info h2 {
          font-size: 14px;
          margin: 0 0 5px 0;
          color: #6B21A8;
        }
        .documento-info .numero {
          font-size: 18px;
          font-weight: bold;
        }
        .section {
          border: 1px solid #999;
          padding: 10px;
          margin-bottom: 10px;
        }
        .section-title {
          font-weight: bold;
          background: #f5f5f5;
          padding: 5px;
          margin: -10px -10px 10px -10px;
          border-bottom: 1px solid #999;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #999;
          padding: 6px;
          text-align: left;
        }
        th {
          background: #f5f5f5;
          font-weight: bold;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totales {
          margin-top: 15px;
          border: 1px solid #999;
          padding: 10px;
        }
        .totales-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
        }
        .total-final {
          font-size: 14px;
          font-weight: bold;
          border-top: 2px solid #333;
          padding-top: 5px;
          margin-top: 5px;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 9px;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        .qr-section {
          margin-top: 15px;
          padding: 10px;
          border: 1px dashed #999;
          text-align: center;
        }
        .hash {
          font-family: monospace;
          font-size: 9px;
          word-break: break-all;
          background: #f9f9f9;
          padding: 5px;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="documento">
        <div class="header">
          <div class="empresa-info">
            <div class="empresa-header">
              <img src="${logoUrl}" alt="Maqui Mary" class="empresa-logo" />
              <div>
                <h1>${empresa.razonSocial}</h1>
                <p><strong>RUC:</strong> ${empresa.ruc}</p>
                <p>${empresa.direccion}</p>
                <p>${empresa.departamento} - ${empresa.provincia} - ${empresa.distrito}</p>
              </div>
            </div>
          </div>
          <div class="documento-info">
            <h2>${esBoleta ? 'BOLETA ELECTRÓNICA' : esFactura ? 'FACTURA ELECTRÓNICA' : 'GUÍA DE REMISIÓN'}</h2>
            <div class="numero">${doc.numeroCompleto}</div>
          </div>
        </div>
    `;

    // Sección cliente/destinatario
    if (esGuia) {
      html += `
        <div class="section">
          <div class="section-title">DATOS DEL DESTINATARIO</div>
          <p><strong>Nombre:</strong> ${doc.destinatarioNombre}</p>
          <p><strong>Documento:</strong> ${doc.destinatarioTipoDocumento === '1' ? 'DNI' : 'RUC'} - ${doc.destinatarioNumeroDocumento}</p>
        </div>
        
        <div class="section">
          <div class="section-title">DATOS DEL TRASLADO</div>
          <p><strong>Motivo:</strong> ${doc.motivoTraslado.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Fecha Inicio:</strong> ${new Date(doc.fechaInicioTraslado).toLocaleDateString('es-PE')}</p>
          <p><strong>Punto de Partida:</strong> ${doc.puntoPartida}</p>
          <p><strong>Punto de Llegada:</strong> ${doc.puntoLlegada}</p>
        </div>
        
        <div class="section">
          <div class="section-title">TRANSPORTISTA</div>
          <p><strong>Nombre:</strong> ${doc.transportista?.nombreCompleto || doc.conductorApellidos + ', ' + doc.conductorNombres}</p>
          <p><strong>DNI Conductor:</strong> ${doc.conductorDni}</p>
          <p><strong>Placa Vehículo:</strong> ${doc.vehiculoPlaca}</p>
        </div>
      `;
    } else {
      html += `
        <div class="section">
          <div class="section-title">DATOS DEL ${esBoleta ? 'CLIENTE' : 'ADQUIRIENTE'}</div>
          <p><strong>Nombre:</strong> ${doc.cliente?.nombre || 'CLIENTE GENERICO'}</p>
          ${doc.cliente?.dni ? `<p><strong>DNI:</strong> ${doc.cliente.dni}</p>` : ''}
          ${doc.cliente?.ruc ? `<p><strong>RUC:</strong> ${doc.cliente.ruc}</p>` : ''}
          ${doc.cliente?.direccion ? `<p><strong>Dirección:</strong> ${doc.cliente.direccion}</p>` : ''}
          ${esFactura ? `<p><strong>Forma de Pago:</strong> ${doc.formaPago === 'contado' ? 'Contado' : 'Crédito'}</p>` : ''}
        </div>
      `;
    }

    // Tabla de items
    html += `
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">N°</th>
              <th>Descripción</th>
              <th class="text-center" style="width: 60px;">Cant.</th>
              <th class="text-center" style="width: 80px;">Unidad</th>
              ${!esGuia ? `
              <th class="text-right" style="width: 80px;">P. Unit.</th>
              <th class="text-right" style="width: 80px;">Total</th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach((item: any, index: number) => {
      html += `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${item.descripcion}</td>
              <td class="text-center">${item.cantidad}</td>
              <td class="text-center">${item.unidadMedida}</td>
              ${!esGuia ? `
              <td class="text-right">${formatearMoneda(item.valorUnitario, doc.moneda)}</td>
              <td class="text-right">${formatearMoneda(item.importeTotal, doc.moneda)}</td>
              ` : ''}
            </tr>
      `;
    });

    html += `
          </tbody>
        </table>
    `;

    // Totales
    if (!esGuia) {
      html += `
        <div class="totales">
          <div class="totales-row">
            <span>Sub Total:</span>
            <span>${formatearMoneda(doc.subTotal || doc.operacionGravada, doc.moneda)}</span>
          </div>
          <div class="totales-row">
            <span>IGV (18%):</span>
            <span>${formatearMoneda(doc.igvTotal, doc.moneda)}</span>
          </div>
          ${doc.icbperTotal > 0 ? `
          <div class="totales-row">
            <span>ICBPER:</span>
            <span>${formatearMoneda(doc.icbperTotal, doc.moneda)}</span>
          </div>
          ` : ''}
          <div class="totales-row total-final">
            <span>TOTAL ${doc.moneda === 'PEN' ? 'S/' : 'US$'}:</span>
            <span>${formatearMoneda(doc.importeTotal, doc.moneda)}</span>
          </div>
          <div style="margin-top: 10px; font-size: 10px; font-style: italic;">
            ${doc.importeEnLetras}
          </div>
        </div>
      `;
    }

    // QR y Hash
    html += `
        <div class="qr-section">
          <p><strong>Representación impresa del documento electrónico</strong></p>
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" style="width: 150px; height: 150px; margin: 10px auto; display: block;" />` : ''}
          <p>Consulte su documento en: <strong>www.sunat.gob.pe</strong></p>
          <div class="hash">
            <strong>HASH:</strong> ${doc.hashCpe || doc.hashCPE || doc.hash_cpe || 'N/A'}
          </div>
          <p style="font-size: 9px; margin-top: 10px;">
            Este documento ha sido emitido mediante un sistema de facturación autorizado por SUNAT.
          </p>
        </div>
        
        <div class="footer">
          <img src="${logoUrl}" alt="Maqui Mary" style="width:32px;height:32px;object-fit:contain;margin-bottom:4px;" />
          <p>${empresa.razonSocial} - RUC ${empresa.ruc}</p>
          <p>Documento generado el ${new Date().toLocaleString('es-PE')}</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return html;
  };

  const descargarPDF = async () => {
    setGenerando(true);
    try {
      const html = generarContenidoHTML();
      const ventana = window.open('', '_blank');
      if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        setTimeout(() => {
          ventana.print();
        }, 500);
      }
      toast.success('PDF generado correctamente');
    } catch (error) {
      toast.error('Error al generar PDF');
    } finally {
      setGenerando(false);
    }
  };

  const imprimirDirecto = () => {
    const html = generarContenidoHTML();
    const ventana = window.open('', '_blank', 'width=800,height=600');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      ventana.focus();
      ventana.print();
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={descargarPDF}
        disabled={generando}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        {generando ? 'Generando...' : 'PDF'}
      </button>
      <button
        onClick={imprimirDirecto}
        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  );
}
