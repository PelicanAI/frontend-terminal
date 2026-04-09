"use client"

import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon as Copy } from "@hugeicons/core-free-icons"
import { m } from "framer-motion"
import DOMPurify from "isomorphic-dompurify"

interface CodeBlockProps {
  content: string
  language?: string
  index: number
}

export function CodeBlock({ content, language, index }: CodeBlockProps) {
  const sanitizedCode = DOMPurify.sanitize(content)

  return (
    <m.div
      key={`code-${index}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={cn(
        "relative group my-3 rounded-lg border overflow-hidden font-mono",
        "bg-muted/30 border-border",
        "max-w-full overflow-x-auto"
      )}
    >
      <div className="relative">
        <div className="p-3 text-[13px] sm:text-sm overflow-x-auto whitespace-pre max-w-full leading-[1.5]">
          <code>{sanitizedCode}</code>
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-muted/30 via-muted/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />

        {language && (
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            {language}
          </span>
        )}
        <button
          type="button"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-11 w-11 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
          onClick={() => navigator.clipboard.writeText(content)}
          aria-label="Copy code"
        >
          <HugeiconsIcon icon={Copy} size={20} className="sm:hidden" strokeWidth={1.5} color="currentColor" /><HugeiconsIcon icon={Copy} size={16} className="hidden sm:block" strokeWidth={1.5} color="currentColor" />
        </button>
      </div>
    </m.div>
  )
}
