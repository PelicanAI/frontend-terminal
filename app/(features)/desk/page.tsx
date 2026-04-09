import type { Metadata } from "next"
import dynamicImport from "next/dynamic"
import Loading from "./loading"

const DeskPage = dynamicImport(() => import("./page.client"), {
  ssr: false,
  loading: () => <Loading />,
})

export const metadata: Metadata = {
  title: "The Desk — Pelican Trading AI",
  description: "Your trading terminal — chart, positions, watchlist, and AI insights.",
}

export default function Page() {
  return <DeskPage />
}
