import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  User, Mail, Bell, Shield, Globe, Palette, 
  Save, Edit3, ArrowLeft, Settings, Check, 
  AlertTriangle, MapPin, Calendar, Activity 
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { authService, type UserProfile as ApiUserProfile } from '@/lib/authApi'

interface LocalUserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  role: string
  joinedAt: string
  lastLogin: string
  preferences: {
    emailNotifications: boolean
    pushNotifications: boolean
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    defaultView: string
  }
  alertSettings: {
    countries: string[]
    disasterTypes: string[]
    severityLevels: string[]
    emailDigest: boolean
    instantAlerts: boolean
  }
}

export function UserProfilePage() {
  const { preferences } = useAppStore()
  const [profile, setProfile] = useState<LocalUserProfile>({
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'user',
    joinedAt: '2024-01-15',
    lastLogin: '2025-09-26',
    preferences: {
      emailNotifications: true,
      pushNotifications: false,
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      defaultView: 'dashboard'
    },
    alertSettings: {
      countries: ['US', 'CA'],
      disasterTypes: ['earthquake', 'flood', 'wildfire'],
      severityLevels: ['RED', 'ORANGE'],
      emailDigest: true,
      instantAlerts: false
    }
  })
  
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'alerts' | 'security'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)

  // Load user profile from API
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setInitialLoading(true)
        const response = await authService.getProfile()
        if (response.success && response.data) {
          const userProfile = response.data
          setProfile({
            id: userProfile.id.toString(),
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            email: userProfile.email,
            role: 'user', // Default role since it's not in the API response
            joinedAt: userProfile.joinedAt,
            lastLogin: userProfile.lastLogin || new Date().toISOString(),
            preferences: {
              emailNotifications: userProfile.preferences.emailNotifications,
              pushNotifications: userProfile.preferences.pushNotifications,
              theme: userProfile.preferences.theme,
              language: userProfile.preferences.language,
              timezone: userProfile.preferences.timezone,
              defaultView: 'dashboard' // Default value
            },
            alertSettings: userProfile.alertSettings
          })
        } else {
          setMessage(response.error?.message || 'Failed to load profile')
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
        setMessage('Failed to load profile data')
      } finally {
        setInitialLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      setMessage('')
      
      const response = await authService.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        preferences: {
          theme: profile.preferences.theme,
          language: profile.preferences.language,
          timezone: profile.preferences.timezone,
          emailNotifications: profile.preferences.emailNotifications,
          pushNotifications: profile.preferences.pushNotifications
        },
        alertSettings: profile.alertSettings
      })
      
      if (response.success) {
        setMessage('Profile updated successfully!')
        setIsEditing(false)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(response.error?.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      setMessage('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  // Old mock data loading
  useEffect(() => {
    // TODO: Load actual user profile from API
    const loadProfile = async () => {
      try {
        // const profileData = await api.get('/api/user/profile')
        // setProfile(profileData.data)
      } catch (error) {
        console.error('Failed to load profile:', error)
      }
    }
    loadProfile()
  }, [])

  const handleSave = handleSaveProfile

  const handleInputChange = (field: string, value: any) => {
    setProfile((prev: LocalUserProfile) => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePreferenceChange = (field: string, value: any) => {
    setProfile((prev: LocalUserProfile) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value
      }
    }))
  }

  const handleAlertSettingChange = (field: string, value: any) => {
    setProfile((prev: LocalUserProfile) => ({
      ...prev,
      alertSettings: {
        ...prev.alertSettings,
        [field]: value
      }
    }))
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ] as const

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                User Profile
              </h1>
            </div>
            
            {message && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-600 dark:text-green-400">{message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            {/* Profile Summary Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <div className="text-center">
                <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  {profile.firstName} {profile.lastName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Joined {new Date(profile.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 mt-6 lg:mt-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              {/* Tab Content Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-slate-900 dark:text-white">
                    {tabs.find(tab => tab.id === activeTab)?.label}
                  </h2>
                  {activeTab === 'profile' && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profile.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-700/50 disabled:text-slate-500 dark:disabled:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profile.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-700/50 disabled:text-slate-500 dark:disabled:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          disabled={!isEditing}
                          className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-700/50 disabled:text-slate-500 dark:disabled:text-slate-400"
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-medium text-slate-900 dark:text-white mb-4">Display & Interface</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Theme
                          </label>
                          <select
                            value={profile.preferences.theme}
                            onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Language
                          </label>
                          <select
                            value={profile.preferences.language}
                            onChange={(e) => handlePreferenceChange('language', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <h3 className="text-base font-medium text-slate-900 dark:text-white mb-4">Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Email Notifications
                            </label>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Receive disaster alerts via email
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.preferences.emailNotifications}
                            onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Push Notifications
                            </label>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Receive instant browser notifications
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.preferences.pushNotifications}
                            onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Preferences
                      </button>
                    </div>
                  </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Custom Alert Settings
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Configure which disasters and regions you want to be notified about.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-medium text-slate-900 dark:text-white mb-4">Alert Delivery</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Email Digest
                            </label>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Daily summary of disaster events
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.alertSettings.emailDigest}
                            onChange={(e) => handleAlertSettingChange('emailDigest', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Instant Alerts
                            </label>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Immediate notifications for critical events
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.alertSettings.instantAlerts}
                            onChange={(e) => handleAlertSettingChange('instantAlerts', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <h3 className="text-base font-medium text-slate-900 dark:text-white mb-4">Filter Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Severity Levels
                          </label>
                          <div className="flex gap-2">
                            {['RED', 'ORANGE', 'GREEN'].map((level) => (
                              <label key={level} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={profile.alertSettings.severityLevels.includes(level)}
                                  onChange={(e) => {
                                    const levels = e.target.checked
                                      ? [...profile.alertSettings.severityLevels, level]
                                      : profile.alertSettings.severityLevels.filter(l => l !== level)
                                    handleAlertSettingChange('severityLevels', levels)
                                  }}
                                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
                                />
                                <span className={`text-sm px-2 py-1 rounded ${
                                  level === 'RED' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                  level === 'ORANGE' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                                  'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                }`}>
                                  {level}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Alert Settings
                      </button>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                            Account Security
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Keep your account secure by regularly updating your password and reviewing login activity.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-medium text-slate-900 dark:text-white mb-4">Password & Authentication</h3>
                      <div className="space-y-4">
                        <button className="w-full text-left p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-slate-900 dark:text-white">Change Password</h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password</p>
                            </div>
                            <ArrowLeft className="h-4 w-4 text-slate-400 rotate-180" />
                          </div>
                        </button>
                        
                        <button className="w-full text-left p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-slate-900 dark:text-white">Two-Factor Authentication</h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Add extra security to your account</p>
                            </div>
                            <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                              Not enabled
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <h3 className="text-base font-medium text-slate-900 dark:text-white mb-4">Account Activity</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <Activity className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-900 dark:text-white">Last login</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(profile.lastLogin).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}