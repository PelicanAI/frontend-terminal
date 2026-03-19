"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, FileText, FileXls, Image as ImageIcon, File, ArrowCounterClockwise, WarningCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { IconTooltip } from "@/components/ui/icon-tooltip"

interface AttachmentChipProps {
  name: string
  type: string
  onRemove?: () => void
  onClick?: () => void
  isError?: boolean
  onRetry?: () => void
}

const getFileIcon = (type: string) => {
  const lowerType = type.toLowerCase()
  if (lowerType.includes("csv") || lowerType.includes("xlsx") || lowerType.includes("xls")) {
    return <FileXls size={12} weight="regular" />
  }
  if (
    lowerType.includes("image") ||
    lowerType.includes("png") ||
    lowerType.includes("jpg") ||
    lowerType.includes("jpeg")
  ) {
    return <ImageIcon size={12} weight="regular" />
  }
  if (lowerType.includes("pdf") || lowerType.includes("txt") || lowerType.includes("doc")) {
    return <FileText size={12} weight="regular" />
  }
  return <File size={12} weight="regular" />
}

const getFileTypeLabel = (type: string) => {
  const lowerType = type.toLowerCase()
  if (lowerType.includes("csv")) return "CSV"
  if (lowerType.includes("xlsx")) return "XLSX"
  if (lowerType.includes("xls")) return "XLS"
  if (lowerType.includes("pdf")) return "PDF"
  if (lowerType.includes("png")) return "PNG"
  if (lowerType.includes("jpg") || lowerType.includes("jpeg")) return "JPG"
  if (lowerType.includes("txt")) return "TXT"
  if (lowerType.includes("doc")) return "DOC"
  return type.split("/")[1]?.toUpperCase() || "FILE"
}

const truncateName = (name: string, maxLength = 20) => {
  if (name.length <= maxLength) return name
  const extension = name.split(".").pop()
  const nameWithoutExt = name.substring(0, name.lastIndexOf("."))
  const truncatedName = nameWithoutExt.substring(0, maxLength - (extension?.length || 0) - 4)
  return `${truncatedName}...${extension ? `.${extension}` : ""}`
}

export function AttachmentChip({ name, type, onRemove, onClick, isError, onRetry }: AttachmentChipProps) {
  const truncatedName = truncateName(name)
  const fileTypeLabel = getFileTypeLabel(type)
  const FileIcon = getFileIcon(type)

  if (isError) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 text-xs font-medium",
          "bg-red-50 text-red-700 border-red-200",
          "dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/50",
          "max-w-[200px]",
        )}
      >
        <WarningCircle size={12} weight="regular" />
        <span className="truncate" title="Upload failed">
          Upload failed
        </span>
        {onRetry && (
          <IconTooltip label="Retry upload" side="top">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 w-6 min-h-[44px] min-w-[44px] p-0 ml-1 hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              <ArrowCounterClockwise size={16} weight="regular" />
              <span className="sr-only">Retry upload</span>
            </Button>
          </IconTooltip>
        )}
        {onRemove && (
          <IconTooltip label="Remove attachment" side="top">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="h-6 w-6 min-h-[44px] min-w-[44px] p-0 ml-1 hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              <X size={16} weight="regular" />
              <span className="sr-only">Remove attachment</span>
            </Button>
          </IconTooltip>
        )}
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs font-medium",
        "bg-blue-50 text-blue-700 border-blue-200",
        "dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50",
        "max-w-[200px]",
        onClick && "cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors",
      )}
      onClick={onClick}
    >
      {FileIcon}
      <span className="truncate" title={name}>
        {truncatedName}
      </span>
      <span className="text-[10px] font-semibold opacity-70 ml-1">{fileTypeLabel}</span>
      {onRemove && (
        <IconTooltip label="Remove attachment" side="top">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="h-6 w-6 min-h-[44px] min-w-[44px] p-0 ml-1 hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove attachment</span>
          </Button>
        </IconTooltip>
      )}
    </Badge>
  )
}
