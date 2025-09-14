'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { AuthProvider } from '../contexts/AuthContext'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import EnhancedUnifiedAIAgentInterface from '../components/EnhancedUnifiedAIAgentInterface'
import './globals.css'

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [supabaseClient] = useState(() => createClientComponentClient())

  return (
    <html lang="en">
      <head>
        <title>WALI-OS · Powered by AHTS</title>
        <meta name="description" content="WALI-OS · Powered by AHTS" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-slate-50">
        <SessionContextProvider supabaseClient={supabaseClient}>
          <AuthProvider>
            {children}
            <EnhancedUnifiedAIAgentInterface />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                success: {
                  style: {
                    background: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                  },
                  iconTheme: {
                    primary: '#059669',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  style: {
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                  },
                  iconTheme: {
                    primary: '#dc2626',
                    secondary: '#ffffff',
                  },
                },
                loading: {
                  style: {
                    background: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                  },
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#ffffff',
                  },
                },
              }}
            />
          </AuthProvider>
        </SessionContextProvider>
      </body>
    </html>
  )
}