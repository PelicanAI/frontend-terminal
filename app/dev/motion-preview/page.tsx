import { MotionPreview } from "./motion-preview"

export default function MotionPreviewPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_DEV_ROUTES !== "true") {
    return <div className="p-8 text-sm text-[var(--muted-foreground)]">Not available in production.</div>
  }

  return <MotionPreview />
}
