"use client"

import { useState } from "react"
import { Ban, FileX, Loader2, Search } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getCertifyChainContract, getWalletAddress } from "@/lib/contract"
import { supabase } from "@/lib/supabase"

interface Certificate {
  id: string
  certificate_id: string
  course_name: string
  issue_date: string
  is_revoked: boolean
  student: {
    name: string
    email: string
  }
}

export default function RevokePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [certificateId, setCertificateId] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [revocationReason, setRevocationReason] = useState("")

  const searchCertificate = async () => {
    if (!certificateId) return

    setIsSearching(true)

    try {
      // Get wallet address
      const walletAddress = await getWalletAddress()

      // Get institution ID
      const { data: institution, error: institutionError } = await supabase
        .from("institutions")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single()

      if (institutionError || !institution) {
        toast({
          variant: "destructive",
          title: "Institution Not Found",
          description: "Your wallet is not associated with any registered institution.",
        })
        setIsSearching(false)
        return
      }

      // Search for certificate
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_id,
          course_name,
          issue_date,
          is_revoked,
          students:student_id (
            name,
            email
          )
        `)
        .eq("certificate_id", certificateId)
        .eq("institution_id", institution.id)
        .single()

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Certificate Not Found",
          description: "No certificate found with this ID issued by your institution.",
        })
        setCertificate(null)
        setIsSearching(false)
        return
      }

      // Check if students data exists
      if (!data.students) {
        toast({
          variant: "destructive",
          title: "Student Data Missing",
          description: "Student information is missing for this certificate.",
        })
        setCertificate(null)
        setIsSearching(false)
        return
      }

      // Format certificate data
      setCertificate({
        id: data.id,
        certificate_id: data.certificate_id,
        course_name: data.course_name,
        issue_date: new Date(data.issue_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        is_revoked: data.is_revoked,
        student: {
          name: data.students.name,
          email: data.students.email,
        },
      })

      if (data.is_revoked) {
        toast({
          title: "Certificate Already Revoked",
          description: "This certificate has already been revoked.",
        })
      }
    } catch (error) {
      console.error("Error searching certificate:", error)
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "An error occurred while searching for the certificate.",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const revokeCertificate = async () => {
    if (!certificate || !revocationReason) return

    setIsRevoking(true)

    try {
      // Revoke on blockchain
      const contract = await getCertifyChainContract(true)
      const tx = await contract.revokeCertificate(certificate.certificate_id)
      await tx.wait()

      // Update in database
      const { error } = await supabase
        .from("certificates")
        .update({
          is_revoked: true,
          revocation_date: new Date().toISOString(),
          revocation_reason: revocationReason,
        })
        .eq("id", certificate.id)

      if (error) {
        console.error("Database update error:", error)
        toast({
          variant: "destructive",
          title: "Database Error",
          description: "Certificate revoked on blockchain but failed to update database.",
        })
      } else {
        toast({
          title: "Certificate Revoked",
          description: "The certificate has been successfully revoked.",
        })

        // Update local state
        setCertificate((prev) => (prev ? { ...prev, is_revoked: true } : null))
        setRevocationReason("")
      }
    } catch (error) {
      console.error("Error revoking certificate:", error)
      toast({
        variant: "destructive",
        title: "Revocation Failed",
        description: "There was an error revoking the certificate. Please try again.",
      })
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Revoke Certificate</h1>
        <p className="text-muted-foreground">Search for a certificate by ID and revoke it if necessary</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Certificate</CardTitle>
          <CardDescription>
            Enter the certificate ID to search for a certificate issued by your institution
          </CardDescription>
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
            <Button onClick={searchCertificate} disabled={!certificateId || isSearching} className="min-w-[120px]">
              {isSearching ? (
                <>Searching...</>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {certificate && (
        <Card className={certificate.is_revoked ? "border-red-200 dark:border-red-900" : ""}>
          <CardHeader className={certificate.is_revoked ? "bg-red-50 dark:bg-red-900/20" : ""}>
            <CardTitle className="flex items-center">
              {certificate.is_revoked && <Ban className="mr-2 h-5 w-5 text-red-500" />}
              Certificate Details
            </CardTitle>
            <CardDescription>
              {certificate.is_revoked
                ? "This certificate has already been revoked"
                : "Review the certificate details before revoking"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Certificate ID</h3>
                <p className="font-mono text-sm">{certificate.certificate_id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Issue Date</h3>
                <p>{certificate.issue_date}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Student Name</h3>
                <p className="font-medium">{certificate.student.name}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Student Email</h3>
                <p>{certificate.student.email}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Course/Degree</h3>
                <p>{certificate.course_name}</p>
              </div>
            </div>

            {!certificate.is_revoked && (
              <div className="mt-4 pt-4 border-t">
                <Label htmlFor="revocation-reason" className="text-sm font-medium">
                  Revocation Reason
                </Label>
                <Textarea
                  id="revocation-reason"
                  placeholder="Enter the reason for revoking this certificate"
                  className="mt-2"
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  required
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            {certificate.is_revoked ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/verify?id=${certificate.certificate_id}`)}
              >
                View Certificate Status
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="w-full"
                onClick={revokeCertificate}
                disabled={isRevoking || !revocationReason}
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking Certificate...
                  </>
                ) : (
                  <>
                    <FileX className="mr-2 h-4 w-4" />
                    Revoke Certificate
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

