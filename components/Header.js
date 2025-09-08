'use client'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import Logo from './Logo'

export default function Header({ user, userProfile, onProfileUpdate }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const supabase = useSupabaseClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const getInitials = (name) => {
    if (!name) return user?.email?.[0]?.toUpperCase() || 'U'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="bg-white/90 backdrop-blur-lg border-b border-green-200/60 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Logo variant="dark" size="md" showText={true} />
            
            {userProfile?.organization_name && (
              <div className="hidden md:block">
                <div className="px-3 sm:px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-sm text-green-800 font-semibold">
                    {userProfile.organization_name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 sm:mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search opportunities, projects, grants..."
                className="w-full pl-12 pr-6 py-3 sm:py-3.5 bg-white border border-neutral-200 rounded-2xl placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 sm:p-3 text-neutral-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200 relative group"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 sm:top-2 right-1 sm:right-2 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-sm border-2 border-white"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-green-200 z-50 animate-scale-in overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-neutral-100 bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">Notifications</h3>
                    <p className="text-sm text-neutral-600">Stay updated with your funding opportunities</p>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4 max-h-80 overflow-y-auto">
                    <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-green-25 transition-colors cursor-pointer">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-neutral-900 font-semibold mb-1">New grant matches found</p>
                        <p className="text-sm text-neutral-600 mb-2">3 new opportunities match your projects</p>
                        <p className="text-sm text-emerald-600 font-bold">$2.5M+ total funding</p>
                        <p className="text-xs text-neutral-500 mt-2">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-emerald-25 transition-colors cursor-pointer">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-neutral-900 font-semibold mb-1">Application deadline reminder</p>
                        <p className="text-sm text-neutral-600 mb-2">CDBG Community Development Grant</p>
                        <p className="text-sm text-emerald-600 font-bold">Due in 5 days</p>
                        <p className="text-xs text-neutral-500 mt-2">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-neutral-100 bg-neutral-25">
                    <button className="w-full text-sm text-green-600 hover:text-green-700 font-bold transition-colors text-center py-2 hover:bg-green-50 rounded-lg">
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button className="p-2 sm:p-3 text-neutral-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 hover:bg-neutral-50 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {getInitials(userProfile?.full_name)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-bold text-neutral-900">
                    {userProfile?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {user?.email}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors ml-1" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-4 w-72 bg-white rounded-2xl shadow-xl border border-green-200 z-50 animate-scale-in overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-neutral-100 bg-gradient-to-r from-green-50 to-emerald-50">
                    <p className="text-base font-bold text-neutral-900 mb-1">
                      {userProfile?.full_name}
                    </p>
                    <p className="text-sm text-neutral-600 mb-3">
                      {userProfile?.organization_name}
                    </p>
                    <div className="flex items-center">
                      <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1.5 rounded-full font-bold border border-green-200">
                        Premium Member
                      </span>
                    </div>
                  </div>

                  <div className="py-3">
                    <button className="w-full text-left px-4 sm:px-6 py-3 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 flex items-center transition-colors">
                      <Settings className="w-5 h-5 mr-3" />
                      <span className="font-semibold">Account Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-neutral-100">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 sm:px-6 py-4 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors font-semibold"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside handlers */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false)
            setShowNotifications(false)
          }}
        ></div>
      )}
    </header>
  )
}