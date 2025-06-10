"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Award, Calendar, FileCheck, FileX, Users, Search, Eye, Filter, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function DashboardContent() {
  const router = useRouter()
  const { institutionId } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCertificates: 0,
    certificatesThisMonth: 0,
    totalStudents: 0,
    verificationCount: 0,
    revokedCertificates: 0,
  })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [courseData, setCourseData] = useState<any[]>([])
  const [verificationData, setVerificationData] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [filteredCertificates, setFilteredCertificates] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [certificatesPerPage] = useState(10)

  useEffect(() => {
    if (institutionId) {
      loadDashboardData(institutionId)
    }
  }, [institutionId])

  const loadDashboardData = async (instId: string) => {
    setIsLoading(true)
    try {
      // Get total certificates
      const { count: totalCertificates } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", instId)

      // Get certificates issued this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { count: certificatesThisMonth } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", instId)
        .gte("issue_date", startOfMonth.toISOString())

      // Get unique students
      const { data: students } = await supabase
        .from("certificates")
        .select("student_id")
        .eq("institution_id", instId)
        .order("student_id")
      const uniqueStudents = new Set(students?.map((cert) => cert.student_id))

      // Get revoked certificates
      const { count: revokedCertificates } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", instId)
        .eq("is_revoked", true)

      // Fetch certificate IDs for current institution
      const { data: certificateIdsData } = await supabase
        .from("certificates")
        .select("id")
        .eq("institution_id", instId)

      const certificateIds = certificateIdsData?.map(c => c.id) || []

      // Get verification count
      const { count: verificationCount } = await supabase
        .from("certificate_verifications")
        .select("*", { count: "exact", head: true })
        .in("certificate_id", certificateIds)

      // Get monthly issuance data
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      sixMonthsAgo.setHours(0, 0, 0, 0)
      const { data: monthlyCerts } = await supabase
        .from("certificates")
        .select("issue_date")
        .eq("institution_id", instId)
        .gte("issue_date", sixMonthsAgo.toISOString())
        .order("issue_date")

      const monthlyStats = Array(6)
        .fill(0)
        .map((_, i) => {
          const month = new Date()
          month.setMonth(month.getMonth() - i)
          return {
            month: month.toLocaleString("default", { month: "short" }),
            year: month.getFullYear(),
            count: 0,
          }
        })
        .reverse()

      monthlyCerts?.forEach((cert) => {
        const date = new Date(cert.issue_date)
        const monthIndex = monthlyStats.findIndex(
          (m) =>
            m.month === date.toLocaleString("default", { month: "short" }) &&
            m.year === date.getFullYear()
        )
        if (monthIndex !== -1) {
          monthlyStats[monthIndex].count++
        }
      })

      // Get course distribution
      const { data: courseCerts } = await supabase
        .from("certificates")
        .select("course_name")
        .eq("institution_id", instId)

      const courseCount: Record<string, number> = {}
      courseCerts?.forEach((cert) => {
        courseCount[cert.course_name] = (courseCount[cert.course_name] || 0) + 1
      })

      const courseStats = Object.entries(courseCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      // Get verification stats
      const { data: verifications } = await supabase
        .from("certificate_verifications")
        .select(`
          created_at,
          certificates:certificate_id (
            is_revoked
          )
        `)
        .in("certificate_id", certificateIds)
        .order("created_at", { ascending: false })
        .limit(100)

      const last30Days = new Date()
      last30Days.setDate(last30Days.getDate() - 30)

      const verificationStats = [
        { name: "Last 24 hours", value: 0 },
        { name: "Last 7 days", value: 0 },
        { name: "Last 30 days", value: 0 },
        { name: "All time", value: verifications?.length || 0 },
      ]

      verifications?.forEach((v) => {
        const now = new Date()
        const date = new Date(v.created_at)

        if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
          verificationStats[0].value++
        }

        if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
          verificationStats[1].value++
        }

        if (now.getTime() - date.getTime() < 30 * 24 * 60 * 60 * 1000) {
          verificationStats[2].value++
        }
      })

      // Update state
      setStats({
        totalCertificates: totalCertificates || 0,
        certificatesThisMonth: certificatesThisMonth || 0,
        totalStudents: uniqueStudents.size,
        verificationCount: verificationCount || 0,
        revokedCertificates: revokedCertificates || 0,
      })

      setMonthlyData(monthlyStats)
      setCourseData(courseStats)
      setVerificationData(verificationStats)

      // Get certificates with student details
      const { data: certificatesData } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_id,
          course_name,
          issue_date,
          is_revoked,
          revocation_date,
          revocation_reason,
          students:student_id (name, email)
        `)
        .eq("institution_id", instId)
        .order("issue_date", { ascending: false })

      setCertificates(certificatesData || [])
      setFilteredCertificates(certificatesData || [])

    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and search functionality
  useEffect(() => {
    let filtered = certificates

    if (searchTerm) {
      filtered = filtered.filter(
        (cert) =>
          cert.students?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.certificate_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.course_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((cert) => !cert.is_revoked)
      } else if (statusFilter === "revoked") {
        filtered = filtered.filter((cert) => cert.is_revoked)
      }
    }

    setFilteredCertificates(filtered)
    setCurrentPage(1)
  }, [certificates, searchTerm, statusFilter])

  // Pagination
  const indexOfLastCertificate = currentPage * certificatesPerPage
  const indexOfFirstCertificate = indexOfLastCertificate - certificatesPerPage
  const currentCertificates = filteredCertificates.slice(indexOfFirstCertificate, indexOfLastCertificate)
  const totalPages = Math.ceil(filteredCertificates.length / certificatesPerPage)

  const handleViewCertificate = (certificateId: string) => {
    window.open(`/verify?id=${certificateId}`, "_blank")
  }

  const handleVerifyCertificate = (certificateId: string) => {
    window.open(`/certificate/${certificateId}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Institution Dashboard</h1>
        <p className="text-muted-foreground">Track and analyze your certificate issuance and verification metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Award className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">{stats.totalCertificates}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">{stats.certificatesThisMonth}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileCheck className="h-5 w-5 text-primary mr-2" />
              <div className="text-2xl font-bold">{stats.verificationCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revoked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileX className="h-5 w-5 text-destructive mr-2" />
              <div className="text-2xl font-bold">{stats.revokedCertificates}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="issuance">
        <TabsList className="mb-4">
          <TabsTrigger value="issuance">Certificate Issuance</TabsTrigger>
          <TabsTrigger value="verification">Verification Activity</TabsTrigger>
          <TabsTrigger value="courses">Course Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="issuance">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Certificate Issuance</CardTitle>
              <CardDescription>Number of certificates issued over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value} certificates`, "Issued"]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          return `${label} ${payload[0].payload.year}`
                        }
                        return label
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="Certificates Issued" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Verification Activity</CardTitle>
              <CardDescription>Number of certificate verifications over different time periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={verificationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [`${value} verifications`, "Count"]} />
                    <Bar dataKey="value" fill="#10b981" name="Verifications" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Course Distribution</CardTitle>
              <CardDescription>Distribution of certificates by course or degree</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center justify-center">
              <div className="h-[300px] w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {courseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} certificates`, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full md:w-1/2 mt-4 md:mt-0 grid grid-cols-1 gap-2">
                {courseData.map((course, index) => (
                  <div key={index} className="flex items-center">
                    <div
                      className="h-3 w-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div className="text-sm flex-1 truncate">{course.name}</div>
                    <div className="text-sm font-medium">{course.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certificates Management Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileCheck className="mr-2 h-5 w-5" />
              Certificates Management
            </span>
            <Badge variant="outline">{filteredCertificates.length} certificates</Badge>
          </CardTitle>
          <CardDescription>View, search, and manage all issued certificates</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by student name, certificate ID, or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Certificates</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="revoked">Revoked Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Certificates Table */}
          {currentCertificates.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Certificate ID</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCertificates.map((certificate) => (
                      <TableRow key={certificate.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{certificate.students?.name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">{certificate.students?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">{certificate.certificate_id}</code>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={certificate.course_name}>
                            {certificate.course_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(certificate.issue_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {certificate.is_revoked ? (
                            <Badge variant="destructive">Revoked</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewCertificate(certificate.certificate_id)}
                              title="Verify Certificate"
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyCertificate(certificate.certificate_id)}
                              title="View Certificate"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {indexOfFirstCertificate + 1} to{" "}
                    {Math.min(indexOfLastCertificate, filteredCertificates.length)} of {filteredCertificates.length}{" "}
                    certificates
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = i + 1
                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNumber)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="w-8 h-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No certificates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "No certificates match your current filters."
                  : "You haven't issued any certificates yet."}
              </p>
              {searchTerm || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={() => router.push("/issue")}>Issue Your First Certificate</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end">
        <Button onClick={() => router.push("/issue")}>Issue New Certificate</Button>
      </div>
    </div>
  )
}
