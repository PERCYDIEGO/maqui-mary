import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  RefreshCcw,
  PackageCheck,
  MessageCircle,
  ShieldCheck,
  Banknote,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Phone,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Devoluciones | Maqui Mary',
  description:
    'Conoce nuestra política de devoluciones y cambios. INVERSIONES MAQUI MARY PERU E.I.R.L. — Esponjas y accesorios de limpieza en Lima, Perú.',
  alternates: {
    canonical: 'https://maquimary.com.pe/politica-devoluciones',
  },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'MerchantReturnPolicy',
  name: 'Política de Devoluciones Maqui Mary',
  url: 'https://maquimary.com.pe/politica-devoluciones',
  applicableCountry: 'PE',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
  refundType: 'https://schema.org/FullRefund',
}

const STATS = [
  { icon: Clock, value: '7 días', label: 'desde la recepción del producto' },
  { icon: MessageCircle, value: '48 h hábiles', label: 'para confirmar tu solicitud' },
  { icon: RefreshCcw, value: 'según método', label: 'Yape inmediato · transferencia 1–3 días' },
]

const STEPS = [
  {
    n: '1',
    title: 'Escríbenos por WhatsApp',
    body: null,
    link: { href: 'https://wa.me/51916165543?text=Hola,%20quiero%20consultar%20sobre%20una%20devolución', label: '+51 916 165 543' },
  },
  {
    n: '2',
    title: 'Confirmamos en 48 h hábiles',
    body: 'Revisamos tu caso y te avisamos. Tú eliges si prefieres el cambio del producto o el reembolso completo.',
    link: null,
  },
  {
    n: '3',
    title: 'Coordinamos el recojo',
    body: 'Recogemos sin costo en Lima Metropolitana. Fuera de Lima el costo de envío de retorno es asumido por el cliente (aprox. S/ 15–25 por courier).',
    link: null,
  },
  {
    n: '4',
    title: 'Cambio o reembolso',
    body: 'Verificado el producto, procesamos tu elección: cambio del producto o devolución del dinero por el mismo medio de pago en el plazo indicado.',
    link: null,
  },
]

const ACCEPTED = [
  'Producto con defecto de fabricación (puede estar abierto)',
  'Producto diferente al solicitado',
  'Producto sin usar y con empaque original (si no hay defecto)',
  'Con boleta o factura de compra (física o electrónica PDF)',
]

const NOT_ACCEPTED = [
  'Producto con daños causados por mal uso o almacenamiento',
  'Sin comprobante de compra',
  'Pedidos personalizados o de más de 200 unidades con especificación especial',
  'Solicitud después de los 7 días desde la recepción',
]

const REFUNDS = [
  { method: 'Yape / Plin', time: 'Inmediato al número registrado' },
  { method: 'Transferencia bancaria', time: '1 a 3 días hábiles' },
  { method: 'Contraentrega (efectivo)', time: 'El repartidor lleva el efectivo al momento del recojo' },
]

