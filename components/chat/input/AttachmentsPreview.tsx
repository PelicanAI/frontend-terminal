"use client"

import { motion } from "framer-motion"
import { AttachmentChip } from "../attachment-chip"
import type { Attachment, PendingAttachment } from "./types"

interface AttachmentsPreviewProps {
  attachments: Attachment[]
  pendingAttachments: PendingAttachment[]
  onRemoveAttachment?: (index: number) => void
  onRetryAttachment?: (id: string) => void
}

export function AttachmentsPreview({
  attachments,
  pendingAttachments,
  onRemoveAttachment,
  onRetryAttachment,
}: AttachmentsPreviewProps) {
  if (attachments.length === 0 && pendingAttachments.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2"
    >
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment, index) => (
          <AttachmentChip
            key={index}
            name={attachment.name}
            type={attachment.type}
            onRemove={onRemoveAttachment ? () => onRemoveAttachment(index) : undefined}
          />
        ))}
        {pendingAttachments.map((pendingAttachment, pendingIdx) => (
          <AttachmentChip
            key={pendingAttachment.id}
            name={pendingAttachment.file.name}
            type={pendingAttachment.file.type}
            isError={pendingAttachment.isError}
            onRetry={onRetryAttachment ? () => onRetryAttachment(pendingAttachment.id) : undefined}
            onRemove={
              onRemoveAttachment
                ? () => onRemoveAttachment(attachments.length + pendingIdx)
                : undefined
            }
          />
        ))}
      </div>
    </motion.div>
  )
}
