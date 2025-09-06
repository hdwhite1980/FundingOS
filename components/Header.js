'use client'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

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
    <header className="glass backdrop-blur-financial border-b border-neutral-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">WALI OS</h1>
                <p className="text-xs bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent font-medium -mt-0.5">powered by AHTS</p>
              </div>
            </div>
            
            {userProfile?.organization_name && (
              <div className="hidden md:block">
                <div className="px-3 py-1.5 bg-neutral-100 rounded-lg">
                  <span className="text-sm text-neutral-700 font-medium">
                    {userProfile.organization_name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search opportunities, projects, grants..."
                className="w-full pl-12 pr-4 py-3 bg-white/80 border border-neutral-200 rounded-2xl placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-brand-300 transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-neutral-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all duration-200 relative group"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gold-500 rounded-full animate-pulse shadow-gold"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-premium border border-neutral-200 z-50 animate-scale-in overflow-hidden">
                  <div className="p-4 border-b border-neutral-100 bg-gradient-to-r from-brand-50 to-gold-50">
                    <h3 className="font-semibold text-neutral-900">Notifications</h3>
                    <p className="text-xs text-neutral-600 mt-1">Stay updated with your funding opportunities</p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-start space-x-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                      <div className="w-2 h-2 bg-brand-500 rounded-full mt-2 animate-pulse"></div>
                      <div className="flex-1">
                        <p className="text-sm text-neutral-900 font-medium">New grant matches found</p>
                        <p className="text-xs text-neutral-600 mt-1">3 new opportunities match your projects</p>
                        <p className="text-xs text-gold-600 font-medium mt-1">$2.5M+ total funding</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                      <div className="w-2 h-2 bg-gold-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-neutral-900 font-medium">Application deadline reminder</p>
                        <p className="text-xs text-neutral-600 mt-1">CDBG Community Development Grant</p>
                        <p className="text-xs text-gold-600 font-medium mt-1">Due in 5 days</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-neutral-100 bg-neutral-50">
                    <button className="text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button className="p-2.5 text-neutral-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all duration-200">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 hover:bg-neutral-50 rounded-xl transition-all duration-200 group"
              >
                <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  {getInitials(userProfile?.full_name)}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-neutral-900">
                    {userProfile?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {user?.email}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-premium border border-neutral-200 z-50 animate-scale-in overflow-hidden">
                  <div className="p-4 border-b border-neutral-100 bg-gradient-to-r from-brand-50 to-gold-50">
                    <p className="text-sm font-semibold text-neutral-900">
                      {userProfile?.full_name}
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      {userProfile?.organization_name}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        Premium Member
                      </span>
                    </div>
                  </div>

                  <div className="py-2">
                    <button className="w-full text-left px-4 py-3 text-sm text-neutral-700 hover:bg-brand-50 hover:text-brand-700 flex items-center transition-colors">
                      <Settings className="w-4 h-4 mr-3" />
                      Account Settings
                    </button>
                  </div>

                  <div className="border-t border-neutral-100">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
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