import Logo from './Logo'

export default function LoadingSpinner({ size = 'lg', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="mb-8">
          <Logo variant="dark" size="xl" showText={true} className="justify-center" />
        </div>
        <div className={`animate-spin rounded-full border-4 border-neutral-200 border-t-brand-500 ${sizeClasses[size]} mx-auto`}></div>
        <p className="mt-6 text-neutral-600 font-medium text-lg">{text}</p>
      </div>
    </div>
  )
}