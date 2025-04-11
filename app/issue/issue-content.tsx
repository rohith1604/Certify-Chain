"use client"

import type React from "react"

import { useState } from "react"
import { Award, Calendar, FileText, Loader2, Mail, User } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/date-picker"
import { useToast } from "@/components/ui/use-toast"
import { issueCertificate } from "@/lib/contract"
import { supabase } from "@/lib/supabase"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"

export default function IssueContent() {
  const router = useRouter()
  const { toast } = useToast()
  const { walletAddress, institutionId } = useAuth()
  const [isIssuing, setIsIssuing] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [certificateId, setCertificateId] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [formData, setFormData] = useState({
    studentName: "",
    studentEmail: "",
    courseName: "",
    additionalInfo: "",
  })
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date())

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsIssuing(true)

    try {
      // Generate a unique certificate ID
      const uniqueId = "CERT-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5).toUpperCase()

      if (!walletAddress || !institutionId) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "You need to be logged in to issue certificates.",
        })
        setIsIssuing(false)
        return
      }

      // Get institution details from Supabase
      const { data: institution, error: institutionError } = await supabase
        .from("institutions")
        .select("id, name")
        .eq("id", institutionId)
        .single()

      if (institutionError || !institution) {
        toast({
          variant: "destructive",
          title: "Institution Not Found",
          description: "Your wallet is not associated with any registered institution.",
        })
        setIsIssuing(false)
        return
      }

      // Check if student exists, create if not
      let studentId
      const { data: existingStudent, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("email", formData.studentEmail)
        .single()

      if (studentError) {
        // Create new student
        const { data: newStudent, error: createError } = await supabase
          .from("students")
          .insert({
            name: formData.studentName,
            email: formData.studentEmail,
          })
          .select("id")
          .single()

        if (createError || !newStudent) {
          toast({
            variant: "destructive",
            title: "Student Creation Failed",
            description: "Failed to create student record.",
          })
          setIsIssuing(false)
          return
        }

        studentId = newStudent.id
      } else {
        studentId = existingStudent.id
      }

      // Issue certificate on blockchain
      const tx = await issueCertificate(uniqueId, formData.studentName, formData.courseName)

      // Store certificate in Supabase
      const { error: certError } = await supabase.from("certificates").insert({
        certificate_id: uniqueId,
        student_id: studentId,
        institution_id: institution.id,
        course_name: formData.courseName,
        issue_date: issueDate?.toISOString(),
        blockchain_tx: tx.transactionHash,
      })

      if (certError) {
        toast({
          variant: "destructive",
          title: "Database Error",
          description: "Certificate issued on blockchain but failed to store in database.",
        })
        console.error("Database error:", certError)
      }

      setCertificateId(uniqueId)
      setIsSuccess(true)

      toast({
        title: "Certificate Issued",
        description: "The certificate has been successfully issued on the blockchain.",
      })

      // Send email if option is selected
      if (sendEmail) {
        await sendCertificateEmail(uniqueId, formData.studentEmail)
      }
    } catch (error) {
      console.error("Error issuing certificate:", error)
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: "There was an error issuing the certificate. Please try again.",
      })
    } finally {
      setIsIssuing(false)
    }
  }

  const sendCertificateEmail = async (certId: string, email: string) => {
    setIsSendingEmail(true)

    try {
      const response = await fetch("/api/send-certificate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          certificateId: certId,
          studentEmail: email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email")
      }

      if (data.blockchainVerified === false) {
        toast({
          title: "Email Sent with Warning",
          description:
            "Certificate email sent, but blockchain verification was not possible. The student can still verify using the certificate ID.",
          variant: "default",
        })
      } else {
        toast({
          title: "Email Sent",
          description: "Certificate has been emailed to the student.",
        })
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast({
        variant: "destructive",
        title: "Email Failed",
        description: "Failed to send certificate email. The student can still verify using the certificate ID.",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="container max-w-md py-16 md:py-24">
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="bg-green-50 dark:bg-green-900/20 rounded-t-lg border-b border-green-100 dark:border-green-900/50">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-2">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-green-700 dark:text-green-400">Certificate Issued!</CardTitle>
              <CardDescription>The certificate has been successfully issued on the blockchain</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Certificate ID</h3>
                <p className="font-mono text-lg">{certificateId}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {sendEmail
                  ? "The certificate has been emailed to the student with a QR code for verification."
                  : "Share this certificate ID with the student to allow them to verify their certificate."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" onClick={() => setIsSuccess(false)}>
              Issue Another Certificate
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push(`/verify?id=${certificateId}`)}>
              View Certificate Details
            </Button>
            {!sendEmail && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => sendCertificateEmail(certificateId, formData.studentEmail)}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Certificate Email
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Issue Certificate</h1>
        <p className="text-muted-foreground">Fill in the details to issue a new certificate on the blockchain</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Certificate Details</CardTitle>
            <CardDescription>Enter the information to be included in the certificate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="studentName">
                <User className="h-4 w-4 inline mr-2" />
                Student Name
              </Label>
              <Input
                id="studentName"
                placeholder="Enter student's full name"
                value={formData.studentName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentEmail">
                <Mail className="h-4 w-4 inline mr-2" />
                Student Email
              </Label>
              <Input
                id="studentEmail"
                type="email"
                placeholder="Enter student's email address"
                value={formData.studentEmail}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseName">
                <FileText className="h-4 w-4 inline mr-2" />
                Course/Degree
              </Label>
              <Input
                id="courseName"
                placeholder="Enter course or degree name"
                value={formData.courseName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                <Calendar className="h-4 w-4 inline mr-2" />
                Issue Date
              </Label>
              <DatePicker selectedDate={issueDate} onDateChange={setIssueDate} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <Textarea
                id="additionalInfo"
                placeholder="Enter any additional information to include in the certificate"
                className="min-h-[100px]"
                value={formData.additionalInfo}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="send-email" checked={sendEmail} onCheckedChange={setSendEmail} />
              <Label htmlFor="send-email">Send certificate to student via email with QR code</Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isIssuing}>
              {isIssuing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Issuing Certificate...
                </>
              ) : (
                <>Issue Certificate</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This will create a transaction on the blockchain. You will need to confirm it with your connected wallet.
            </p>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
