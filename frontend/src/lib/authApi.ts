import { api } from './api'

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  lastLogin?: string
  joinedAt: string
}

export interface UserProfile extends User {
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    emailNotifications: boolean
    pushNotifications: boolean
  }
  alertSettings: {
    countries: string[]
    disasterTypes: string[]
    severityLevels: string[]
    emailDigest: boolean
    instantAlerts: boolean
  }
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    token: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface ProfileResponse {
  success: boolean
  data?: UserProfile
  error?: {
    code: string
    message: string
  }
}

// Auth token management
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token')
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem('auth_token', token)
  } catch {}
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem('auth_token')
  } catch {}
}

// User data management
export function getCurrentUser(): User | null {
  try {
    const userData = localStorage.getItem('current_user')
    return userData ? JSON.parse(userData) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user: User): void {
  try {
    localStorage.setItem('current_user', JSON.stringify(user))
  } catch {}
}

export function clearCurrentUser(): void {
  try {
    localStorage.removeItem('current_user')
  } catch {}
}

// API service with authentication
const createAuthenticatedApi = () => {
  const authApi = api.create()
  
  // Add auth token to requests
  authApi.interceptors.request.use((config) => {
    const token = getAuthToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })

  // Handle auth errors
  authApi.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        clearAuthToken()
        clearCurrentUser()
        window.location.href = '/auth/login'
      }
      return Promise.reject(error)
    }
  )

  return authApi
}

export const authApi = createAuthenticatedApi()

// Authentication API methods
export const authService = {
  // Register new user
  async register(data: {
    firstName: string
    lastName: string
    email: string
    password: string
  }): Promise<AuthResponse> {
    try {
      const response = await api.post('/api/auth/register', data)
      
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data
        setAuthToken(token)
        setCurrentUser(user)
      }
      
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'network_error',
          message: error.response?.data?.error?.message || 'Registration failed'
        }
      }
    }
  },

  // Login user
  async login(data: {
    email: string
    password: string
  }): Promise<AuthResponse> {
    try {
      const response = await api.post('/api/auth/login', data)
      
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data
        setAuthToken(token)
        setCurrentUser(user)
      }
      
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'network_error',
          message: error.response?.data?.error?.message || 'Login failed'
        }
      }
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await authApi.post('/api/auth/logout')
    } catch (error) {
      // Continue with logout even if API fails
      console.warn('Logout API failed:', error)
    } finally {
      clearAuthToken()
      clearCurrentUser()
    }
  },

  // Get user profile
  async getProfile(): Promise<ProfileResponse> {
    try {
      const response = await authApi.get('/api/user/profile')
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'network_error',
          message: error.response?.data?.error?.message || 'Failed to get profile'
        }
      }
    }
  },

  // Update user profile
  async updateProfile(data: {
    firstName?: string
    lastName?: string
    preferences?: Partial<UserProfile['preferences']>
    alertSettings?: Partial<UserProfile['alertSettings']>
  }): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      const response = await authApi.put('/api/user/profile', data)
      
      // Update local user data if basic info changed
      if (data.firstName || data.lastName) {
        const currentUser = getCurrentUser()
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            firstName: data.firstName || currentUser.firstName,
            lastName: data.lastName || currentUser.lastName
          }
          setCurrentUser(updatedUser)
        }
      }
      
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'network_error',
          message: error.response?.data?.error?.message || 'Failed to update profile'
        }
      }
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!(getAuthToken() && getCurrentUser())
  }
}