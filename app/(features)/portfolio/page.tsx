import dynamicImport from "next/dynamic"

const PortfolioPage = dynamicImport(() => import("./page.client"), { ssr: false })

export const metadata = {
  title: "Portfolio — Pelican Trading AI",
  description: "Your positions, trade history, and behavioral insights",
}

export default function Page() {
  return <PortfolioPage />
}
