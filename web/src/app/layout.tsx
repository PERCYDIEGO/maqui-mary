import type { Metadata } from 'next'
import { DM_Serif_Display, Lora, Nunito } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AppProvider } from '@/context/AppContext'
import ThemeApplier from '@/components/ThemeApplier'
import { Analytics } from '@vercel/analytics/next'

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
  preload: false,
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-heading',
  display: 'swap',
  preload: false,
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Esponjas de Limpieza en Lima | Maqui Mary — Fabricantes Peruanos',
  description: 'INVERSIONES MAQUI MARY PERU E.I.R.L. — Fabricantes peruanos de esponjas de limpieza, estropajos, paños absorbentes y lana de acero en Lurigancho, Lima. Venta al por mayor y menor. Delivery a todo Lima. Paga con Yape, Plin, transferencia, tarjeta o contraentrega. Consulta precios por WhatsApp +51 916 165 543.',
  keywords: ['esponjas de limpieza lima', 'fabricantes esponjas perú', 'esponjas doble uso', 'paños absorbentes', 'lana de acero', 'venta al por mayor lima', 'delivery esponjas lima', 'productos de limpieza', 'Maqui Mary'],
  authors: [{ name: 'INVERSIONES MAQUI MARY PERU E.I.R.L.' }],
  creator: 'Maqui Mary',
  publisher: 'Maqui Mary',
  metadataBase: new URL('https://maquimary.com.pe'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Esponjas de Limpieza en Lima | Maqui Mary — Fabricantes Peruanos',
    description: 'Fabricantes peruanos de esponjas de limpieza, estropajos y paños absorbentes en Lurigancho, Lima. Venta al por mayor y menor. Delivery a todo Lima.',
    url: 'https://maquimary.com.pe',
    siteName: 'Maqui Mary',
    locale: 'es_PE',
    type: 'website',
    images: [
      {
        url: 'https://maquimary.com.pe/img/logo_oficial.png',
        width: 1200,
        height: 630,
        alt: 'Maqui Mary - Esponjas de Limpieza en Lima',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esponjas de Limpieza en Lima | Maqui Mary',
    description: 'Fabricantes peruanos de esponjas de limpieza en Lurigancho, Lima. Venta al por mayor y menor.',
    images: ['https://maquimary.com.pe/img/logo_oficial.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code-here',
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🧽%3C/text%3E%3C/svg%3E",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-PE" className={`${dmSerifDisplay.variable} ${lora.variable} ${nunito.variable}`}>
      {/* Aplica el tema ANTES del primer paint para evitar flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('maqui-tema');
            if (t && t !== 'terracota') document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        ` }} />
        {/* Schema 1: LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Maqui Mary - Esponjas de Limpieza',
            image: 'https://maquimary.com.pe/img/logo_oficial.png',
            '@id': 'https://maquimary.com.pe',
            url: 'https://maquimary.com.pe',
            telephone: '+51916165543',
            priceRange: 'S/',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO',
              addressLocality: 'Lurigancho',
              addressRegion: 'Lima',
              postalCode: '150103',
              addressCountry: 'PE'
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: -11.989,
              longitude: -76.854
            },
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '08:00',
                closes: '18:00'
              }
            ],
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '5.0',
              reviewCount: '1'
            },
            sameAs: [
              'https://wa.me/51916165543'
            ]
          }) }}
        />
        {/* Schema 2: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'INVERSIONES MAQUI MARY PERU E.I.R.L.',
            url: 'https://maquimary.com.pe',
            logo: 'https://maquimary.com.pe/img/logo_oficial.png',
            sameAs: [
              'https://wa.me/51916165543'
            ]
          }) }}
        />
        {/* Schema 3: WebSite con SiteSearch */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Maqui Mary - Esponjas de Limpieza',
            url: 'https://maquimary.com.pe',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://maquimary.com.pe/?q={search_term_string}',
              'query-input': 'required name=search_term_string'
            }
          }) }}
        />
        {/* Schema 4: BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://maquimary.com.pe'
              }
            ]
          }) }}
        />
      </head>
      <body className="font-body antialiased">
        <AppProvider>
          <ThemeApplier />
          {children}
          <Analytics />
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: { 
                borderRadius: '12px', 
                padding: '12px 16px', 
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: 'white',
                },
              },
            }} 
          />
        </AppProvider>
      </body>
    </html>
  )
}
