"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { LogOut } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface PrivacySectionProps {
  user: SupabaseUser | null
}

export function PrivacySection({ user }: PrivacySectionProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        logger.error("Failed to log out", error)
        toast.error("Failed to log out. Please try again.")
        return
      }

      toast.success("Logged out successfully")
      logger.info("User logged out", { userId: user?.id })
      router.push('/auth/login')
    } catch (error) {
      logger.error("Logout error", error instanceof Error ? error : new Error(String(error)))
      toast.error("An error occurred during logout")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>Manage your data and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Legal</h4>
            <div className="space-y-1">
              <Button variant="link" asChild className="h-auto p-0 text-purple-600">
                <Link href="/privacy" target="_blank">
                  Privacy Policy
                </Link>
              </Button>
              <br />
              <Button variant="link" asChild className="h-auto p-0 text-purple-600">
                <Link href="/terms" target="_blank">
                  Terms of Service
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {user && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Sign Out</CardTitle>
            <CardDescription>End your session and log out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
