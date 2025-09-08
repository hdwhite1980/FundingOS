'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Building2, ArrowRight, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import Logo from './Logo'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    organizationName: '',
    userRole: 'company'
  })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }

        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }

        console.log('AuthPage: Signing up user', formData.email)
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              organization_name: formData.organizationName,
              user_role: formData.userRole
            }
          }
        })

        if (error) throw error

        console.log('AuthPage: Sign up successful', data)
        // Bootstrap angel investor profile immediately (no need to wait for dashboard)
        if (formData.userRole === 'angel_investor' && data.user) {
          try {
            const userId = data.user.id
            // Create user_profile row if not yet created (race-safe upsert)
            await supabase.from('user_profiles').upsert({
              id: userId,
              email: formData.email,
              full_name: formData.fullName,
              organization_name: formData.organizationName,
              organization_type: 'startup',
              user_role: 'angel_investor',
              setup_completed: true, // Skip general onboarding
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })

            // Create angel_investors row with empty preferences (triggers angel onboarding)
            const { data: existingAngel } = await supabase
              .from('angel_investors')
              .select('id')
              .eq('user_id', userId)
              .single()

            if (!existingAngel) {
              await supabase.from('angel_investors').insert([{
                user_id: userId,
                name: formData.fullName || 'Angel Investor',
                email: formData.email,
                accredited_status: false,
                investment_preferences: {}, // Empty triggers onboarding
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
            }
            console.log('AuthPage: Angel investor bootstrap completed')
          } catch (bootErr) {
            console.warn('AuthPage: Angel investor bootstrap failed', bootErr)
          }
        }
        toast.success('Account created! Please check your email to verify your account.')
      } else {
        console.log('AuthPage: Signing in user', formData.email)
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })

        if (error) throw error
        console.log('AuthPage: Sign in successful')
        toast.success('Welcome back!')
      }
    } catch (error) {
      console.error('AuthPage: Auth error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const features = [
    'AI-powered opportunity matching',
    'Automated application drafting',
    'Progress tracking & deadlines',
    'Document management',
    'Success analytics'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-brand-50/30 to-gold-50/30 flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/95 via-brand-800/90 to-gold-900/95"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                <span className="text-white font-bold text-xl">W</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">WALI OS</h1>
                <p className="text-sm text-blue-100 font-medium">powered by AHTS</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-6">
              Unlock Your Funding Potential
            </h2>
            <p className="text-xl text-neutral-200 mb-8 leading-relaxed">
              The AI-powered financial platform that streamlines grant applications, 
              maximizes funding success, and accelerates your growth.
            </p>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="flex items-center text-neutral-200 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                >
                  <CheckCircle className="w-5 h-5 text-gold-400 mr-3 flex-shrink-0" />
                  <span className="font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mr-3">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">WALI OS</h1>
              <p className="text-xs text-blue-500 font-medium">powered by AHTS</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold text-neutral-900 mb-3">
              {isSignUp ? 'Start Your Funding Journey' : 'Welcome Back'}
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              {isSignUp 
                ? 'Join thousands of organizations securing funding with AI-powered insights'
                : 'Sign in to access your funding opportunities and continue growing'
              }
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {isSignUp && (
              <>
                <div>
                  <label className="form-label flex items-center">
                    <User className="inline w-4 h-4 mr-2 text-brand-600" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    className="form-input focus:ring-brand-500 focus:border-brand-500"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="form-label flex items-center">
                    <Building2 className="inline w-4 h-4 mr-2 text-brand-600" />
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    className="form-input focus:ring-brand-500 focus:border-brand-500"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    placeholder="Enter your organization name"
                    required
                  />
                </div>
                <div>
                  <label className="form-label flex items-center">Select Role</label>
                  <div className='grid grid-cols-3 gap-3 text-sm'>
                    {[
                      { value: 'angel_investor', label: 'Angel Investor' },
                      { value: 'company', label: 'Company' },
                      { value: 'grant_writer', label: 'Grant Writer' }
                    ].map(r => (
                      <button
                        type='button'
                        key={r.value}
                        onClick={()=>setFormData(f=>({...f,userRole:r.value}))}
                        className={`border-2 rounded-xl p-4 flex items-center justify-center hover:bg-brand-25 transition-all duration-200 font-semibold ${formData.userRole===r.value? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm':'border-neutral-300 text-neutral-600 hover:border-brand-300'}`}
                      >{r.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="form-label flex items-center">
                <Mail className="inline w-4 h-4 mr-2 text-brand-600" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                className="form-input focus:ring-brand-500 focus:border-brand-500"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="form-label flex items-center">
                <Lock className="inline w-4 h-4 mr-2 text-brand-600" />
                Password
              </label>
              <input
                type="password"
                name="password"
                className="form-input focus:ring-brand-500 focus:border-brand-500"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            {isSignUp && (
              <div>
                <label className="form-label flex items-center">
                  <Lock className="inline w-4 h-4 mr-2 text-brand-600" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input focus:ring-brand-500 focus:border-brand-500"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary btn-lg shadow-financial hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>

          <div className="text-center mt-8">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          {isSignUp && (
            <div className="mt-8 text-center">
              <p className="text-sm text-neutral-600 leading-relaxed">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-brand-600 hover:text-brand-700 font-medium">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-brand-600 hover:text-brand-700 font-medium">Privacy Policy</a>.
              </p>
            </div>
          )}

          {/* Trust Indicators */}
          <div className="mt-8 pt-8 border-t border-neutral-200">
            <p className="text-center text-sm text-neutral-500 mb-4">Trusted by leading organizations</p>
            <div className="flex items-center justify-center space-x-6 opacity-60">
              <div className="text-xs font-semibold text-neutral-400">NONPROFITS</div>
              <div className="w-1 h-1 bg-neutral-300 rounded-full"></div>
              <div className="text-xs font-semibold text-neutral-400">MUNICIPALITIES</div>
              <div className="w-1 h-1 bg-neutral-300 rounded-full"></div>
              <div className="text-xs font-semibold text-neutral-400">STARTUPS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}