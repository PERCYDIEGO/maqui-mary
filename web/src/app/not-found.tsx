import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-5xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-gray-600 font-medium mb-1">Página no encontrada</p>
        <p className="text-gray-400 text-sm mb-6">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-block bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
