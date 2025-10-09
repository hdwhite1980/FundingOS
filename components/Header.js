'use client'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import Logo from './Logo'
import AccountSettingsModal from './AccountSettingsModal'
import { directUserServices } from '../lib/supabase'

export default function Header({ user, userProfile, onProfileUpdate }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = useSupabaseClient()

  // Fetch notifications on mount and poll every 30 seconds
  useEffect(() => {
    if (!user?.id) return

    const fetchNotifications = async () => {
      try {
        const data = await directUserServices.notifications.getNotifications(user.id, { limit: 10 })
        setNotifications(data)
        
        const count = await directUserServices.notifications.getUnreadCount(user.id)
        setUnreadCount(count)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    // Initial fetch
    fetchNotifications()

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)

    return () => clearInterval(interval)
  }, [user?.id])

  const handleMarkAsRead = async (notificationId) => {
    if (!user?.id) return

    try {
      const success = await directUserServices.notifications.markAsRead(user.id, notificationId)
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return

    try {
      const success = await directUserServices.notifications.markAllAsRead(user.id)
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now - past
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    return past.toLocaleDateString()
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'grant_match':
      case 'funding_opportunity':
        return 'emerald'
      case 'deadline_reminder':
        return 'amber'
      case 'status_update':
        return 'blue'
      default:
        return 'slate'
    }
  }

  const formatNotificationAmount = (metadata) => {
    if (!metadata) return null
    if (metadata.total_funding) {
      const amount = metadata.total_funding
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M+`
      } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)}K+`
      }
      return `$${amount}`
    }
    return null
  }

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
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">Stay updated with your funding opportunities</p>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const color = getNotificationColor(notif.type)
                        const amount = formatNotificationAmount(notif.metadata)
                        
                        return (
                          <div
                            key={notif.id}
                            onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            className={`flex items-start space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
                              notif.is_read ? 'bg-slate-50 hover:bg-slate-100' : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-2 h-2 bg-${color}-500 rounded-full mt-2 flex-shrink-0`}></div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium mb-1 ${
                                notif.is_read ? 'text-slate-600' : 'text-slate-900'
                              }`}>
                                {notif.title}
                              </p>
                              <p className="text-sm text-slate-600 mb-2">{notif.message}</p>
                              {amount && (
                                <p className={`text-sm font-bold text-${color}-600`}>{amount} total funding</p>
                              )}
                              {notif.metadata?.days_remaining && (
                                <p className={`text-sm font-bold text-${color}-600`}>
                                  Due in {notif.metadata.days_remaining} days
                                </p>
                              )}
                              <p className="text-xs text-slate-500 mt-2">{formatTimeAgo(notif.created_at)}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
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