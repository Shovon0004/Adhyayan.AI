"use client"
import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import { apiService } from "./api"
import { useRouter } from "next/navigation"

interface CustomUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

interface AuthContextType {
  user: CustomUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (idToken: string, user: any) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  // Use a ref to track if we've already processed the initial auth state
  const hasProcessedInitialAuth = useRef(false)

  const login = async (idToken: string, userData: any) => {
    try {
      console.log("Attempting login with Firebase token...")
      const response = await apiService.authenticateWithGoogle(idToken, userData)

      console.log("Backend authentication response:", response)

      if (response.token) {
        console.log("Token received, storing in localStorage")
        localStorage.setItem("authToken", response.token)
        localStorage.setItem("user", JSON.stringify(response.user))

        setUser(userData)
        setIsAuthenticated(true)

        // Only redirect to dashboard if user is on the home page (fresh sign-in)
        if (typeof window !== "undefined" && window.location.pathname === "/") {
          router.push("/dashboard")
        }
      } else {
        throw new Error("No token received from backend")
      }
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Call backend logout first
      await apiService.logout()

      // Clear local state immediately to prevent UI flickering
      setUser(null)
      setIsAuthenticated(false)

      // Sign out of Firebase (this will trigger the auth state change)
      if (auth.currentUser) {
        await auth.signOut()
      }

      // Ensure local storage is cleared
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken")
        localStorage.removeItem("user")
      }
    } catch (error) {
      console.error("Logout failed:", error)
      // Even if backend logout fails, clear local state
      setUser(null)
      setIsAuthenticated(false)
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken")
        localStorage.removeItem("user")
      }
      if (auth.currentUser) {
        await auth.signOut()
      }
    }
  }

  useEffect(() => {
    let isComponentMounted = true

    // Check if user is already authenticated on page load
    const storedUser = apiService.getStoredUser()
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null

    if (storedUser && token) {
      setUser(storedUser)
      setIsAuthenticated(true)
      hasProcessedInitialAuth.current = true
    }

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isComponentMounted) return

      if (firebaseUser && !hasProcessedInitialAuth.current) {
        // User just signed in via Firebase for the first time, authenticate with backend
        try {
          const idToken = await firebaseUser.getIdToken()
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }

          // Call login function directly to avoid circular dependency
          const response = await apiService.authenticateWithGoogle(idToken, userData)
          setUser(userData)
          setIsAuthenticated(true)
          hasProcessedInitialAuth.current = true

          // Only redirect to dashboard if user is on the home page (fresh sign-in)
          if (typeof window !== "undefined" && window.location.pathname === "/") {
            router.push("/dashboard")
          }
        } catch (error) {
          console.error("Backend authentication failed:", error)
        }
      } else if (!firebaseUser && hasProcessedInitialAuth.current) {
        // User signed out of Firebase, clean up our auth state
        setUser(null)
        setIsAuthenticated(false)
        hasProcessedInitialAuth.current = false
        // Clear local storage
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken")
          localStorage.removeItem("user")
        }
      }

      if (isComponentMounted) {
        setLoading(false)
      }
    })

    return () => {
      isComponentMounted = false
      unsubscribe()
    }
  }, [router])

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
