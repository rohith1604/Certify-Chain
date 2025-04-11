"use client"

import { ProtectedRoute } from "@/components/protected-route"
import IssueContent from "./issue-content"

export default function IssuePage() {
  return (
    <ProtectedRoute>
      <IssueContent />
    </ProtectedRoute>
  )
}
