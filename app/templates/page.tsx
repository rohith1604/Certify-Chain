"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Copy, Edit, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getWalletAddress } from "@/lib/contract"
import { supabase } from "@/lib/supabase"

interface Template {
  id: string
  name: string
  description: string
  html_content: string
  created_at: string
  is_default: boolean
}

export default function TemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    html_content: defaultTemplateHTML,
  })
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get wallet address
        const walletAddress = await getWalletAddress()

        // Check if institution exists
        const { data: institution, error } = await supabase
          .from("institutions")
          .select("id")
          .eq("wallet_address", walletAddress)
          .single()

        if (error || !institution) {
          router.push("/login")
          return
        }

        setInstitutionId(institution.id)
        loadTemplates(institution.id)
      } catch (error) {
        console.error("Authentication error:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  const loadTemplates = async (instId: string) => {
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("institution_id", instId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setTemplates(data || [])
    } catch (error) {
      console.error("Error loading templates:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load certificate templates.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!institutionId) return

    setIsSaving(true)

    try {
      // Validate inputs
      if (!newTemplate.name.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Template name is required.",
        })
        return
      }

      // Create template
      const { data, error } = await supabase
        .from("certificate_templates")
        .insert({
          institution_id: institutionId,
          name: newTemplate.name,
          description: newTemplate.description,
          html_content: newTemplate.html_content,
          is_default: templates.length === 0, // Make default if it's the first template
        })
        .select()

      if (error) {
        throw error
      }

      toast({
        title: "Template Created",
        description: "Certificate template has been created successfully.",
      })

      // Reset form and reload templates
      setNewTemplate({
        name: "",
        description: "",
        html_content: defaultTemplateHTML,
      })

      loadTemplates(institutionId)
    } catch (error) {
      console.error("Error creating template:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create certificate template.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!institutionId || !editingTemplate) return

    setIsSaving(true)

    try {
      // Validate inputs
      if (!editingTemplate.name.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Template name is required.",
        })
        return
      }

      // Update template
      const { error } = await supabase
        .from("certificate_templates")
        .update({
          name: editingTemplate.name,
          description: editingTemplate.description,
          html_content: editingTemplate.html_content,
        })
        .eq("id", editingTemplate.id)

      if (error) {
        throw error
      }

      toast({
        title: "Template Updated",
        description: "Certificate template has been updated successfully.",
      })

      // Reset form and reload templates
      setEditingTemplate(null)
      loadTemplates(institutionId)
    } catch (error) {
      console.error("Error updating template:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update certificate template.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!institutionId || !templateToDelete) return

    setIsDeleting(true)

    try {
      // Check if it's the default template
      const templateToDeleteObj = templates.find((t) => t.id === templateToDelete)

      if (templateToDeleteObj?.is_default) {
        // Find another template to make default
        const otherTemplate = templates.find((t) => t.id !== templateToDelete)

        if (otherTemplate) {
          // Make another template default
          await supabase.from("certificate_templates").update({ is_default: true }).eq("id", otherTemplate.id)
        }
      }

      // Delete template
      const { error } = await supabase.from("certificate_templates").delete().eq("id", templateToDelete)

      if (error) {
        throw error
      }

      toast({
        title: "Template Deleted",
        description: "Certificate template has been deleted successfully.",
      })

      // Reset and reload templates
      setTemplateToDelete(null)
      setShowDeleteDialog(false)
      loadTemplates(institutionId)
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete certificate template.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const setDefaultTemplate = async (templateId: string) => {
    if (!institutionId) return

    try {
      // First, reset all templates to non-default
      await supabase.from("certificate_templates").update({ is_default: false }).eq("institution_id", institutionId)

      // Then set the selected template as default
      const { error } = await supabase.from("certificate_templates").update({ is_default: true }).eq("id", templateId)

      if (error) {
        throw error
      }

      toast({
        title: "Default Template Set",
        description: "The selected template is now the default.",
      })

      loadTemplates(institutionId)
    } catch (error) {
      console.error("Error setting default template:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default template.",
      })
    }
  }

  const duplicateTemplate = async (template: Template) => {
    if (!institutionId) return

    try {
      const { error } = await supabase.from("certificate_templates").insert({
        institution_id: institutionId,
        name: `${template.name} (Copy)`,
        description: template.description,
        html_content: template.html_content,
        is_default: false,
      })

      if (error) {
        throw error
      }

      toast({
        title: "Template Duplicated",
        description: "Certificate template has been duplicated successfully.",
      })

      loadTemplates(institutionId)
    } catch (error) {
      console.error("Error duplicating template:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to duplicate certificate template.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Certificate Templates</h1>
        <p className="text-muted-foreground">Create and manage templates for your certificates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Create New Template Card */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
            <CardDescription>Design a new certificate template</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">Create a custom template for your certificates</p>
          </CardContent>
          <CardFooter>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">Create Template</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Certificate Template</DialogTitle>
                  <DialogDescription>
                    Design a new template for your certificates. You can use HTML and CSS to customize the appearance.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g., Standard Certificate"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g., Standard certificate template with logo"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="html_content" className="text-right pt-2">
                      HTML Content
                    </Label>
                    <Textarea
                      id="html_content"
                      value={newTemplate.html_content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, html_content: e.target.value })}
                      className="col-span-3 font-mono text-xs h-[300px]"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" onClick={handleCreateTemplate} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Template"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        {/* Existing Templates */}
        {templates.map((template) => (
          <Card key={template.id} className={template.is_default ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                {template.is_default && (
                  <div className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">Default</div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 h-[150px] overflow-hidden bg-muted/50">
                <div className="text-xs font-mono overflow-hidden text-muted-foreground">
                  {template.html_content.substring(0, 300)}...
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => duplicateTemplate(template)}
                  title="Duplicate Template"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingTemplate(template)}
                  title="Edit Template"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setTemplateToDelete(template.id)
                    setShowDeleteDialog(true)
                  }}
                  title="Delete Template"
                  disabled={templates.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {!template.is_default && (
                <Button variant="secondary" size="sm" onClick={() => setDefaultTemplate(template.id)}>
                  Set as Default
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Certificate Template</DialogTitle>
              <DialogDescription>Modify your certificate template design.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-html_content" className="text-right pt-2">
                  HTML Content
                </Label>
                <Textarea
                  id="edit-html_content"
                  value={editingTemplate.html_content}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, html_content: e.target.value })}
                  className="col-span-3 font-mono text-xs h-[300px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleUpdateTemplate} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this certificate template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Default template HTML
const defaultTemplateHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    .certificate {
      width: 800px;
      height: 600px;
      margin: 0 auto;
      position: relative;
      background-color: #ffffff;
      border: 20px solid #3b82f6;
      padding: 40px;
      box-sizing: border-box;
    }
    .certificate-header {
      text-align: center;
      margin-bottom: 40px;
    }
    .certificate-title {
      font-size: 36px;
      color: #3b82f6;
      margin-bottom: 10px;
      font-weight: bold;
    }
    .certificate-subtitle {
      font-size: 18px;
      color: #64748b;
    }
    .certificate-body {
      text-align: center;
      margin-bottom: 40px;
    }
    .student-name {
      font-size: 30px;
      font-weight: bold;
      margin: 20px 0;
      color: #000000;
    }
    .certificate-text {
      font-size: 16px;
      line-height: 1.5;
      color: #334155;
    }
    .course-name {
      font-size: 24px;
      font-weight: bold;
      margin: 15px 0;
      color: #000000;
    }
    .institution-name {
      font-size: 20px;
      font-weight: bold;
      margin: 15px 0;
      color: #3b82f6;
    }
    .certificate-footer {
      text-align: center;
      margin-top: 40px;
      font-size: 14px;
      color: #64748b;
    }
    .certificate-id {
      font-size: 12px;
      color: #64748b;
      margin-top: 10px;
    }
    .qr-code {
      position: absolute;
      bottom: 40px;
      right: 40px;
      width: 100px;
      height: 100px;
    }
    .issue-date {
      font-size: 14px;
      color: #64748b;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="certificate-header">
      <div class="certificate-title">CERTIFICATE OF COMPLETION</div>
      <div class="certificate-subtitle">This is to certify that</div>
    </div>
    
    <div class="certificate-body">
      <div class="student-name">{{studentName}}</div>
      <div class="certificate-text">has successfully completed the course</div>
      <div class="course-name">{{courseName}}</div>
      <div class="certificate-text">from</div>
      <div class="institution-name">{{institutionName}}</div>
      <div class="issue-date">Issued on: {{issueDate}}</div>
      <div class="certificate-id">Certificate ID: {{certificateId}}</div>
    </div>
    
    <div class="certificate-footer">
      This certificate is verified and secured on the blockchain using Certify Chain.
    </div>
    
    <div class="qr-code">
      <img src="{{qrCodeUrl}}" alt="Verification QR Code" width="100" height="100">
    </div>
  </div>
</body>
</html>
`

