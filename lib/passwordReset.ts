import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

export function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export async function storeResetCode(userId: string, code: string, ttlMinutes = 10) {
  const expires_at = new Date(Date.now() + ttlMinutes * 60000).toISOString()
  const { error } = await admin.from('password_reset_codes').insert({
    user_id: userId,
    code_hash: hashCode(code),
    expires_at
  })
  if (error) throw error
  return { expires_at }
}

export async function findUserByEmail(email: string) {
  // Supabase admin API currently requires scanning pages; we attempt first page only for simplicity.
  const { data, error } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  const lower = email.toLowerCase()
  const user = data?.users?.find((u: any) => u.email?.toLowerCase() === lower)
  return user || null
}

export async function verifyCode(userId: string, code: string) {
  const h = hashCode(code)
  const { data, error } = await admin
    .from('password_reset_codes')
    .select('*')
    .eq('user_id', userId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw error
  const match = data?.find(r => r.code_hash === h)
  return !!match
}

export async function consumeCode(userId: string, code: string) {
  const h = hashCode(code)
  const { data, error } = await admin
    .from('password_reset_codes')
    .select('id, code_hash')
    .eq('user_id', userId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
  if (error) throw error
  const row = data?.find(r => r.code_hash === h)
  if (!row) return false
  const { error: updErr } = await admin
    .from('password_reset_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)
  if (updErr) throw updErr
  return true
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const { data, error } = await (admin as any).auth.admin.updateUserById(userId, { password: newPassword })
  if (error) throw error
  return data
}

// Placeholder: integrate actual email service later
export async function sendResetEmail(email: string, code: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEV] Password reset code for', email, code)
  }
  // TODO integrate with real provider (Resend, Postmark, etc.)
  return { sent: true }
}
