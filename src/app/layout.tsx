import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cantisa - Aprende a Cantar',
  description: 'Aplicacion para aprender a afinar cantando',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
