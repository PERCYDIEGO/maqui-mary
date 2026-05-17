'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-2xl text-sm font-medium shadow-sm hover:shadow-md hover:border-gray-300 transition-all print:hidden"
    >
      🖨️ Imprimir / Guardar PDF
    </button>
  )
}
