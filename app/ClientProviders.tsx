'use client'
import { createClient } from '@supabase/supabase-js'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { AuthProvider } from '../contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { Toaster } from 'react-hot-toast'

interface ClientProvidersProps {
  children: React.ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  const cfg = useMemo(() => {
    const pe = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
    const we = typeof window !== 'undefined' && (window as any).__PUBLIC_ENV__
      ? {
          url: (window as any).__PUBLIC_ENV__.NEXT_PUBLIC_SUPABASE_URL,
          key: (window as any).__PUBLIC_ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }
      : { url: undefined, key: undefined }
    const url = (pe.url || we.url || '').toString()
    const key = (pe.key || we.key || '').toString()
    return { url, key }
  }, [])

  const [supabaseClient, setSupabaseClient] = useState<any>(null)

  useEffect(() => {
    if (!supabaseClient) {
      if (!cfg.url || !cfg.key) {
        console.error('Supabase public env missing in browser (url or key).')
        return
      }
      const client = createClient(cfg.url, cfg.key, {
        auth: { 
          autoRefreshToken: true, 
          persistSession: true, 
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: 'supabase.auth.token',
          flowType: 'pkce'
        },
        global: {
          headers: {
            'X-Client-Info': 'funding-os-web'
          }
        }
      })
      setSupabaseClient(client)
    }
  }, [cfg.url, cfg.key, supabaseClient])

  if (!supabaseClient) {
    return null
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <AuthProvider>
        {children}
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
  )
}