"use client"

import { ProtectedRoute } from "@/components/protected-route"
import DashboardContent from "./dashboard-content"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
