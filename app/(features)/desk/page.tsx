import type { Metadata } from "next"
import DeskPage from "./page.client"

export const metadata: Metadata = {
  title: "The Desk — Pelican Trading AI",
  description: "Your trading terminal — chart, positions, watchlist, and AI insights.",
}

export default function Page() {
  return <DeskPage />
}
