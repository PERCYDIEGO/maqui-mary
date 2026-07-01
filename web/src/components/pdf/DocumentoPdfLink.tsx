'use client';

import dynamic from 'next/dynamic';
import { FileDown } from 'lucide-react';
import { Boleta, Factura, GuiaRemision } from '@/types/documentos';

// dynamic + ssr:false: html2canvas/jsPDF (dentro de PDFGenerator) crashean en SSR
const PDFGenerator = dynamic(() => import('./PDFGenerator'), { ssr: false });

interface DocumentoPdfLinkProps {
  documento: Boleta | Factura | GuiaRemision;
  tipo: 'boleta' | 'factura' | 'guia';
}

// Si el documento ya fue enviado y aceptado, APISUNAT.pe devuelve un PDF oficial con el
// QR en el formato exacto que exige SUNAT (RUC|tipo|serie|numero|igv|total|fecha|...).
// El PDF que arma esta app con html2canvas/jsPDF usa un QR propio (URL a maquimary.com.pe)
// que no sigue ese formato — por eso se prioriza el oficial cuando existe, y el propio
// queda solo como vista previa para documentos que todavía no se enviaron.
export default function DocumentoPdfLink({ documento, tipo }: DocumentoPdfLinkProps) {
  if (documento.pdfUrl) {
    return (
      <a
        href={documento.pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 hover:bg-ink-100 text-ink-500 hover:text-ink-700 rounded-lg transition-colors"
        title="Descargar PDF oficial SUNAT"
      >
        <FileDown className="w-4 h-4" />
      </a>
    );
  }

  return <PDFGenerator documento={documento} tipo={tipo} />;
}
