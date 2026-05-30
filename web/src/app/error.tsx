'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
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
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Algo salió mal</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Ocurrió un error inesperado. Si el problema persiste, contacta al administrador.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-colors text-sm"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            Ir al inicio
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-gray-400">Código: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
