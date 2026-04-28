"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TabIndicator } from "@/components/motion/tab-indicator"

interface Section {
  id: string
  label: string
}

const sections: Section[] = [
  { id: "account", label: "Account" },
  { id: "trading", label: "Trading Preferences" },
  { id: "brokers", label: "Broker Connections" },
  { id: "privacy", label: "Data & Privacy" },
  { id: "images", label: "Uploaded Images" },
]

interface SettingsSidebarProps {
  activeSection: string
  onSectionChange: (id: string) => void
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="lg:col-span-4">
      <Card>
        <CardContent className="p-2">
          <TabIndicator
            tabs={sections}
            activeId={activeSection}
            onChange={onSectionChange}
            className="overflow-x-auto scrollbar-hide whitespace-nowrap"
          />
        </CardContent>
      </Card>
    </div>
  )
}
