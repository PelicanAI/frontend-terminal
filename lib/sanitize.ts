/**
 * Sanitizes user input to prevent XSS attacks
 * Removes potentially dangerous HTML/script content while preserving formatting
 */

import { logger } from '@/lib/logger'

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<embed\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /data:text\/html/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
]

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all)\s+instructions/i,
  /you\s+are\s+now/i,
  /act\s+as\s+if/i,
  /pretend\s+you\s+are/i,
  /system\s+prompt\s*:/i,
  /^(ASSISTANT|HUMAN|SYSTEM)\s*:/im,
  /###\s*(System|Instructions)/i,
  /<\s*\/?\s*(system|instruction|tool_call)\s*>/i,
]

/**
 * Detects potential prompt injection patterns in user input.
 * Detection only — does NOT modify text. Backend sanitizer handles neutralization.
 */
export function detectPromptInjection(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return INJECTION_PATTERNS.some(pattern => pattern.test(text))
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
}

/**
 * Escapes HTML special characters
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Sanitizes user message content
 * - Removes dangerous patterns (scripts, iframes, etc.)
 * - Trims whitespace
 * - Limits length to prevent abuse
 * 
 * NOTE: Does NOT escape HTML entities - we store raw text and let
 * React/DOMPurify handle escaping at render time. This prevents
 * apostrophes from showing as &#x27; in the UI.
 */
export function sanitizeMessage(message: string, maxLength: number = 10000): string {
  if (!message || typeof message !== "string") {
    return ""
  }

  let sanitized = message.trim()

  // Remove dangerous patterns (scripts, iframes, etc.)
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  // Log prompt injection attempts (detection only — backend handles neutralization)
  if (detectPromptInjection(sanitized)) {
    logger.warn('Prompt injection pattern detected in user input')
  }

  // DO NOT escape HTML here - store raw text
  // React auto-escapes text content, and DOMPurify sanitizes HTML content at render time

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitizes filename for uploads
 * - Removes path traversal attempts
 * - Removes dangerous characters
 * - Limits length
 */
export function sanitizeFilename(filename: string, maxLength: number = 255): string {
  if (!filename || typeof filename !== "string") {
    return "unnamed_file"
  }

  let sanitized = filename
    .replace(/\.\./g, "")
    .replace(/[\/\\]/g, "")
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .trim()

  if (sanitized.length === 0) {
    return "unnamed_file"
  }

  if (sanitized.length > maxLength) {
    const ext = sanitized.split(".").pop() || ""
    const name = sanitized.slice(0, maxLength - ext.length - 1)
    sanitized = `${name}.${ext}`
  }

  return sanitized
}

/**
 * Validates and sanitizes URL
 * Only allows http/https protocols
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null
  }

  try {
    const parsed = new URL(url)

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Sanitizes conversation title
 * - Removes newlines and extra whitespace
 * - Limits length
 * 
 * NOTE: Does NOT escape HTML entities - we store raw text and let
 * React handle escaping at render time. This prevents apostrophes
 * from showing as &#x27; in conversation titles.
 */
export function sanitizeTitle(title: string, maxLength: number = 200): string {
  if (!title || typeof title !== "string") {
    return "Untitled"
  }

  let sanitized = title.trim().replace(/[\n\r\t]/g, " ").replace(/\s+/g, " ")

  // DO NOT escape HTML here - store raw text
  // React auto-escapes text content when rendering conversation titles

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + "..."
  }

  return sanitized || "Untitled"
}