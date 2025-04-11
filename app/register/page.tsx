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
import { registerInstitution, getWalletAddress, isRegisteredInstitution } from "@/lib/contract"
import { supabase } from "@/lib/supabase"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [formData, setFormData] = useState({
    institutionName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const connectWallet = async () => {
    setIsConnecting(true)

    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const address = await getWalletAddress()
        setWalletAddress(address)
        setIsWalletConnected(true)

        // Check if wallet is already registered
        const registered = await isRegisteredInstitution(address)
        setIsAlreadyRegistered(registered)

        if (registered) {
          toast({
            title: "Wallet Already Registered",
            description: "This wallet is already registered as an institution. Please login instead.",
          })
        } else {
          toast({
            title: "Wallet Connected",
            description: "Your MetaMask wallet has been connected successfully.",
          })
        }
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

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
      })
      return
    }

    setIsRegistering(true)

    try {
      // Check again if already registered (in case status changed)
      const registered = await isRegisteredInstitution(walletAddress)

      if (registered) {
        setIsAlreadyRegistered(true)
        toast({
          variant: "destructive",
          title: "Already Registered",
          description: "This wallet is already registered as an institution. Please login instead.",
        })
        setIsRegistering(false)
        return
      }

      // Register on blockchain
      await registerInstitution(formData.institutionName, formData.email)

      // Store in Supabase
      const { error } = await supabase.from("institutions").insert({
        name: formData.institutionName,
        email: formData.email,
        wallet_address: walletAddress,
      })

      if (error) {
        console.error("Database error:", error)
        toast({
          variant: "destructive",
          title: "Database Error",
          description: "Institution registered on blockchain but failed to store in database.",
        })
      }

      toast({
        title: "Registration Successful",
        description: "Your institution has been registered successfully.",
      })

      // Redirect to login page
      router.push("/login")
    } catch (error: any) {
      console.error("Registration error:", error)

      // Check if the error is because the institution is already registered
      if (error.message && error.message.includes("Institution already registered")) {
        setIsAlreadyRegistered(true)
        toast({
          variant: "destructive",
          title: "Already Registered",
          description: "This wallet is already registered as an institution. Please login instead.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "There was an error registering your institution. Please try again.",
        })
      }
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="container max-w-md py-16 md:py-24">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Institution Registration</CardTitle>
          <CardDescription className="text-center">Create an account to start issuing certificates</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="institutionName">Institution Name</Label>
              <Input
                id="institutionName"
                placeholder="Sri Siddhartha Institute of Technology"
                value={formData.institutionName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@institution.edu"
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
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Wallet Connection</Label>
              {isWalletConnected ? (
                <div className="p-3 border rounded-md bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-6 w-6 rounded-full ${isAlreadyRegistered ? "bg-yellow-500/20" : "bg-green-500/20"} flex items-center justify-center`}
                    >
                      <div
                        className={`h-3 w-3 rounded-full ${isAlreadyRegistered ? "bg-yellow-500" : "bg-green-500"}`}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {isAlreadyRegistered ? "Already Registered" : "Connected"}
                    </span>
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
              <p className="text-xs text-muted-foreground">
                Your Ethereum wallet will be used to sign and issue certificates
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            {isAlreadyRegistered ? (
              <Button type="button" className="w-full" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            ) : (
              <Button
                type="submit"
                className="w-full"
                disabled={!isWalletConnected || isRegistering || isAlreadyRegistered}
              >
                {isRegistering ? "Registering..." : "Register"}
              </Button>
            )}
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

