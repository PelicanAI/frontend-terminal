"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Upload01Icon as UploadSimple,
  Xls01Icon as FileXls,
  File02Icon as FileText,
  Image01Icon as ImageIcon,
} from "@hugeicons/core-free-icons"
import { Card } from "@/components/ui/card"

export function DragDropOverlay() {
  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <Card className="p-8 border-2 border-dashed border-primary/50 bg-primary/5 max-w-md mx-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2">
            <HugeiconsIcon icon={UploadSimple} size={32} className="text-primary" strokeWidth={1.5} color="currentColor" />
            <HugeiconsIcon icon={FileXls} size={32} className="text-primary/70" strokeWidth={1.5} color="currentColor" />
            <HugeiconsIcon icon={FileText} size={32} className="text-primary/70" strokeWidth={1.5} color="currentColor" />
            <HugeiconsIcon icon={ImageIcon} size={32} className="text-primary/70" strokeWidth={1.5} color="currentColor" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-primary">Drop files here</h3>
            <p className="text-sm text-muted-foreground">Upload Excel (.xlsx, .xls), CSV, PDF, images, or text files</p>
            <p className="text-xs text-muted-foreground">Maximum 15MB per file</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
