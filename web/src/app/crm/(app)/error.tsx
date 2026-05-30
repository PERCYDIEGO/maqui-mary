'use client'

import { useEffect } from 'react'

export default function CRMError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl p-8 shadow-elevated max-w-sm w-full text-center border border-red-100">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Error inesperado</h2>
        <p className="text-gray-500 text-sm mb-6">
          Algo falló en esta sección. Intenta de nuevo o recarga la página.
        </p>
        <button
          onClick={reset}
          className="w-full bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-colors text-sm"
        >
          Intentar de nuevo
        </button>
        {error.digest && (
          <p className="mt-3 text-xs text-gray-400">Código: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
