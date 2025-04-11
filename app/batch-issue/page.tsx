"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Award, Download, FileText, Loader2, Upload, X, CheckCircle, XCircle } from "lucide-react"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { issueCertificate, getWalletAddress } from "@/lib/contract"
import { supabase } from "@/lib/supabase"

interface CertificateData {
  studentName: string
  studentEmail: string
  courseName: string
  issueDate: string
  status?: "pending" | "success" | "error"
  certificateId?: string
  error?: string
}

export default function BatchIssuePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [certificates, setCertificates] = useState<CertificateData[]>([])
  const [sendEmails, setSendEmails] = useState(true)
  const [progress, setProgress] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [templateFile, setTemplateFile] = useState<File | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet)

      // Validate and transform data
      const certificateData: CertificateData[] = jsonData.map((row) => {
        return {
          studentName: row.studentName || row.StudentName || row["Student Name"] || "",
          studentEmail: row.studentEmail || row.StudentEmail || row["Student Email"] || "",
          courseName: row.courseName || row.CourseName || row["Course Name"] || "",
          issueDate: row.issueDate || row.IssueDate || row["Issue Date"] || new Date().toISOString().split("T")[0],
          status: "pending",
        }
      })

      // Validate required fields
      const invalidEntries = certificateData.filter(
        (cert) => !cert.studentName || !cert.studentEmail || !cert.courseName,
      )

      if (invalidEntries.length > 0) {
        toast({
          variant: "destructive",
          title: "Invalid Data",
          description: `${invalidEntries.length} entries are missing required fields.`,
        })
        return
      }

      setCertificates(certificateData)
      toast({
        title: "File Uploaded",
        description: `${certificateData.length} certificates ready to be issued.`,
      })
    } catch (error) {
      console.error("Error processing file:", error)
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was an error processing the file. Please check the format and try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    // Create a template workbook
    const workbook = XLSX.utils.book_new()
    const data = [
      {
        studentName: "John Doe",
        studentEmail: "john.doe@example.com",
        courseName: "Computer Science",
        issueDate: new Date().toISOString().split("T")[0],
      },
      {
        studentName: "Jane Smith",
        studentEmail: "jane.smith@example.com",
        courseName: "Data Science",
        issueDate: new Date().toISOString().split("T")[0],
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, "Certificates")

    // Generate and download the file
    XLSX.writeFile(workbook, "certificate-template.xlsx")
  }

  const processCertificates = async () => {
    if (certificates.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setCompletedCount(0)

    try {
      // Get wallet address
      const walletAddress = await getWalletAddress()

      // Get institution details from Supabase
      const { data: institution, error: institutionError } = await supabase
        .from("institutions")
        .select("id, name")
        .eq("wallet_address", walletAddress)
        .single()

      if (institutionError || !institution) {
        toast({
          variant: "destructive",
          title: "Institution Not Found",
          description: "Your wallet is not associated with any registered institution.",
        })
        setIsProcessing(false)
        return
      }

      // Process each certificate
      const updatedCertificates = [...certificates]
      for (let i = 0; i < certificates.length; i++) {
        const cert = certificates[i]
        try {
          // Generate a unique certificate ID
          const uniqueId = "CERT-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5).toUpperCase()

          // Check if student exists, create if not
          let studentId
          const { data: existingStudent, error: studentError } = await supabase
            .from("students")
            .select("id")
            .eq("email", cert.studentEmail)
            .single()

          if (studentError) {
            // Create new student
            const { data: newStudent, error: createError } = await supabase
              .from("students")
              .insert({
                name: cert.studentName,
                email: cert.studentEmail,
              })
              .select("id")
              .single()

            if (createError || !newStudent) {
              throw new Error("Failed to create student record")
            }

            studentId = newStudent.id
          } else {
            studentId = existingStudent.id
          }

          // Issue certificate on blockchain
          const tx = await issueCertificate(uniqueId, cert.studentName, cert.courseName)

          // Store certificate in Supabase
          const issueDate = new Date(cert.issueDate)
          const { error: certError } = await supabase.from("certificates").insert({
            certificate_id: uniqueId,
            student_id: studentId,
            institution_id: institution.id,
            course_name: cert.courseName,
            issue_date: issueDate.toISOString(),
            blockchain_tx: tx.transactionHash,
          })

          if (certError) {
            throw new Error("Failed to store certificate in database")
          }

          // Send email if option is selected
          if (sendEmails) {
            const emailResponse = await fetch("/api/send-certificate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                certificateId: uniqueId,
                studentEmail: cert.studentEmail,
              }),
            })

            if (!emailResponse.ok) {
              console.warn("Email sending failed for certificate:", uniqueId)
            }
          }

          // Update certificate status
          updatedCertificates[i] = {
            ...cert,
            status: "success",
            certificateId: uniqueId,
          }
        } catch (error) {
          console.error("Error processing certificate:", error)
          updatedCertificates[i] = {
            ...cert,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }

        // Update progress
        setCompletedCount(i + 1)
        setProgress(Math.round(((i + 1) / certificates.length) * 100))
        setCertificates([...updatedCertificates])
      }

      // Count successes and failures
      const successCount = updatedCertificates.filter((cert) => cert.status === "success").length
      const errorCount = updatedCertificates.filter((cert) => cert.status === "error").length

      toast({
        title: "Batch Processing Complete",
        description: `Successfully issued ${successCount} certificates. ${errorCount} failed.`,
        variant: errorCount > 0 ? "default" : "default",
      })
    } catch (error) {
      console.error("Batch processing error:", error)
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: "There was an error processing the certificates. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const exportResults = () => {
    // Create a workbook with results
    const workbook = XLSX.utils.book_new()
    const data = certificates.map((cert) => ({
      studentName: cert.studentName,
      studentEmail: cert.studentEmail,
      courseName: cert.courseName,
      issueDate: cert.issueDate,
      certificateId: cert.certificateId || "",
      status: cert.status || "",
      error: cert.error || "",
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results")

    // Generate and download the file
    XLSX.writeFile(workbook, "certificate-results.xlsx")
  }

  return (
    <div className="container py-16 md:py-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Batch Certificate Issuance</h1>
        <p className="text-muted-foreground">Issue multiple certificates at once by uploading a spreadsheet</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Certificate Data</CardTitle>
          <CardDescription>
            Upload an Excel file with student information to issue multiple certificates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            <div className="flex items-center space-x-2">
              <Switch id="send-emails" checked={sendEmails} onCheckedChange={setSendEmails} />
              <Label htmlFor="send-emails">Send certificate emails</Label>
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
            <div className="mb-4 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your Excel file here, or click to browse
              </p>
            </div>

            <Label
              htmlFor="file-upload"
              className="bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md cursor-pointer"
            >
              {isUploading ? "Uploading..." : "Select File"}
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading || isProcessing}
            />

            {templateFile && (
              <div className="mt-4 flex items-center bg-muted p-2 rounded-md">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{templateFile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-2"
                  onClick={() => setTemplateFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Certificate Batch</CardTitle>
            <CardDescription>
              {isProcessing
                ? `Processing ${completedCount} of ${certificates.length} certificates`
                : `${certificates.length} certificates ready to be issued`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing && (
              <div className="mb-6 space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {completedCount} of {certificates.length} certificates processed ({progress}%)
                </p>
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert, index) => (
                    <TableRow key={index}>
                      <TableCell>{cert.studentName}</TableCell>
                      <TableCell>{cert.studentEmail}</TableCell>
                      <TableCell>{cert.courseName}</TableCell>
                      <TableCell>{cert.issueDate}</TableCell>
                      <TableCell>
                        {cert.status === "pending" && <span className="text-muted-foreground">Pending</span>}
                        {cert.status === "success" && (
                          <span className="text-green-600 dark:text-green-400 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Success
                          </span>
                        )}
                        {cert.status === "error" && (
                          <span className="text-red-600 dark:text-red-400 flex items-center" title={cert.error}>
                            <XCircle className="h-4 w-4 mr-1" />
                            Failed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={exportResults} disabled={isProcessing}>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
            <Button onClick={processCertificates} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Award className="mr-2 h-4 w-4" />
                  Issue Certificates
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

