import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'

export default function LoadingSpinner({ size = 'lg', text = 'Loading...', variant = 'page' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  // Inline spinner for use within components
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className={`${sizeClasses[size]} text-emerald-600 animate-spin`} />
        {text && (
          <span className={`ml-3 ${textSizeClasses[size]} font-medium text-slate-700`}>
            {text}
          </span>
        )}
      </div>
    )
  }

  // Card spinner for use within cards/containers
  if (variant === 'card') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="p-3 bg-emerald-50 rounded-full mb-4">
          <Loader2 className={`${sizeClasses[size]} text-emerald-600 animate-spin`} />
        </div>
        <p className={`${textSizeClasses[size]} font-medium text-slate-700`}>{text}</p>
      </div>
    )
  }

  // Full page loading spinner (default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center p-8"
      >
        {/* Logo/Brand Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-emerald-600 rounded-xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Your Platform</h1>
          <p className="text-slate-600 mt-1">Intelligent funding solutions</p>
        </motion.div>

        {/* Loading Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative">
            {/* Outer ring */}
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-slate-200 animate-pulse"></div>
            
            {/* Spinning ring */}
            <div className="absolute inset-0 w-16 h-16 mx-auto">
              <div className="w-full h-full rounded-full border-4 border-transparent border-t-emerald-600 border-r-emerald-600 animate-spin"></div>
            </div>
            
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <p className="text-lg font-semibold text-slate-900 mb-2">{text}</p>
          <p className="text-sm text-slate-500">Please wait while we prepare your dashboard</p>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 w-48 mx-auto"
        >
          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
              animate={{ 
                x: ['-100%', '100%'],
                opacity: [0.5, 1, 0.5] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ width: '50%' }}
            />
          </div>
        </motion.div>

        {/* Loading States */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-6 flex items-center justify-center space-x-6 text-xs text-slate-400"
        >
          <div className="flex items-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            Initializing
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-slate-300 rounded-full mr-2 animate-pulse"></div>
            Loading data
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-slate-300 rounded-full mr-2"></div>
            Preparing UI
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}