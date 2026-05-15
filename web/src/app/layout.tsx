import type { Metadata } from 'next'
import { DM_Serif_Display, Lora, Nunito } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AppProvider } from '@/context/AppContext'

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Esponjas Maqui Mary Perú — Limpieza que Inspira Confianza',
  description: 'Fabricación y venta de esponjas de limpieza en Ate Vitarte, Lima. Esponjas de colores, acero y doble uso. Venta al por mayor y menor.',
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
      <body className="font-body antialiased">
        <AppProvider>
          {children}
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
