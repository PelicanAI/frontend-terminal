"use client"

import { Card, CardContent } from "@/components/ui/card"
import { User, TrendUp, Shield, Image as ImageIcon, Link } from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

interface Section {
  id: string
  label: string
  icon: Icon
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
                  <Icon size={16} weight="regular" />
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
