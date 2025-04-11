"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Copy, Key, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { getWalletAddress } from "@/lib/contract"
import { supabase } from "@/lib/supabase"

interface ApiKey {
  id: string
  name: string
  key: string
  permissions: string[]
  is_active: boolean
  created_at: string
  last_used: string | null
}

export default function ApiKeysPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState({
    name: "",
    permissions: ["verify"],
    is_active: true,
  })
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  const permissionOptions = [
    { id: "verify", label: "Verify Certificates" },
    { id: "issue", label: "Issue Certificates" },
    { id: "revoke", label: "Revoke Certificates" },
  ]

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
        loadApiKeys(institution.id)
      } catch (error) {
        console.error("Authentication error:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  const loadApiKeys = async (instId: string) => {
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("institution_id", instId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setApiKeys(data || [])
    } catch (error) {
      console.error("Error loading API keys:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load API keys.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateApiKey = async () => {
    if (!institutionId) return

    setIsCreating(true)

    try {
      // Validate inputs
      if (!newApiKey.name.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "API key name is required.",
        })
        setIsCreating(false)
        return
      }

      // Generate a new API key
      const apiKeyValue = uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "")

      // Create API key
      const { error } = await supabase.from("api_keys").insert({
        institution_id: institutionId,
        name: newApiKey.name,
        key: apiKeyValue,
        permissions: newApiKey.permissions,
        is_active: newApiKey.is_active,
      })

      if (error) {
        throw error
      }

      // Set the generated key for display
      setGeneratedKey(apiKeyValue)

      // Reset form
      setNewApiKey({
        name: "",
        permissions: ["verify"],
        is_active: true,
      })

      // Reload API keys
      loadApiKeys(institutionId)
    } catch (error) {
      console.error("Error creating API key:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create API key.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteApiKey = async () => {
    if (!institutionId || !keyToDelete) return

    setIsDeleting(true)

    try {
      // Delete API key
      const { error } = await supabase.from("api_keys").delete().eq("id", keyToDelete)

      if (error) {
        throw error
      }

      toast({
        title: "API Key Deleted",
        description: "API key has been deleted successfully.",
      })

      // Reset and reload
      setKeyToDelete(null)
      setShowDeleteDialog(false)
      loadApiKeys(institutionId)
    } catch (error) {
      console.error("Error deleting API key:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete API key.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleApiKeyStatus = async (keyId: string, currentStatus: boolean) => {
    if (!institutionId) return

    try {
      // Update API key status
      const { error } = await supabase.from("api_keys").update({ is_active: !currentStatus }).eq("id", keyId)

      if (error) {
        throw error
      }

      toast({
        title: `API Key ${!currentStatus ? "Activated" : "Deactivated"}`,
        description: `API key has been ${!currentStatus ? "activated" : "deactivated"} successfully.`,
      })

      // Reload API keys
      loadApiKeys(institutionId)
    } catch (error) {
      console.error("Error updating API key status:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update API key status.",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to Clipboard",
      description: "API key has been copied to clipboard.",
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"

    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-muted-foreground">Manage API keys for programmatic access to the Certify Chain platform</p>
      </div>

      <div className="flex justify-end mb-6">
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {generatedKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Your new API key has been created. Please copy it now as you won't be able to see it again.
                  </DialogDescription>
                </DialogHeader>

                <div className="my-6 p-4 bg-muted rounded-md font-mono text-sm break-all">{generatedKey}</div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    onClick={() => {
                      setGeneratedKey(null)
                      setShowNewKeyDialog(false)
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for programmatic access to the Certify Chain platform.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newApiKey.name}
                      onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g., Production API Key"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Permissions</Label>
                    <div className="col-span-3 space-y-2">
                      {permissionOptions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`permission-${permission.id}`}
                            checked={newApiKey.permissions.includes(permission.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewApiKey({
                                  ...newApiKey,
                                  permissions: [...newApiKey.permissions, permission.id],
                                })
                              } else {
                                setNewApiKey({
                                  ...newApiKey,
                                  permissions: newApiKey.permissions.filter((p) => p !== permission.id),
                                })
                              }
                            }}
                          />
                          <Label htmlFor={`permission-${permission.id}`}>{permission.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="is_active" className="text-right">
                      Active
                    </Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={newApiKey.is_active}
                        onCheckedChange={(checked) => setNewApiKey({ ...newApiKey, is_active: checked })}
                      />
                      <Label htmlFor="is_active">API key is active</Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" onClick={handleCreateApiKey} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create API Key"
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {apiKeys.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No API Keys</CardTitle>
            <CardDescription>
              You haven't created any API keys yet. Create one to get started with programmatic access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Key className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              API keys allow you to access the Certify Chain API programmatically
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => setShowNewKeyDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className={!apiKey.is_active ? "opacity-70" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{apiKey.name}</CardTitle>
                    <CardDescription>Created on {formatDate(apiKey.created_at)}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`px-2 py-1 text-xs rounded-md ${apiKey.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}
                    >
                      {apiKey.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">API Key</h3>
                    <div className="flex items-center">
                      <div className="font-mono text-sm bg-muted p-2 rounded-md flex-1 truncate">
                        {apiKey.key.substring(0, 8)}•••••••••••••••••••••{apiKey.key.substring(apiKey.key.length - 8)}
                      </div>
                      <Button variant="ghost" size="icon" className="ml-2" onClick={() => copyToClipboard(apiKey.key)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {apiKey.permissions.map((permission) => (
                      <div key={permission} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                        {permission.charAt(0).toUpperCase() + permission.slice(1)}
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">Last used: {formatDate(apiKey.last_used)}</div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setKeyToDelete(apiKey.id)
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>

                <Button
                  variant={apiKey.is_active ? "destructive" : "default"}
                  size="sm"
                  onClick={() => toggleApiKeyStatus(apiKey.id, apiKey.is_active)}
                >
                  {apiKey.is_active ? (
                    <>Deactivate</>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteApiKey} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete API Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

