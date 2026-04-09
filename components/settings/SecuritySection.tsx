"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete01Icon as Trash } from "@hugeicons/core-free-icons"
import { logger } from "@/lib/logger"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  clearUserData,
  isValidUUID,
  logRLSError
} from "@/lib/supabase/helpers"
import type { User as SupabaseUser, SupabaseClient } from "@supabase/supabase-js"

interface SecuritySectionProps {
  user: SupabaseUser
  supabase: SupabaseClient
}

export function SecuritySection({ user, supabase }: SecuritySectionProps) {
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false)

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast({ title: "Enter your current password", variant: "destructive" })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" })
      return
    }

    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" })
      return
    }

    if (!user.email) {
      toast({ title: "Missing account email", description: "Please sign in again.", variant: "destructive" })
      return
    }

    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (reauthError) {
        throw reauthError
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast({ title: "Password updated successfully" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      logger.info("Password changed", { userId: user.id })
    } catch (error) {
      logger.error("Failed to change password", error instanceof Error ? error : new Error(String(error)))
      toast({ title: "Failed to change password", description: "Please try again.", variant: "destructive" })
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return

    if (!isValidUUID(user.id)) {
      logger.error("Invalid user ID format")
      toast({ title: "Invalid user session", description: "Please sign in again.", variant: "destructive" })
      return
    }

    try {
      const { results, allSuccess } = await clearUserData(
        supabase,
        user.id,
        ['conversations', 'messages', 'user_settings']
      )

      Object.entries(results).forEach(([table, result]) => {
        if (result.error) {
          logRLSError('delete', table, result.error, { userId: user.id })
        } else {
          logger.info(`Deleted ${result.count} rows from ${table}`, { userId: user.id })
        }
      })

      if (!allSuccess) {
        logger.warn("Some data deletion failed", { results })
      }

      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        logger.error("Failed to sign out after account deletion", signOutError)
      }

      toast({ title: "Account data deleted successfully" })
      router.push("/")
      logger.info("Account deleted", { userId: user.id })
    } catch (error) {
      logger.error("Failed to delete account", error instanceof Error ? error : new Error(String(error)))
      toast({ title: "Failed to delete account", description: "Please contact support.", variant: "destructive" })
    }
  }

  const handleClearHistory = async () => {
    if (!isValidUUID(user.id)) {
      logger.error("Invalid user ID format")
      toast({ title: "Invalid user session", description: "Please sign in again.", variant: "destructive" })
      return
    }

    try {
      const { results, allSuccess } = await clearUserData(
        supabase,
        user.id,
        ['conversations', 'messages']
      )

      Object.entries(results).forEach(([table, result]) => {
        if (result.error) {
          logRLSError('delete', table, result.error, { userId: user.id })
        } else {
          logger.info(`Cleared ${result.count} rows from ${table}`, { userId: user.id })
        }
      })

      if (!allSuccess) {
        toast({ title: "Failed to clear some history", description: "Please try again.", variant: "destructive" })
        return
      }

      toast({ title: "Conversation history cleared" })
      setShowClearHistoryDialog(false)
      logger.info("Conversation history cleared", { userId: user.id })
    } catch (error) {
      logger.error("Failed to clear history", error instanceof Error ? error : new Error(String(error)))
      toast({ title: "Failed to clear history", description: "Please try again.", variant: "destructive" })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Ensure your account stays secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handlePasswordChange} variant="outline">
            Update Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation History</CardTitle>
          <CardDescription>Manage your conversation data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setShowClearHistoryDialog(true)}
            className="w-full"
          >
            <HugeiconsIcon icon={Trash} size={16} className="mr-2" strokeWidth={1.5} color="currentColor" />
            Clear All Conversations
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <HugeiconsIcon icon={Trash} size={16} className="mr-2" strokeWidth={1.5} color="currentColor" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our
              servers.
              <div className="mt-4 space-y-2">
                <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "DELETE"}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear History Dialog */}
      <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your conversations and messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
