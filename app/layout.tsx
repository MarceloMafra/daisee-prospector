import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'DAISEE Prospector - AI Sales Lead Intelligence',
  description: 'Intelligent lead prospection and personalized cadencia generation',
  keywords: 'sales, leads, prospection, AI, cadencia, DAISEE',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
