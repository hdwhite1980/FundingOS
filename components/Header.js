'use client'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import Logo from './Logo'
import AccountSettingsModal from './AccountSettingsModal'

export default function Header({ user, userProfile, onProfileUpdate }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-600 rounded-lg">
                <Logo variant="light" size="sm" showText={false} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">WALI-OS</h1>
                <p className="text-xs text-slate-500">Powered by AHTS</p>
              </div>
            </div>
            
            {userProfile?.organization_name && (
              <div className="hidden md:block">
                <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md">
                  <span className="text-sm text-slate-700 font-medium">
                    {userProfile.organization_name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search opportunities, projects, grants..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Notifications</h3>
                    <p className="text-sm text-slate-600">Stay updated with your funding opportunities</p>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 mb-1">New grant matches found</p>
                        <p className="text-sm text-slate-600 mb-2">3 new opportunities match your projects</p>
                        <p className="text-sm font-bold text-emerald-600">$2.5M+ total funding</p>
                        <p className="text-xs text-slate-500 mt-2">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 mb-1">Application deadline reminder</p>
                        <p className="text-sm text-slate-600 mb-2">CDBG Community Development Grant</p>
                        <p className="text-sm font-bold text-amber-600">Due in 5 days</p>
                        <p className="text-xs text-slate-500 mt-2">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100">
                    <button className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors text-center py-2 hover:bg-emerald-50 rounded-md">
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button onClick={() => setShowAccountSettings(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {getInitials(userProfile?.full_name)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-medium text-slate-900">
                    {userProfile?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {user?.email}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-colors" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <p className="text-lg font-semibold text-slate-900 mb-1">
                      {userProfile?.full_name}
                    </p>
                    <p className="text-sm text-slate-600 mb-3">
                      {userProfile?.organization_name}
                    </p>
                    <div className="flex items-center">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium">
                        Premium Member
                      </span>
                    </div>
                  </div>

                  <div className="py-2">
                    <button onClick={() => { setShowAccountSettings(true); setShowUserMenu(false) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center">
                      <Settings className="w-4 h-4 mr-3" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
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

      {showAccountSettings && (
        <AccountSettingsModal
          user={user}
          userProfile={userProfile}
          onUpdated={(p) => onProfileUpdate && onProfileUpdate(p)}
          onClose={() => setShowAccountSettings(false)}
        />
      )}
    </header>
  )
}