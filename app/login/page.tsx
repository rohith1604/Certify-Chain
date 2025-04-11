"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Wallet } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { getWalletAddress } from "@/lib/contract"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const connectWallet = async () => {
    setIsConnecting(true)

    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const address = await getWalletAddress()
        setWalletAddress(address)
        setIsWalletConnected(true)

        toast({
          title: "Wallet Connected",
          description: "Your MetaMask wallet has been connected successfully.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "MetaMask Not Found",
          description: "Please install MetaMask to use this application.",
        })
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Failed to connect to your wallet. Please try again.",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)

    try {
      // Use the login function from auth context
      const success = await login()

      if (!success) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "This wallet is not registered as an institution.",
        })
        setIsLoggingIn(false)
        return
      }

      toast({
        title: "Login Successful",
        description: "You have been logged in successfully.",
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "There was an error logging in. Please try again.",
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="container max-w-md py-16 md:py-24">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Institution Login</CardTitle>
          <CardDescription className="text-center">Enter your credentials to access your dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={handleInputChange} required />
            </div>

            <div className="space-y-2">
              <Label>Wallet Connection</Label>
              {isWalletConnected ? (
                <div className="p-3 border rounded-md bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">{walletAddress}</span>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={connectWallet}
                  className="w-full"
                  variant="outline"
                  disabled={isConnecting}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  {isConnecting ? "Connecting..." : "Connect MetaMask"}
                </Button>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={!isWalletConnected || isLoggingIn}>
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
