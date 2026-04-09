"use client"

import { Card, CardContent } from "@/components/ui/card"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  UserIcon as User,
  AnalyticsUpIcon as TrendUp,
  Shield01Icon as Shield,
  Image01Icon as ImageIcon,
  Link01Icon as Link,
} from "@hugeicons/core-free-icons"

interface Section {
  id: string
  label: string
  icon: IconSvgElement
}

const sections: Section[] = [
  { id: "account", label: "Account", icon: User },
  { id: "trading", label: "Trading Preferences", icon: TrendUp },
  { id: "brokers", label: "Broker Connections", icon: Link },
  { id: "privacy", label: "Data & Privacy", icon: Shield },
  { id: "images", label: "Uploaded Images", icon: ImageIcon },
]

interface SettingsSidebarProps {
  activeSection: string
  onSectionChange: (id: string) => void
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="lg:col-span-1">
      <Card className="lg:sticky lg:top-24">
        <CardContent className="p-4">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-blue-500/15 text-blue-400 dark:bg-blue-500/20 dark:text-blue-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <HugeiconsIcon icon={Icon} size={16} strokeWidth={1.5} color="currentColor" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </CardContent>
      </Card>
    </div>
  )
}
