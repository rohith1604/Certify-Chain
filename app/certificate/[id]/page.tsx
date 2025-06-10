"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, Download, FileCheck, Loader2, Share2, XCircle } from "lucide-react"
import { toCanvas } from "qrcode"
import QRCode from "qrcode.react"; 

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

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

export default function CertificatePage() {
  const params = useParams()
  const { toast } = useToast()
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const certificateId = params.id as string

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const response = await fetch(`/api/verify-certificate?id=${certificateId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch certificate")
        }

        const data = await response.json()

        // Convert date strings to Date objects
        if (data.issueDate && typeof data.issueDate === "string") {
          data.issueDate = new Date(data.issueDate)
        }

        if (data.revocationDate && typeof data.revocationDate === "string") {
          data.revocationDate = new Date(data.revocationDate)
        }

        setCertificate(data)
      } catch (err) {
        console.error("Error fetching certificate:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch certificate")
        toast({
          variant: "destructive",
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to fetch certificate",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCertificate()
  }, [certificateId, toast])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const downloadCertificate = async () => {
  if (!certificate || !certificateId) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = 1000;
  canvas.height = 700;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Title
  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "#3b82f6";
  ctx.textAlign = "center";
  ctx.fillText("CERTIFICATE", canvas.width / 2, 100);

  // Content
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#000";
  ctx.fillText("This is to certify that", canvas.width / 2, 180);

  // Name
  ctx.font = "bold 36px Arial";
  ctx.fillText(certificate.studentName, canvas.width / 2, 250);

  // Course
  ctx.font = "24px Arial";
  ctx.fillText("has successfully completed the course", canvas.width / 2, 320);
  ctx.font = "bold 30px Arial";
  ctx.fillText(certificate.courseName, canvas.width / 2, 380);

  // Institution
  ctx.font = "24px Arial";
  ctx.fillText("from", canvas.width / 2, 440);
  ctx.font = "bold 28px Arial";
  ctx.fillText(certificate.institutionName, canvas.width / 2, 490);

  // Date
  ctx.font = "20px Arial";
  ctx.fillText(`Issued on: ${formatDate(certificate.issueDate)}`, canvas.width / 2, 550);

  // Certificate ID
  ctx.font = "16px Arial";
  ctx.fillText(`Certificate ID: ${certificateId}`, canvas.width / 2, 590);

  // Generate QR
  const qrCodeCanvas = document.createElement("canvas");
  await toCanvas(qrCodeCanvas, `${window.location.origin}/verify?id=${certificateId}`, {
  width: 120,
  margin: 1,
});

  ctx.drawImage(qrCodeCanvas, canvas.width - 150, canvas.height - 150, 120, 120);

  // Trigger download
  const link = document.createElement("a");
  link.download = `certificate-${certificateId}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
  

  const shareCertificate = async () => {
    if (!certificate) return

    const shareUrl = `${window.location.origin}/certificate/${certificateId}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate for ${certificate.courseName}`,
          text: `View my certificate for ${certificate.courseName} from ${certificate.institutionName}`,
          url: shareUrl,
        })
      } catch (err) {
        console.error("Error sharing:", err)
        // Fallback to copying to clipboard
        copyToClipboard(shareUrl)
      }
    } else {
      // Fallback to copying to clipboard
      copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Link Copied",
      description: "Certificate link copied to clipboard",
    })
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-16 md:py-24 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading certificate...</p>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="container max-w-2xl py-16 md:py-24">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <CardTitle className="flex items-center text-red-700 dark:text-red-400">
              <XCircle className="mr-2 h-5 w-5" />
              Certificate Not Found
            </CardTitle>
            <CardDescription>
              The certificate you are looking for could not be found or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please check the certificate ID and try again.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => (window.location.href = "/verify")}>
              Go to Verification Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-16 md:py-24">
      <Card
        className={`${!certificate.isRevoked && certificate.isValid ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}`}
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
          </div>
          <CardDescription>
            {!certificate.isRevoked && certificate.isValid
              ? "This certificate has been verified and is authentic"
              : certificate.isRevoked
                ? "This certificate has been revoked by the issuing institution"
                : "This certificate is not valid"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Certificate ID</h3>
                <p className="font-mono text-sm">{certificateId}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Student Name</h3>
                <p className="font-medium text-xl">{certificate.studentName}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Course/Degree</h3>
                <p className="text-lg">{certificate.courseName}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Issuing Institution</h3>
                <p>{certificate.institutionName}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Issue Date</h3>
                <p>{formatDate(certificate.issueDate)}</p>
              </div>

              {certificate.isRevoked && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Revocation Date</h3>
                    <p>{certificate.revocationDate}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Revocation Reason</h3>
                    <p>{certificate.revocationReason || "No reason provided"}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <QRCode
                  value={`${window.location.origin}/verify?id=${certificateId}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                  renderAs="canvas"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">Scan this QR code to verify this certificate</p>
            </div>
          </div>
        </CardContent>

        <CardFooter
          className={`${!certificate.isRevoked && certificate.isValid ? "bg-green-50/50 dark:bg-green-900/10" : "bg-red-50/50 dark:bg-red-900/10"} rounded-b-lg border-t ${!certificate.isRevoked && certificate.isValid ? "border-green-100 dark:border-green-900/50" : "border-red-100 dark:border-red-900/50"} flex flex-wrap gap-4 justify-center`}
        >
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => (window.location.href = `/verify?id=${certificateId}`)}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Verify Certificate
          </Button>

          {!certificate.isRevoked && certificate.isValid && (
            <>
              <Button variant="outline" className="flex-1" onClick={downloadCertificate}>
                <Download className="mr-2 h-4 w-4" />
                Download Certificate
              </Button>

              <Button variant="outline" className="flex-1" onClick={shareCertificate}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Certificate
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

