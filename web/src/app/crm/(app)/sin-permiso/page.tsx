import Link from 'next/link'

export const metadata = { title: 'Sin permiso — Maqui Mary CRM' }

export default function SinPermiso() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl p-8 shadow-elevated max-w-sm w-full text-center border border-amber-100">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Acceso restringido</h2>
        <p className="text-gray-500 text-sm mb-6">
          Esta sección es exclusiva para administradores. Si crees que deberías tener acceso, contacta al administrador del sistema.
        </p>
        <Link
          href="/crm"
          className="inline-block w-full bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-colors text-sm"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  )
}