export default function PoliticaDevoluciones() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-ink-50 font-body">

        {/* HEADER */}
        <header className="bg-ink-900 border-b border-ink-800">
          <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
            <Link href="/" className="font-display text-lg text-white tracking-tight hover:text-accent-gold transition-colors">
              Maqui Mary
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white transition-colors">
              <ArrowLeft size={15} aria-hidden="true" />
              Volver al inicio
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section className="bg-ink-900 pb-14 pt-12 text-white">
          <div className="max-w-5xl mx-auto px-5">
            <div className="inline-flex items-center gap-2 bg-white/10 text-ink-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
              <ShieldCheck size={13} aria-hidden="true" />
              Devolución garantizada · Ley N.° 29571 Perú
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-white mb-3">
              Devoluciones y cambios
            </h1>
            <p className="text-ink-300 text-base max-w-xl leading-relaxed">
              Si algo salió mal con tu pedido, lo resolvemos. Tú eliges si prefieres el cambio o tu dinero de vuelta.
            </p>

            {/* STAT CARDS — responsive: 1 col mobile, 3 col sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 max-w-xl">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={value} className="bg-white/15 border border-white/10 rounded-xl p-4 text-center">
                  <Icon size={20} className="text-accent-gold mx-auto mb-2" aria-hidden="true" />
                  <p className="font-display text-xl text-white">{value}</p>
                  <p className="text-ink-300 text-xs mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* CTA temprano en hero */}
            <a
              href="https://wa.me/51916165543?text=Hola,%20quiero%20consultar%20sobre%20una%20devolución"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escribir por WhatsApp para consulta de devolución (abre en nueva pestaña)"
              className="inline-flex items-center gap-2 mt-8 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Iniciar mi devolución
            </a>
          </div>
        </section>

        <main className="max-w-5xl mx-auto px-5 py-12 space-y-10">

          {/* SÍ / NO APLICA */}
          <section className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={20} className="text-green-600" aria-hidden="true" />
                <h2 className="font-heading font-semibold text-ink-900">Sí aceptamos devolución</h2>
              </div>
              <ul className="space-y-2.5">
                {ACCEPTED.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                    <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <XCircle size={20} className="text-red-500" aria-hidden="true" />
                <h2 className="font-heading font-semibold text-ink-900">No aplica devolución</h2>
              </div>
              <ul className="space-y-2.5">
                {NOT_ACCEPTED.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                    <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* PROCESO */}
          <section className="bg-white rounded-2xl border border-ink-100 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PackageCheck size={20} className="text-accent-terracotta" aria-hidden="true" />
              <h2 className="font-heading font-semibold text-ink-900 text-lg">¿Cómo hago una devolución?</h2>
            </div>
            <div className="space-y-5">
              {STEPS.map((step, i) => (
                <div key={step.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-ink-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {step.n}
                    </div>
                    {i < STEPS.length - 1 && <div className="w-px flex-1 bg-ink-100 mt-2" aria-hidden="true" />}
                  </div>
                  <div className="pb-5">
                    <p className="font-medium text-ink-900 text-sm">{step.title}</p>
                    {step.body && <p className="text-ink-500 text-sm mt-0.5 leading-relaxed">{step.body}</p>}
                    {step.link && (
                      <p className="text-ink-500 text-sm mt-0.5">
                        Envíanos tu número de boleta o factura y el motivo al{' '}
                        <a
                          href={step.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${step.link.label} (abre WhatsApp en nueva pestaña)`}
                          className="text-green-600 font-medium underline hover:text-green-500"
                        >
                          {step.link.label}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* REEMBOLSOS */}
          <section className="bg-white rounded-2xl border border-ink-100 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Banknote size={20} className="text-accent-terracotta" aria-hidden="true" />
              <h2 className="font-heading font-semibold text-ink-900 text-lg">Reembolsos por medio de pago</h2>
            </div>
            <div className="divide-y divide-ink-50">
              {REFUNDS.map(({ method, time }) => (
                <div key={method} className="flex items-start justify-between py-3 gap-4">
                  <span className="text-sm font-medium text-ink-800 shrink-0">{method}</span>
                  <span className="text-sm text-ink-500 text-right">{time}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-400 mt-4">
              El reembolso se realiza por el mismo medio de pago utilizado en la compra. No se entrega efectivo para pagos realizados por transferencia o billeteras digitales.
            </p>
          </section>

          {/* AVISO LEGAL */}
          <section className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-amber-900">Marco legal</p>
              <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">
                Esta política se rige por la <strong>Ley N.° 29571 — Código de Protección y Defensa del Consumidor del Perú</strong>.
                Ante cualquier controversia no resuelta, puedes presentar un reclamo ante{' '}
                <a
                  href="https://www.indecopi.gob.pe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline hover:text-amber-900"
                >
                  INDECOPI
                </a>.
              </p>
            </div>
          </section>

          {/* CTA CONTACTO */}
          <section className="bg-ink-900 rounded-2xl p-7 md:p-10 text-center">
            <Phone size={28} className="text-accent-gold mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-display text-2xl text-white mb-2">¿Tienes alguna duda?</h2>
            <p className="text-ink-300 text-sm mb-6 max-w-sm mx-auto">
              Escríbenos por WhatsApp y te ayudamos en minutos. Respondemos en máximo 2 horas en horario de atención (L–S 8 am–6 pm).
            </p>
            <a
              href="https://wa.me/51916165543?text=Hola,%20quiero%20consultar%20sobre%20una%20devolución"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escribir por WhatsApp (abre en nueva pestaña)"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Escribir por WhatsApp
              <ChevronRight size={15} aria-hidden="true" />
            </a>
            <p className="text-ink-600 text-xs mt-4">
              INVERSIONES MAQUI MARY PERU E.I.R.L. · RUC 20606218801 · Lurigancho, Lima
            </p>
          </section>

        </main>

        <footer className="border-t border-ink-200 py-6 text-center text-xs text-ink-400">
          <p>
            &copy; {new Date().getFullYear()} Esponjas Maqui Mary Perú. Todos los derechos reservados.
            {' · '}
            <span className="text-ink-500">Última actualización: junio 2026</span>
          </p>
        </footer>
      </div>
    </>
  )
}
