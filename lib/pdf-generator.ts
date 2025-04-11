import { jsPDF } from "jspdf"
import QRCode from "qrcode"

interface CertificateData {
  certificateId: string
  studentName: string
  courseName: string
  issueDate: Date
  institutionName: string
  verificationUrl: string
}

export async function generateCertificatePDF(data: CertificateData): Promise<Blob> {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  // Set background color
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 297, 210, "F")

  // Add decorative border
  doc.setDrawColor(59, 130, 246) // Primary color
  doc.setLineWidth(1)
  doc.rect(10, 10, 277, 190)

  // Add inner decorative border
  doc.setDrawColor(59, 130, 246, 0.5)
  doc.setLineWidth(0.5)
  doc.rect(15, 15, 267, 180)

  // Add certificate title
  doc.setFont("helvetica", "bold")
  doc.setTextColor(59, 130, 246)
  doc.setFontSize(30)
  doc.text("CERTIFICATE OF COMPLETION", 148.5, 40, { align: "center" })

  // Add decorative line
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.line(74, 45, 223, 45)

  // Add certificate text
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.text("This is to certify that", 148.5, 65, { align: "center" })

  // Add student name
  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.text(data.studentName, 148.5, 80, { align: "center" })

  // Add course completion text
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text("has successfully completed the course", 148.5, 95, { align: "center" })

  // Add course name
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(data.courseName, 148.5, 110, { align: "center" })

  // Add institution name
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text("from", 148.5, 125, { align: "center" })
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(data.institutionName, 148.5, 135, { align: "center" })

  // Add issue date
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  const formattedDate = data.issueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.text(`Issued on: ${formattedDate}`, 148.5, 150, { align: "center" })

  // Add certificate ID
  doc.setFontSize(10)
  doc.text(`Certificate ID: ${data.certificateId}`, 148.5, 160, { align: "center" })

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 150,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  })

  // Add QR code to the PDF
  doc.addImage(qrCodeDataUrl, "PNG", 230, 140, 30, 30)
  doc.setFontSize(8)
  doc.text("Scan to verify", 245, 175, { align: "center" })

  // Add footer
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("This certificate is verified and secured on the blockchain using Certify Chain.", 148.5, 185, {
    align: "center",
  })
  doc.text("To verify this certificate, visit: " + data.verificationUrl, 148.5, 190, { align: "center" })

  // Return the PDF as a blob
  return doc.output("blob")
}

