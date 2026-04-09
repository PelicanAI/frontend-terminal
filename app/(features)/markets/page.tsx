import dynamicImport from "next/dynamic"

const MarketsPage = dynamicImport(() => import("./page.client"), { ssr: false })

export const metadata = {
  title: "Markets — Pelican Trading AI",
  description: "Market heatmap, correlations, and earnings calendar",
}

export default function Page() {
  return <MarketsPage />
}
