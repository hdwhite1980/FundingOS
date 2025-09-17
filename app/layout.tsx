import { Inter } from 'next/font/google'
import ClientProviders from './ClientProviders'
import './globals.css'
import ErrorBoundary from '../components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'WALI-OS · Powered by AHTS',
  description: 'WALI-OS · Powered by AHTS',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-sans antialiased bg-slate-50`}>
        <ClientProviders>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ClientProviders>
      </body>
    </html>
  )
}