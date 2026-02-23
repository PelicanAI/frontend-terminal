"use client"

import { useState } from "react"
import { Star, ChatCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useRateStrategy } from "@/hooks/use-strategies"
import type { Playbook, StrategyRating } from "@/types/trading"

interface StrategyReviewsProps {
  strategy: Playbook
  ratings: StrategyRating[]
}

export function StrategyReviews({ strategy, ratings }: StrategyReviewsProps) {
  const { rate, isRating } = useRateStrategy()
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (userRating === 0) return
    const result = await rate(strategy.id, userRating, review || undefined)
    if (result.success) setSubmitted(true)
  }

  return (
    <div className="space-y-6">
      {/* Submit review */}
      {!submitted ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Rate this strategy</h3>
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setUserRating(star)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  size={24}
                  weight={(hoverRating || userRating) >= star ? "fill" : "regular"}
                  className={cn(
                    "transition-colors",
                    (hoverRating || userRating) >= star ? "text-amber-400" : "text-[var(--text-muted)]"
                  )}
                />
              </button>
            ))}
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your experience with this strategy (optional)..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={userRating === 0 || isRating}
            className={cn(
              "mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              userRating > 0
                ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed"
            )}
          >
            {isRating ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 text-center">
          <p className="text-sm text-[var(--data-positive)]">Thanks for your review!</p>
        </div>
      )}

      {/* Existing reviews */}
      {ratings.length > 0 ? (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div key={r.id} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={14} weight={r.rating >= star ? "fill" : "regular"} className={r.rating >= star ? "text-amber-400" : "text-[var(--text-disabled)]"} />
                  ))}
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.review && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{r.review}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ChatCircle size={32} weight="thin" className="text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">No reviews yet. Be the first!</p>
        </div>
      )}
    </div>
  )
}
