"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { HugeiconsIcon } from "@hugeicons/react"
import { Logout01Icon as SignOut } from "@hugeicons/core-free-icons"
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
        toast({ title: "Failed to log out", description: "Please try again.", variant: "destructive" })
        return
      }

      toast({ title: "Logged out successfully" })
      logger.info("User logged out", { userId: user?.id })
      router.push('/auth/login')
    } catch (error) {
      logger.error("Logout error", error instanceof Error ? error : new Error(String(error)))
      toast({ title: "An error occurred during logout", variant: "destructive" })
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
              <Button variant="link" asChild className="h-auto p-0 text-blue-600">
                <Link href="/privacy" target="_blank">
                  Privacy Policy
                </Link>
              </Button>
              <br />
              <Button variant="link" asChild className="h-auto p-0 text-blue-600">
                <Link href="/terms" target="_blank">
                  Terms of Service
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {user && (
        <Card className="border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-secondary)]">Sign Out</CardTitle>
            <CardDescription>End your session and log out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <HugeiconsIcon icon={SignOut} size={16} className="mr-2" strokeWidth={1.5} color="currentColor" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
