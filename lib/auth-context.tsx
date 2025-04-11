"use client"

declare global {
  interface Window {
    ethereum?: any;
  }
}

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getWalletAddress, isRegisteredInstitution } from "@/lib/contract"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  isLoggedIn: boolean
  institutionId: string | null
  institutionName: string | null
  walletAddress: string | null
  loading: boolean
  login: () => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  institutionId: null,
  institutionName: null,
  walletAddress: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [institutionName, setInstitutionName] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    checkLoginStatus()
  }, [])

  const checkLoginStatus = async () => {
    try {
      setLoading(true)

      // Check if we have a stored wallet address in localStorage
      const storedWalletAddress = localStorage.getItem("walletAddress")

      if (!storedWalletAddress) {
        setIsLoggedIn(false)
        setLoading(false)
        return
      }

      // Verify the wallet is connected and matches the stored address
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const currentAddress = await getWalletAddress()

          // If the addresses don't match, logout
          if (currentAddress.toLowerCase() !== storedWalletAddress.toLowerCase()) {
            await logout()
            return
          }

          setWalletAddress(currentAddress)

          // Check if this wallet is a registered institution
          const isRegistered = await isRegisteredInstitution(currentAddress)

          if (!isRegistered) {
            await logout()
            return
          }

          // Get institution details from Supabase
          const { data: institution, error } = await supabase
            .from("institutions")
            .select("id, name")
            .eq("wallet_address", currentAddress)
            .single()

          if (error || !institution) {
            await logout()
            return
          }

          setInstitutionId(institution.id)
          setInstitutionName(institution.name)
          setIsLoggedIn(true)
        } catch (error) {
          console.error("Error checking login status:", error)
          await logout()
        }
      } else {
        await logout()
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (): Promise<boolean> => {
    try {
      setLoading(true)

      if (typeof window === "undefined" || !window.ethereum) {
        return false
      }

      // Connect to MetaMask
      const address = await getWalletAddress()
      setWalletAddress(address)

      // Check if this wallet is a registered institution
      const isRegistered = await isRegisteredInstitution(address)

      if (!isRegistered) {
        return false
      }

      // Get institution details from Supabase
      const { data: institution, error } = await supabase
        .from("institutions")
        .select("id, name")
        .eq("wallet_address", address)
        .single()

      if (error || !institution) {
        return false
      }

      // Store wallet address in localStorage
      localStorage.setItem("walletAddress", address)

      setInstitutionId(institution.id)
      setInstitutionName(institution.name)
      setIsLoggedIn(true)

      return true
    } catch (error) {
      console.error("Login error:", error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    // Clear local storage
    localStorage.removeItem("walletAddress")

    // Reset state
    setIsLoggedIn(false)
    setInstitutionId(null)
    setInstitutionName(null)
    setWalletAddress(null)

    // Redirect to home page
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        institutionId,
        institutionName,
        walletAddress,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
