export interface Attachment {
  name: string
  type: string
  url: string
}

export interface PendingAttachment {
  file: File
  isError?: boolean
  id: string
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void
  onFileUpload?: (files: File[]) => void
  disabled?: boolean
  canSend?: boolean
  disabledSend?: boolean
  onQueueMessage?: (message: string) => void
  queueEnabled?: boolean
  placeholder?: string
  isDarkMode?: boolean
  onTypingDuringResponse?: () => void
  isAIResponding?: boolean
  onThemeChange?: (isDark: boolean) => void
  attachments?: Attachment[]
  onRemoveAttachment?: (index: number) => void
  pendingAttachments?: PendingAttachment[]
  onRetryAttachment?: (id: string) => void
  pendingDraft?: string | null
  onCancelDraft?: () => void
  onStopResponse?: () => void
}

export interface ChatInputRef {
  focus: () => void
}
