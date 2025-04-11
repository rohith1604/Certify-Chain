"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Copy, FileCheck, Loader2, Search, XCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { verifyCertificate } from "@/lib/contract"
import { supabase } from "@/lib/supabase"

interface Certificate {
  studentName: string
  courseName: string
  issueDate: Date
  issuerAddress: string
  institutionName: string
  isValid: boolean
  isRevoked?: boolean
  revocationReason?: string
  revocationDate?: string
  blockchainVerified?: boolean
}

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [certificateId, setCertificateId] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasMetaMask, setHasMetaMask] = useState(false)

  useEffect(() => {
    // Check if MetaMask is available
    const checkMetaMask = () => {
      const hasMetaMask = typeof window !== "undefined" && window.ethereum !== undefined
      setHasMetaMask(hasMetaMask)
    }

    checkMetaMask()

    // Check if there's a certificate ID in the URL
    const idFromUrl = searchParams.get("id")
    if (idFromUrl) {
      setCertificateId(idFromUrl)
      handleVerify(idFromUrl)
    }
  }, [searchParams])

  const verifyWithAPI = async (id: string): Promise<Certificate> => {
    const response = await fetch(`/api/verify-certificate?id=${id}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to verify certificate")
    }

    const data = await response.json()

    // Convert date strings to Date objects
    if (data.issueDate && typeof data.issueDate === "string") {
      data.issueDate = new Date(data.issueDate)
    }

    if (data.revocationDate && typeof data.revocationDate === "string") {
      data.revocationDate = new Date(data.revocationDate)
    }

    return data
  }

  const verifyWithMetaMask = async (id: string): Promise<Certificate> => {
    // Verify certificate on blockchain
    const blockchainResult = await verifyCertificate(id)

    // Get additional details from Supabase
    const { data: dbCertificate, error } = await supabase
      .from("certificates")
      .select(`
        is_revoked,
        revocation_reason,
        revocation_date,
        institutions:institution_id (name)
      `)
      .eq("certificate_id", id)
      .single()

    // Combine blockchain and database data
    return {
      ...blockchainResult,
      isRevoked: dbCertificate?.is_revoked || false,
      revocationReason: dbCertificate?.revocation_reason,
      revocationDate: dbCertificate?.revocation_date
        ? new Date(dbCertificate.revocation_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : undefined,
      institutionName: dbCertificate?.institutions?.[0]?.name || blockchainResult.institutionName,
      blockchainVerified: true,
    }
  }

  const handleVerify = async (id: string = certificateId) => {
    if (!id) return

    setIsVerifying(true)

    try {
      let certificateData: Certificate

      // Try with MetaMask first if available, otherwise use API
      if (hasMetaMask) {
        try {
          certificateData = await verifyWithMetaMask(id)
        } catch (metaMaskError) {
          console.error("MetaMask verification failed, falling back to API:", metaMaskError)
          certificateData = await verifyWithAPI(id)
        }
      } else {
        certificateData = await verifyWithAPI(id)
      }

      setCertificate(certificateData)

      if (!certificateData.isValid || certificateData.isRevoked) {
        toast({
          variant: "destructive",
          title: "Invalid Certificate",
          description: certificateData.isRevoked
            ? "This certificate has been revoked."
            : "This certificate is not valid on the blockchain.",
        })
      } else if (!certificateData.blockchainVerified) {
        toast({
          title: "Certificate Verified",
          description: "Certificate verified from database, but blockchain verification was not possible.",
          variant: "default",
        })
      } else {
        toast({
          title: "Certificate Verified",
          description: "This certificate is valid and authentic.",
        })
      }
    } catch (error) {
      console.error("Error verifying certificate:", error)
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Certificate not found or an error occurred during verification.",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Verify Certificate</h1>
        <p className="text-muted-foreground">Enter the certificate ID or scan a QR code to verify its authenticity</p>
        {!hasMetaMask && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
            <p>MetaMask not detected. Verification will use our server instead of direct blockchain verification.</p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certificate Verification</CardTitle>
          <CardDescription>Enter the unique certificate ID provided with your certificate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="certificate-id" className="sr-only">
                Certificate ID
              </Label>
              <Input
                id="certificate-id"
                placeholder="Enter certificate ID (e.g., CERT-123456)"
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
              />
            </div>
            <Button onClick={() => handleVerify()} disabled={!certificateId || isVerifying} className="min-w-[120px]">
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verify
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {certificate && (
        <Card
          className={`mt-8 ${!certificate.isRevoked && certificate.isValid ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}`}
        >
          <CardHeader
            className={`${!certificate.isRevoked && certificate.isValid ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"} rounded-t-lg border-b ${!certificate.isRevoked && certificate.isValid ? "border-green-100 dark:border-green-900/50" : "border-red-100 dark:border-red-900/50"}`}
          >
            <div className="flex items-center justify-between">
              <CardTitle
                className={`flex items-center ${!certificate.isRevoked && certificate.isValid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
              >
                {!certificate.isRevoked && certificate.isValid ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Certificate Verified
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-5 w-5" />
                    {certificate.isRevoked ? "Certificate Revoked" : "Certificate Invalid"}
                  </>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(certificateId)}
                className="h-8 w-8 text-muted-foreground"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              {!certificate.isRevoked && certificate.isValid
                ? "This certificate has been verified and is authentic"
                : certificate.isRevoked
                  ? "This certificate has been revoked by the issuing institution"
                  : "This certificate is not valid"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Certificate ID</h3>
                <p className="font-mono text-sm">{certificateId}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Issue Date</h3>
                <p>{formatDate(certificate.issueDate)}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Student Name</h3>
                <p className="font-medium text-lg">{certificate.studentName}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Course/Degree</h3>
                <p>{certificate.courseName}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Issuing Institution</h3>
                <p>{certificate.institutionName}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Issuer Address</h3>
                <p className="font-mono text-xs truncate">{certificate.issuerAddress}</p>
              </div>

              {certificate.isRevoked && (
                <>
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Revocation Date</h3>
                    <p>{certificate.revocationDate}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Revocation Reason</h3>
                    <p>{certificate.revocationReason || "No reason provided"}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter
            className={`${!certificate.isRevoked && certificate.isValid ? "bg-green-50/50 dark:bg-green-900/10" : "bg-red-50/50 dark:bg-red-900/10"} rounded-b-lg border-t ${!certificate.isRevoked && certificate.isValid ? "border-green-100 dark:border-green-900/50" : "border-red-100 dark:border-red-900/50"} flex justify-between`}
          >
            <div className="flex items-center text-sm text-muted-foreground">
              <FileCheck
                className={`mr-2 h-4 w-4 ${!certificate.isRevoked && certificate.isValid ? "text-green-500" : "text-red-500"}`}
              />
              {certificate.blockchainVerified ? "Blockchain Verified" : "Database Verified"}
            </div>
            {certificate.blockchainVerified && (
              <Button
                variant="outline"
                size="sm"
                className={
                  !certificate.isRevoked && certificate.isValid
                    ? "border-green-200 dark:border-green-800"
                    : "border-red-200 dark:border-red-800"
                }
                onClick={() =>
                  window.open(`https://sepolia.etherscan.io/address/${certificate.issuerAddress}`, "_blank")
                }
              >
                View on Blockchain
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

