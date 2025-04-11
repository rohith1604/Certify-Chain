import { type NextRequest, NextResponse } from "next/server"
import { sendCertificateEmail } from "@/lib/email-service"
import { createServerSupabaseClient } from "@/lib/supabase"
import { verifyServerCertificate } from "@/lib/contract"

export async function POST(request: NextRequest) {
  try {
    const { certificateId, studentEmail } = await request.json()

    if (!certificateId || !studentEmail) {
      return NextResponse.json({ error: "Certificate ID and student email are required" }, { status: 400 })
    }

    // Get certificate details from Supabase
    const supabase = createServerSupabaseClient()

    // Get certificate details from Supabase
    const { data: certificate, error: certError } = await supabase
      .from("certificates")
      .select(`
        *,
        students:student_id (name, email),
        institutions:institution_id (name)
      `)
      .eq("certificate_id", certificateId)
      .single()

    if (certError || !certificate) {
      console.error("Error fetching certificate details:", certError)
      return NextResponse.json({ error: "Certificate details not found in database" }, { status: 404 })
    }

    // Try to verify on blockchain, but continue even if it fails
    let blockchainVerified = true
    let certificateData

    try {
      certificateData = await verifyServerCertificate(certificateId)

      if (!certificateData || !certificateData.isValid) {
        blockchainVerified = false
      }
    } catch (blockchainError) {
      console.error("Blockchain verification error:", blockchainError)
      blockchainVerified = false
    }

    // Send email with available data
    const emailSent = await sendCertificateEmail(
      certificateId,
      studentEmail,
      certificate.students.name,
      certificate.course_name,
      certificate.institutions.name,
      new Date(certificate.issue_date),
    )

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send certificate email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      blockchainVerified,
    })
  } catch (error) {
    console.error("Error in send-certificate API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

