// ============================================
// GENERADOR DE PDFs SUNAT - FORMATO OFICIAL
// Cumple con normativa SUNAT para representación impresa
// de comprobantes de pago electrónicos
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import { Boleta, Factura, GuiaRemision, EMPRESA_DATA, CATALOGO_MOTIVOS_TRASLADO } from '@/types/documentos';
import { formatearMoneda, numeroALetras } from '@/lib/calculos';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

interface PDFGeneratorProps {
  documento: Boleta | Factura | GuiaRemision;
  tipo: 'boleta' | 'factura' | 'guia';
}

// Títulos oficiales según SUNAT
const TITULOS_DOCUMENTO = {
  boleta: 'BOLETA DE VENTA ELECTRÓNICA',
  factura: 'FACTURA ELECTRÓNICA',
  guia: 'GUÍA DE REMISIÓN ELECTRÓNICA - REMITENTE',
} as const;

// Leyendas oficiales según SUNAT
const LEYENDAS_DOCUMENTO = {
  boleta: 'Representación impresa de la Boleta de Venta Electrónica',
  factura: 'Representación impresa de la Factura Electrónica',
  guia: 'Representación impresa de la Guía de Remisión Electrónica',
} as const;

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
            color: { dark: '#000000', light: '#ffffff' },
          });
          setQrDataUrl(dataUrl);
        } catch (error) {
          console.error('Error generando QR:', error);
        }
      }
    };
    generarQR();
  }, [documento]);

  const getEmpresaData = () => ({
    razonSocial: empresaConfig?.razon_social || EMPRESA_DATA.razonSocial,
    ruc: empresaConfig?.ruc || EMPRESA_DATA.ruc,
    direccion: empresaConfig?.address || EMPRESA_DATA.direccion,
    distrito: empresaConfig?.distrito || EMPRESA_DATA.distrito,
    provincia: empresaConfig?.provincia || EMPRESA_DATA.provincia,
    departamento: empresaConfig?.departamento || EMPRESA_DATA.departamento,
    telefono: empresaConfig?.telefono || EMPRESA_DATA.telefono,
  });

  const generarContenidoHTML = (): string => {
    const esBoleta = tipo === 'boleta';
    const esFactura = tipo === 'factura';
    const esGuia = tipo === 'guia';

    const doc = documento as any;
    const empresa = getEmpresaData();
    const logoUrl = `${window.location.origin}/img/logo_oficial.png`;
    const titulo = TITULOS_DOCUMENTO[tipo];
    const leyenda = LEYENDAS_DOCUMENTO[tipo];

    // Para guías usamos 'bienes', para boletas/facturas usamos 'items'
    const items = esGuia ? (doc.bienes || []) : (doc.items || []);

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Arial', 'Helvetica', sans-serif; 
          font-size: 10px; 
          line-height: 1.3;
          color: #000;
          background: #fff;
        }
        .documento {
          width: 180mm;
          margin: 0 auto;
          padding: 0;
        }
        /* HEADER */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1.5px solid #000;
        }
        .empresa-info { 
          flex: 1; 
          max-width: 65%;
        }
        .empresa-info h1 {
          font-size: 13px;
          font-weight: bold;
          margin: 0 0 3px 0;
          text-transform: uppercase;
        }
        .empresa-info p { 
          margin: 1px 0; 
          font-size: 9px;
        }
        .empresa-logo { 
          width: 48px; 
          height: 48px; 
          object-fit: contain; 
          margin-right: 8px;
          vertical-align: middle;
        }
        .empresa-header { 
          display: flex; 
          align-items: center; 
          margin-bottom: 4px;
        }
        .documento-cuadro {
          border: 1.5px solid #000;
          padding: 8px 12px;
          text-align: center;
          min-width: 140px;
          background: #fff;
        }
        .documento-cuadro h2 {
          font-size: 11px;
          font-weight: bold;
          margin: 0 0 3px 0;
          color: #000;
        }
        .documento-cuadro .ruc {
          font-size: 10px;
          margin: 2px 0;
        }
        .documento-cuadro .numero {
          font-size: 14px;
          font-weight: bold;
          color: #000;
        }
        /* SECCIONES */
        .section {
          border: 1px solid #000;
          padding: 6px 8px;
          margin-bottom: 6px;
        }
        .section-title {
          font-weight: bold;
          font-size: 10px;
          background: #f0f0f0;
          padding: 3px 6px;
          margin: -6px -8px 6px -8px;
          border-bottom: 1px solid #000;
          text-transform: uppercase;
        }
        .section-content p {
          margin: 2px 0;
          font-size: 9px;
        }
        .section-content .label {
          font-weight: bold;
        }
        /* GRID PARA DATOS */
        .datos-grid {
          display: flex;
          gap: 20px;
        }
        .datos-grid .col {
          flex: 1;
        }
        /* TABLA DE ITEMS */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          font-size: 9px;
        }
        th, td {
          border: 1px solid #000;
          padding: 4px 5px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: center;
          font-size: 9px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .col-num { width: 25px; text-align: center; }
        .col-cant { width: 45px; text-align: center; }
        .col-um { width: 50px; text-align: center; }
        .col-punit { width: 65px; text-align: right; }
        .col-total { width: 70px; text-align: right; }
        /* TOTALES */
        .totales-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }
        .totales-box {
          border: 1px solid #000;
          padding: 6px 10px;
          min-width: 280px;
        }
        .totales-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 9px;
        }
        .totales-row.total-final {
          font-size: 11px;
          font-weight: bold;
          border-top: 1px solid #000;
          padding-top: 4px;
          margin-top: 3px;
        }
        .importe-letras {
          margin-top: 6px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          border: 1px solid #000;
          padding: 4px 6px;
        }
        /* QR Y HASH */
        .footer-section {
          margin-top: 10px;
          border: 1px dashed #666;
          padding: 8px;
          text-align: center;
        }
        .footer-section .leyenda {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .qr-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 15px;
          margin-top: 6px;
        }
        .qr-info {
          text-align: left;
          font-size: 8px;
          max-width: 300px;
        }
        .qr-info p {
          margin: 2px 0;
        }
        .hash {
          font-family: 'Courier New', monospace;
          font-size: 8px;
          word-break: break-all;
          background: #f5f5f5;
          padding: 3px 5px;
          margin: 3px 0;
        }
        .sunat-leyenda {
          font-size: 8px;
          color: #333;
          margin-top: 6px;
          text-align: center;
        }
        .sunat-url {
          font-size: 9px;
          font-weight: bold;
        }
        /* GUÍA ESPECÍFICO */
        .guia-datos-traslado {
          display: flex;
          gap: 15px;
        }
        .guia-datos-traslado .col {
          flex: 1;
        }
        .transportista-info p {
          margin: 2px 0;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div class="documento">
        <!-- HEADER: Empresa + Cuadro de documento -->
        <div class="header">
          <div class="empresa-info">
            <div class="empresa-header">
              <img src="${logoUrl}" alt="Logo" class="empresa-logo" />
              <div>
                <h1>${empresa.razonSocial}</h1>
                <p><strong>RUC:</strong> ${empresa.ruc}</p>
                <p>${empresa.direccion}</p>
                <p>${empresa.departamento} - ${empresa.provincia} - ${empresa.distrito}</p>
                ${empresa.telefono ? `<p>Telf: ${empresa.telefono}</p>` : ''}
              </div>
            </div>
          </div>
          <div class="documento-cuadro">
            <h2>${titulo}</h2>
            <p class="ruc">RUC: ${empresa.ruc}</p>
            <div class="numero">${doc.numeroCompleto}</div>
            ${esGuia ? `
            <p style="font-size: 9px; margin-top: 4px; border-top: 1px solid #000; padding-top: 3px;">
              <strong>Fecha Emisión:</strong><br/>
              ${doc.fechaEmision ? new Date(doc.fechaEmision).toLocaleDateString('es-PE') + ' ' + new Date(doc.fechaEmision).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
            </p>
            ` : ''}
          </div>
        </div>
    `;

    // =====================================================
    // SECCIÓN: DATOS DEL CLIENTE / DESTINATARIO / ADQUIRENTE
    // =====================================================
    if (esGuia) {
      const guia = documento as GuiaRemision;
      const esRuc = guia.destinatarioDniRuc?.length === 11;
      const tipoDocDest = esRuc ? 'RUC' : 'DNI';
      const motivoLabel = CATALOGO_MOTIVOS_TRASLADO.find(m => m.value === guia.motivoTraslado)?.label || guia.motivoTraslado;
      
      html += `
        <!-- DESTINATARIO -->
        <div class="section">
          <div class="section-title">DESTINATARIO</div>
          <div class="section-content">
            <p><span class="label">Nombre/Razón Social:</span> ${guia.destinatarioNombre || 'N/A'}</p>
            <p><span class="label">${tipoDocDest}:</span> ${guia.destinatarioDniRuc || 'N/A'}</p>
          </div>
        </div>

        <!-- DATOS DEL TRASLADO -->
        <div class="section">
          <div class="section-title">DATOS DEL TRASLADO</div>
          <div class="guia-datos-traslado">
            <div class="col">
              <p><span class="label">Fecha de Inicio de Traslado:</span> ${guia.fechaInicioTraslado ? new Date(guia.fechaInicioTraslado).toLocaleDateString('es-PE') : 'N/A'}</p>
              ${guia.fechaEntregaTransportista ? `<p><span class="label">Fecha Entrega a Transportista:</span> ${new Date(guia.fechaEntregaTransportista).toLocaleDateString('es-PE')}</p>` : ''}
              <p><span class="label">Motivo de Traslado:</span> ${guia.motivoTraslado || 'N/A'} - ${motivoLabel}</p>
              <p><span class="label">Modalidad de Transporte:</span> ${guia.modalidadTraslado === 'publico' ? '01 - Transporte público' : '02 - Transporte privado'}</p>
            </div>
            <div class="col">
              <p><span class="label">Punto de Partida:</span> ${guia.puntoPartida || 'N/A'}</p>
              <p><span class="label">Punto de Llegada:</span> ${guia.puntoLlegada || 'N/A'}</p>
              <p><span class="label">Peso Bruto Total:</span> ${guia.pesoTotal || '0.00'} ${guia.unidadMedidaPeso || 'KG'}</p>
              ${guia.numeroBultos ? `<p><span class="label">N° de Bultos:</span> ${guia.numeroBultos}</p>` : ''}
              ${guia.transbordoProgramado ? '<p><span class="label">Transbordo:</span> Sí</p>' : ''}
              ${guia.retornoEnvasesVacios ? '<p><span class="label">Retorno de Envases:</span> Sí</p>' : ''}
            </div>
          </div>
        </div>
        
        ${guia.documentosRelacionados && guia.documentosRelacionados.length > 0 ? `
        <div class="section">
          <div class="section-title">DOCUMENTOS RELACIONADOS</div>
          <div class="section-content">
            ${guia.documentosRelacionados.map((doc: any) => `
              <p><span class="label">${doc.tipo === 'factura' ? 'Factura' : doc.tipo === 'boleta' ? 'Boleta' : 'Guía'}:</span> ${doc.serie || ''}-${doc.numero || doc.numeroCompleto || ''}</p>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- TRANSPORTISTA -->
        <div class="section">
          <div class="section-title">TRANSPORTISTA / CONDUCTOR</div>
          <div class="transportista-info">
            ${guia.modalidadTraslado === 'publico' && guia.transportista ? `
              <p><span class="label">Modalidad:</span> Transporte Público</p>
              <p><span class="label">Nombre/Razón Social:</span> ${guia.transportista.nombreCompleto || 'N/A'}</p>
              <p><span class="label">RUC:</span> ${guia.transportista.ruc || 'N/A'}</p>
              <p><span class="label">N° Registro MTC:</span> ${guia.transportista.numeroRegistroMTC || 'N/A'}</p>
            ` : guia.transportista ? `
              <p><span class="label">Modalidad:</span> Transporte Privado</p>
              <p><span class="label">Apellidos y Nombres:</span> ${guia.transportista.nombreCompleto || 'N/A'}</p>
              <p><span class="label">DNI:</span> ${guia.transportista.dni || 'N/A'}</p>
              <p><span class="label">Licencia de Conducir:</span> ${guia.transportista.licenciaConducir || 'N/A'}</p>
              <p><span class="label">N° Placa:</span> ${guia.transportista.numeroPlaca || 'N/A'}</p>
            ` : '<p>No se especificó transportista</p>'}
          </div>
        </div>
      `;
    } else {
      // FACTURA o BOLETA
      const cliente = doc.cliente;
      const esContado = doc.formaPago === 'contado';
      
      html += `
        <div class="section">
          <div class="section-title">${esFactura ? 'ADQUIRENTE' : 'CLIENTE'}</div>
          <div class="datos-grid">
            <div class="col">
              <p><span class="label">Nombre/Razón Social:</span> ${cliente?.razonSocial || cliente?.nombre || 'CLIENTE GENÉRICO'}</p>
              ${cliente?.ruc ? `<p><span class="label">RUC:</span> ${cliente.ruc}</p>` : ''}
              ${cliente?.dni ? `<p><span class="label">DNI:</span> ${cliente.dni}</p>` : ''}
              ${cliente?.direccion ? `<p><span class="label">Dirección:</span> ${cliente.direccion}</p>` : ''}
            </div>
            <div class="col">
              <p><span class="label">Fecha de Emisión:</span> ${new Date(doc.fechaEmision).toLocaleDateString('es-PE')}</p>
              ${doc.fechaVencimiento ? `<p><span class="label">Fecha de Vencimiento:</span> ${new Date(doc.fechaVencimiento).toLocaleDateString('es-PE')}</p>` : ''}
              <p><span class="label">Forma de Pago:</span> ${esContado ? 'Contado' : 'Crédito'}</p>
              ${doc.formaPagoSunat ? `<p><span class="label">Código SUNAT:</span> ${doc.formaPagoSunat}</p>` : ''}
              ${doc.tipoOperacion ? `<p><span class="label">Tipo de Operación:</span> ${doc.tipoOperacion}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    // =====================================================
    // TABLA DE ITEMS / BIENES
    // =====================================================
    if (esGuia) {
      // GUÍA: Solo descripción, cantidad, unidad (SIN PRECIOS)
      html += `
        <table>
          <thead>
            <tr>
              <th class="col-num">N°</th>
              <th>Descripción de los Bienes</th>
              <th class="col-cant">Cantidad</th>
              <th class="col-um">Unidad</th>
            </tr>
          </thead>
          <tbody>
        `;
      
      items.forEach((item: any, index: number) => {
        html += `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${item.descripcion || item.detalle || 'N/A'}</td>
              <td class="text-center">${item.cantidad || 0}</td>
              <td class="text-center">${item.unidadMedida || 'UNIDAD'}</td>
            </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
        `;
    } else {
      // FACTURA / BOLETA: Tabla completa con precios
      html += `
        <table>
          <thead>
            <tr>
              <th class="col-num">N°</th>
              <th>Descripción</th>
              <th class="col-cant">Cant.</th>
              <th class="col-um">Unidad</th>
              <th class="col-punit">V. Unit.</th>
              <th class="col-punit">Desc.</th>
              <th class="col-punit">V. Venta</th>
              <th class="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
        `;
      
      items.forEach((item: any, index: number) => {
        html += `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${item.descripcion || 'N/A'}</td>
              <td class="text-center">${item.cantidad || 0}</td>
              <td class="text-center">${item.unidadMedida || 'UNIDAD'}</td>
              <td class="text-right">${formatearMoneda(item.valorUnitario || 0, doc.moneda)}</td>
              <td class="text-right">${formatearMoneda(item.descuento || 0, doc.moneda)}</td>
              <td class="text-right">${formatearMoneda(item.valorVenta || 0, doc.moneda)}</td>
              <td class="text-right">${formatearMoneda(item.importeTotal || 0, doc.moneda)}</td>
            </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
        `;
    }

    // =====================================================
    // TOTALES (solo para Factura y Boleta)
    // =====================================================
    if (!esGuia) {
      html += `
        <div class="totales-container">
          <div class="totales-box">
            ${doc.operacionGravada > 0 ? `
            <div class="totales-row">
              <span>Op. Gravada:</span>
              <span>${formatearMoneda(doc.operacionGravada || doc.subTotal || 0, doc.moneda)}</span>
            </div>` : ''}
            ${doc.operacionExonerada > 0 ? `
            <div class="totales-row">
              <span>Op. Exonerada:</span>
              <span>${formatearMoneda(doc.operacionExonerada, doc.moneda)}</span>
            </div>` : ''}
            ${doc.operacionInafecta > 0 ? `
            <div class="totales-row">
              <span>Op. Inafecta:</span>
              <span>${formatearMoneda(doc.operacionInafecta, doc.moneda)}</span>
            </div>` : ''}
            ${doc.descuentoTotal > 0 ? `
            <div class="totales-row">
              <span>Descuento Total:</span>
              <span>${formatearMoneda(doc.descuentoTotal, doc.moneda)}</span>
            </div>` : ''}
            <div class="totales-row">
              <span>IGV (18%):</span>
              <span>${formatearMoneda(doc.igvTotal || 0, doc.moneda)}</span>
            </div>
            ${doc.icbperTotal > 0 ? `
            <div class="totales-row">
              <span>ICBPER:</span>
              <span>${formatearMoneda(doc.icbperTotal, doc.moneda)}</span>
            </div>` : ''}
            ${doc.otrosCargos > 0 ? `
            <div class="totales-row">
              <span>Otros Cargos:</span>
              <span>${formatearMoneda(doc.otrosCargos, doc.moneda)}</span>
            </div>` : ''}
            <div class="totales-row total-final">
              <span>IMPORTE TOTAL:</span>
              <span>${formatearMoneda(doc.importeTotal || 0, doc.moneda)}</span>
            </div>
          </div>
        </div>
        
        <div class="importe-letras">
          SON: ${doc.importeEnLetras || numeroALetras(doc.importeTotal || 0, doc.moneda === 'USD' ? 'DOLARES' : 'SOLES')}
        </div>
      `;
    } else {
      // Para guías: mostrar solo peso total
      const guia = documento as GuiaRemision;
      html += `
        <div style="margin-top: 8px; text-align: right; font-size: 10px; font-weight: bold;">
          PESO BRUTO TOTAL: ${guia.pesoTotal || 0} KG
        </div>
      `;
    }

    // =====================================================
    // QR, HASH Y LEYENDAS (para todos)
    // =====================================================
    html += `
        <div class="footer-section">
          <div class="leyenda">${leyenda}</div>
          <div class="qr-container">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR SUNAT" style="width: 100px; height: 100px;" />` : '<div style="width:100px;height:100px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:8px;">QR<br>No generado</div>'}
            <div class="qr-info">
              <p><strong>Emisor:</strong> ${empresa.razonSocial}</p>
              <p><strong>RUC:</strong> ${empresa.ruc}</p>
              <p><strong>Documento:</strong> ${doc.numeroCompleto}</p>
              <p class="sunat-url">Consulte su documento en: <strong>www.sunat.gob.pe</strong></p>
              <p>Valide su documento utilizando el Código QR o el Hash</p>
              <div class="hash">
                <strong>HASH:</strong> ${doc.hashCpe || doc.hashCPE || doc.hash_cpe || 'N/A'}
              </div>
            </div>
          </div>
          <p class="sunat-leyenda">
            Este documento ha sido emitido mediante un sistema de facturación autorizado por SUNAT.<br/>
            Resolución de Intendencia N° 017-005-0001945/SUNAT
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 8px; font-size: 8px; color: #666;">
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
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.background = 'white';
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        height: container.scrollHeight,
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = 210;
      const pdfH = 297;
      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pdfH;
      while (heightLeft > 0) {
        position -= pdfH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
        heightLeft -= pdfH;
      }

      const nombre = `${documento.numeroCompleto || 'documento'}.pdf`;
      pdf.save(nombre);
      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setGenerando(false);
    }
  };

  const imprimirDirecto = () => {
    const html = generarContenidoHTML();
    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      ventana.focus();
      setTimeout(() => {
        ventana.print();
      }, 500);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={descargarPDF}
        disabled={generando}
        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
      >
        <Download className="w-4 h-4" />
        {generando ? 'Generando...' : 'PDF'}
      </button>
      <button
        onClick={imprimirDirecto}
        className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors text-sm"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  );
}
