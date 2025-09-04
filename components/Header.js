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
    <header className="glass border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <h1 className="text-xl font-bold gradient-text">FundingOS</h1>
            </div>
            
            {userProfile?.organization_name && (
              <div className="hidden md:block">
                <span className="text-sm text-slate-500 font-medium">
                  {userProfile.organization_name}
                </span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search opportunities, projects..."
                className="w-full pl-10 pr-4 py-2 bg-white/60 border border-white/40 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all duration-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg transition-all duration-200 relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-scale-in">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-slate-900 font-medium">New opportunity matches</p>
                        <p className="text-xs text-slate-600">3 new grants found for your projects</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-slate-900 font-medium">Deadline reminder</p>
                        <p className="text-xs text-slate-600">CDBG application due in 5 days</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100">
                    <button className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg transition-all duration-200">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 hover:bg-white/60 rounded-lg transition-all duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {getInitials(userProfile?.full_name)}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-slate-900">
                    {userProfile?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {user?.email}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-scale-in">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">
                      {userProfile?.full_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {userProfile?.organization_name}
                    </p>
                  </div>

                  <div className="py-2">
                    <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center">
                      <Settings className="w-4 h-4 mr-3" />
                      Account Settings
                    </button>
                  </div>

                  <div className="border-t border-slate-100">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
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