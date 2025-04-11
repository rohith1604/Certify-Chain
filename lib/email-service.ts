import nodemailer from "nodemailer"
import QRCode from "qrcode"
import { createServerSupabaseClient } from "./supabase"

// Get certificate details from database only (fallback when blockchain verification fails)
async function getCertificateFromDatabase(certificateId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("certificates")
    .select(`
      *,
      students:student_id (name, email),
      institutions:institution_id (name)
    `)
    .eq("certificate_id", certificateId)
    .single()

  if (error || !data) {
    throw new Error("Certificate not found in database")
  }

  return {
    studentName: data.students.name,
    courseName: data.course_name,
    issueDate: new Date(data.issue_date),
    institutionName: data.institutions.name,
  }
}

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Generate QR code as data URL
export async function generateQRCode(verificationUrl: string): Promise<string> {
  try {
    // Generate QR code with higher quality and error correction
    return await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 300,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw error
  }
}

// Send certificate email with QR code
export async function sendCertificateEmail(
  certificateId: string,
  studentEmail: string,
  studentName?: string,
  courseName?: string,
  institutionName?: string,
  issueDate?: Date,
): Promise<boolean> {
  try {
    // If any required data is missing, try to get it from the database
    let certData = {
      studentName: studentName || "",
      courseName: courseName || "",
      institutionName: institutionName || "",
      issueDate: issueDate || new Date(),
    }

    if (!studentName || !courseName || !institutionName || !issueDate) {
      try {
        certData = await getCertificateFromDatabase(certificateId)
      } catch (dbError) {
        console.error("Error getting certificate from database:", dbError)
        // Continue with whatever data we have
      }
    }

    // Generate verification URL and certificate URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const verificationUrl = `${baseUrl}/verify?id=${certificateId}`
    const certificateUrl = `${baseUrl}/certificate/${certificateId}`

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(verificationUrl)

    // Format date
    const formattedDate = new Date(certData.issueDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Email content
    const mailOptions = {
      from: `"Certify Chain" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Your Certificate for ${certData.courseName}`,
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #3b82f6;">Certificate Issued</h1>
    </div>
    
    <p>Dear ${certData.studentName},</p>
    
    <p>Congratulations! Your certificate for <strong>${certData.courseName}</strong> has been issued by <strong>${certData.institutionName}</strong> on <strong>${formattedDate}</strong>.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p><strong>Certificate ID:</strong> ${certificateId}</p>
      <p><strong>Course:</strong> ${certData.courseName}</p>
      <p><strong>Issue Date:</strong> ${formattedDate}</p>
    </div>
    
    <p>Your certificate has been securely stored on the blockchain and can be verified using the QR code below or by visiting our verification page.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <img src="cid:certificate-qr@certifychain.com" alt="Verification QR Code" style="max-width: 200px; height: auto; display: block; margin: 0 auto; border: 1px solid #e2e8f0; padding: 10px; background-color: white;" />
      <p style="margin-top: 10px; font-size: 14px; color: #64748b;">Scan this QR code to verify your certificate</p>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
      <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">Verify Certificate</a>
      <a href="${certificateUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Certificate</a>
    </div>
    
    <p style="margin-top: 30px;">Thank you for using Certify Chain.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #64748b;">
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
`,
      // Add a text version as fallback
      text: `
Certificate Issued

Dear ${certData.studentName},

Congratulations! Your certificate for ${certData.courseName} has been issued by ${certData.institutionName} on ${formattedDate}.

Certificate ID: ${certificateId}
Course: ${certData.courseName}
Issue Date: ${formattedDate}

Your certificate has been securely stored on the blockchain and can be verified by visiting:
${verificationUrl}

Thank you for using Certify Chain.

This is an automated email. Please do not reply to this message.
      `,
      // Add attachments for the QR code
      attachments: [
        {
          filename: "certificate-qr.png",
          content: qrCodeDataUrl.split(";base64,").pop(),
          encoding: "base64",
          cid: "certificate-qr@certifychain.com", // Content ID for embedding in HTML
        },
      ],
    }

    // Send email
    await transporter.sendMail(mailOptions)

    // Log email in database
    const supabase = createServerSupabaseClient()

    // First, get the certificate UUID from the certificate_id
    const { data: certificateData, error: certError } = await supabase
      .from("certificates")
      .select("id")
      .eq("certificate_id", certificateId)
      .single()

    if (certError || !certificateData) {
      console.error("Error finding certificate:", certError)
      return false
    }

    // Log the email
    const { error: logError } = await supabase.from("email_logs").insert({
      certificate_id: certificateData.id,
      recipient_email: studentEmail,
      status: "sent",
    })

    if (logError) {
      console.error("Error logging email:", logError)
    }

    return true
  } catch (error) {
    console.error("Error sending certificate email:", error)

    // Log failed email attempt if possible
    try {
      const supabase = createServerSupabaseClient()

      // Get certificate UUID
      const { data: certificateData } = await supabase
        .from("certificates")
        .select("id")
        .eq("certificate_id", certificateId)
        .single()

      if (certificateData) {
        await supabase.from("email_logs").insert({
          certificate_id: certificateData.id,
          recipient_email: studentEmail,
          status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
        })
      }
    } catch (logError) {
      console.error("Error logging failed email:", logError)
    }

    return false
  }
}

