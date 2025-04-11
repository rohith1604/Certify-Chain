import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { verifyServerCertificate, issueCertificateWithPrivateKey } from "@/lib/contract"

// API key validation middleware
async function validateApiKey(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key")

  if (!apiKey) {
    return { valid: false, error: "API key is required" }
  }

  // Validate API key against database
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("api_keys")
    .select("institution_id, permissions")
    .eq("key", apiKey)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return { valid: false, error: "Invalid API key" }
  }

  return { valid: true, institutionId: data.institution_id, permissions: data.permissions }
}

// GET endpoint to verify a certificate
export async function GET(request: NextRequest) {
  try {
    // Get certificate ID from query params
    const { searchParams } = new URL(request.url)
    const certificateId = searchParams.get("id")

    if (!certificateId) {
      return NextResponse.json({ error: "Certificate ID is required" }, { status: 400 })
    }

    // Validate API key
    const apiKeyValidation = await validateApiKey(request)

    if (!apiKeyValidation.valid) {
      return NextResponse.json({ error: apiKeyValidation.error }, { status: 401 })
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
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
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
      certificateId,
      studentName: blockchainVerified ? blockchainData.studentName : dbCertificate.students.name,
      studentEmail: dbCertificate.students.email,
      courseName: blockchainVerified ? blockchainData.courseName : dbCertificate.course_name,
      issueDate: blockchainVerified ? blockchainData.issueDate : new Date(dbCertificate.issue_date),
      issuerAddress: blockchainVerified
        ? blockchainData.issuerAddress
        : dbCertificate.blockchain_tx?.split(":")[0] || "Unknown",
      institutionName: blockchainVerified ? blockchainData.institutionName : dbCertificate.institutions.name,
      institutionId: dbCertificate.institution_id,
      isValid: blockchainVerified ? blockchainData.isValid : true,
      isRevoked: dbCertificate.is_revoked || false,
      revocationReason: dbCertificate.revocation_reason,
      revocationDate: dbCertificate.revocation_date,
      blockchainVerified,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify?id=${certificateId}`,
    }

    // Log verification
    await supabase.from("certificate_verifications").insert({
      certificate_id: dbCertificate.id,
      verification_method: "api",
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json(certificateData)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST endpoint to issue a certificate
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKeyValidation = await validateApiKey(request)

    if (!apiKeyValidation.valid) {
      return NextResponse.json({ error: apiKeyValidation.error }, { status: 401 })
    }

    // Check permissions
    if (!apiKeyValidation.permissions?.includes("issue")) {
      return NextResponse.json({ error: "API key does not have permission to issue certificates" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { studentName, studentEmail, courseName, issueDate } = body

    // Validate required fields
    if (!studentName || !studentEmail || !courseName) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          requiredFields: ["studentName", "studentEmail", "courseName"],
        },
        { status: 400 },
      )
    }

    const supabase = createServerSupabaseClient()

    // Get institution details
    const { data: institution, error: institutionError } = await supabase
      .from("institutions")
      .select("id, name")
      .eq("id", apiKeyValidation.institutionId)
      .single()

    if (institutionError || !institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 })
    }

    // Generate a unique certificate ID
    const uniqueId = "CERT-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5).toUpperCase()

    // Check if student exists, create if not
    let studentId
    const { data: existingStudent, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("email", studentEmail)
      .single()

    if (studentError) {
      // Create new student
      const { data: newStudent, error: createError } = await supabase
        .from("students")
        .insert({
          name: studentName,
          email: studentEmail,
        })
        .select("id")
        .single()

      if (createError || !newStudent) {
        return NextResponse.json({ error: "Failed to create student record" }, { status: 500 })
      }

      studentId = newStudent.id
    } else {
      studentId = existingStudent.id
    }

    // Issue certificate on blockchain using server's private key
    const tx = await issueCertificateWithPrivateKey(uniqueId, studentName, courseName)

    // Store certificate in Supabase
    const certificateDate = issueDate ? new Date(issueDate) : new Date()
    const { data: certificate, error: certError } = await supabase
      .from("certificates")
      .insert({
        certificate_id: uniqueId,
        student_id: studentId,
        institution_id: institution.id,
        course_name: courseName,
        issue_date: certificateDate.toISOString(),
        blockchain_tx: tx.transactionHash,
      })
      .select()
      .single()

    if (certError) {
      return NextResponse.json({ error: "Failed to store certificate in database" }, { status: 500 })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      certificateId: uniqueId,
      transactionHash: tx.transactionHash,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify?id=${uniqueId}`,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

