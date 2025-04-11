import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { verifyServerCertificate } from "@/lib/contract"

export async function GET(request: NextRequest) {
  try {
    // Get certificate ID from query params
    const { searchParams } = new URL(request.url)
    const certificateId = searchParams.get("id")

    if (!certificateId) {
      return NextResponse.json({ error: "Certificate ID is required" }, { status: 400 })
    }

    // Get certificate details from Supabase
    const supabase = createServerSupabaseClient()

    const { data: dbCertificate, error: dbError } = await supabase
      .from("certificates")
      .select(`
        *,
        students:student_id (name, email),
        institutions:institution_id (name)
      `)
      .eq("certificate_id", certificateId)
      .single()

    if (dbError || !dbCertificate) {
      console.error("Error fetching certificate from database:", dbError)
      return NextResponse.json({ error: "Certificate not found in database" }, { status: 404 })
    }

    // Try to verify on blockchain
    let blockchainData
    let blockchainVerified = true

    try {
      blockchainData = await verifyServerCertificate(certificateId)

      if (!blockchainData || !blockchainData.isValid) {
        blockchainVerified = false
      }
    } catch (blockchainError) {
      console.error("Blockchain verification error:", blockchainError)
      blockchainVerified = false
    }

    // Combine data from both sources
    const certificateData = {
      studentName: blockchainVerified && blockchainData ? blockchainData.studentName : dbCertificate.students.name,
      courseName: blockchainVerified && blockchainData ? blockchainData.courseName : dbCertificate.course_name,
      issueDate: blockchainVerified && blockchainData ? blockchainData.issueDate : new Date(dbCertificate.issue_date),
      issuerAddress: blockchainVerified && blockchainData
        ? blockchainData.issuerAddress
        : dbCertificate.blockchain_tx?.split(":")[0] || "Unknown",
      institutionName: blockchainVerified && blockchainData ? blockchainData.institutionName : dbCertificate.institutions.name,
      isValid: blockchainVerified && blockchainData ? blockchainData.isValid : true,
      isRevoked: dbCertificate.is_revoked || false,
      revocationReason: dbCertificate.revocation_reason,
      revocationDate: dbCertificate.revocation_date,
      blockchainVerified,
    }

    return NextResponse.json(certificateData)
  } catch (error) {
    console.error("Error in verify-certificate API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

