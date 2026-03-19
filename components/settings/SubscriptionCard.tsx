"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Lightning, Crown, Warning, CircleNotch } from "@phosphor-icons/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CreditDisplay } from "@/components/credit-display"
import { ManageSubscriptionButton } from "@/components/manage-subscription-button"
import { useCreditsContext } from "@/providers/credits-provider"
import { useToast } from "@/hooks/use-toast"
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

export function SubscriptionCard() {
  const { credits, isSubscribed, isFounder, refetch } = useCreditsContext()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCancelSubscription = async () => {
    setCancelling(true)
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel subscription')
      }

      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully. You&apos;ll retain access until the end of your billing period.",
      })

      // Refresh credits data and UI
      await refetch()
      router.refresh()
      setShowCancelDialog(false)
    } catch (error) {
      console.error('Cancel subscription error:', error)
      toast({
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : "Failed to cancel subscription. Please contact support.",
        variant: "destructive",
      })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription & Usage</CardTitle>
        <CardDescription>Manage your plan and monitor credit usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Badge */}
        <div className="space-y-3">
          <Label>Current Plan</Label>
          {isFounder ? (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500/10 to-orange-500/10 border border-blue-500/20 rounded-lg">
              <Crown size={20} weight="regular" className="text-blue-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-400">
                  Founder Account
                </p>
                <p className="text-sm text-blue-300/80">
                  Unlimited Access - Thank you for your support! 🎉
                </p>
              </div>
            </div>
          ) : credits?.plan && credits.plan !== 'none' ? (
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Lightning size={20} weight="regular" className="text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-blue-600 capitalize">
                  {`${credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)} Plan`}
                </p>
                <p className="text-sm text-blue-700/80">
                  {credits.monthlyAllocation.toLocaleString()} credits per month
                </p>
              </div>
            </div>
          ) : credits?.plan === 'none' && (credits.freeQuestionsRemaining ?? 0) > 0 ? (
            <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Lightning size={20} weight="regular" className="text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-500">
                    Free Trial
                  </p>
                  <p className="text-sm text-amber-600/80">
                    {credits.freeQuestionsRemaining} of 10 free questions remaining
                  </p>
                </div>
              </div>
              <div className="h-2 bg-amber-500/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((10 - credits.freeQuestionsRemaining) / 10) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-amber-600/80">
                {Math.min(
                  100,
                  Math.round(((10 - credits.freeQuestionsRemaining) / 10) * 100)
                )}% used
              </p>
            </div>
          ) : credits?.plan === 'none' && (credits.freeQuestionsRemaining ?? 0) === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-muted border border-border rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Trial Ended
                </p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to continue using Pelican AI
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted border border-border rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  No Active Plan
                </p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to start using Pelican AI
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Credit Balance */}
        {!isFounder && isSubscribed && (
          <>
            <div className="space-y-3">
              <Label>Credit Balance</Label>
              <CreditDisplay variant="detailed" />
            </div>
            <Separator />
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {isSubscribed ? (
            <>
              <ManageSubscriptionButton className="w-full justify-center" />
              <Button asChild variant="outline" className="w-full">
                <Link href="/pricing">
                  <Lightning size={16} weight="regular" className="mr-2" />
                  View All Plans
                </Link>
              </Button>
              {!isFounder && (
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelDialog(true)}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Warning size={16} weight="regular" className="mr-2" />
                  Cancel Subscription
                </Button>
              )}
            </>
          ) : (
            <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <Link href="/pricing">
                <Lightning size={16} weight="regular" className="mr-2" />
                View Plans & Subscribe
              </Link>
            </Button>
          )}
        </div>

        {isSubscribed && !isFounder && (
          <>
            <Separator />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>💡 Credits reset monthly.</strong> Unused credits roll over up to 20% of your plan limit.
              </p>
            </div>
          </>
        )}
      </CardContent>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You&apos;ll retain access until the end of your current billing period.
              <br /><br />
              You can resubscribe anytime to continue using Pelican AI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCancelSubscription()
              }}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {cancelling ? (
                <>
                  <CircleNotch size={16} weight="regular" className="mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Warning size={16} weight="regular" className="mr-2" />
                  Yes, Cancel Subscription
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
