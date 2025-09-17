import { Inter } from 'next/font/google'
import ClientProviders from './ClientProviders'
import './globals.css'
import ErrorBoundary from '../components/ErrorBoundary'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'WALI-OS · Powered by AHTS',
  description: 'WALI-OS · Powered by AHTS',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  }
  return (
    <html lang="en">
      <body className={`${inter.className} font-sans antialiased bg-slate-50`}>
        <Script id="public-env" strategy="beforeInteractive">
          {`window.__PUBLIC_ENV__ = ${JSON.stringify(publicEnv)};`}
        </Script>
        <ClientProviders>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ClientProviders>
      </body>
    </html>
  )
}