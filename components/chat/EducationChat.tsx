'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { GraduationCap, Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import DOMPurify from 'isomorphic-dompurify'

interface EducationChatProps {
  selectedTerm: {
    term: string
    fullName: string
    shortDef: string
    category: string
  } | null
  onClear: () => void
}

interface Message {
  type: 'user' | 'bot'
  content: string
}

export function EducationChat({ selectedTerm, onClear }: EducationChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevTermRef = useRef<string | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // When selectedTerm changes, reset conversation and show intro message
  useEffect(() => {
    if (!selectedTerm) {
      prevTermRef.current = null
      return
    }

    const termKey = selectedTerm.term
    if (termKey !== prevTermRef.current) {
      prevTermRef.current = termKey
      const introMessage = `**${selectedTerm.fullName} (${selectedTerm.term})**\n\n${selectedTerm.shortDef}\n\nAsk me anything about ${selectedTerm.term} — how to use it, common strategies, or what it means for your trades.`
      setMessages([{ type: 'bot', content: introMessage }])
      setInput('')
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [selectedTerm])

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { type: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/education-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          termContext: selectedTerm
            ? `${selectedTerm.fullName} (${selectedTerm.term}) - ${selectedTerm.shortDef}`
            : undefined,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setMessages(prev => [
          ...prev,
          { type: 'bot', content: 'Sorry, something went wrong. Please try again.' },
        ])
      } else {
        setMessages(prev => [...prev, { type: 'bot', content: data.reply }])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { type: 'bot', content: "Sorry, I couldn't connect. Please try again." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setInput('')
    setIsLoading(false)
    prevTermRef.current = null
    onClear()
  }

  const formatMarkdown = (content: string): string => {
    let formatted = content
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br />')
    return formatted
  }

  // Placeholder state when no term is selected
  if (!selectedTerm && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <GraduationCap className="h-10 w-10 text-purple-500/40 mb-3" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click any highlighted term in the chat to learn about it. Toggle Learning Mode in the chat header.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-purple-500" />
          <span className="text-xs font-medium text-foreground">
            {selectedTerm ? selectedTerm.term : 'Education'}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex',
                msg.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[90%] px-3 py-2 text-xs leading-relaxed rounded-lg',
                  msg.type === 'user'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'bg-[var(--surface-2)] border border-white/5 text-foreground rounded-bl-sm'
                )}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    msg.type === 'bot' ? formatMarkdown(msg.content) : msg.content
                  ),
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-[var(--surface-2)] border border-white/5 rounded-lg rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedTerm ? `Ask about ${selectedTerm.term}...` : 'Ask a question...'}
            disabled={isLoading}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex-1 bg-[var(--surface-2)] border border-white/10 rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              'p-2 rounded-md transition-colors',
              isLoading || !input.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-500 cursor-pointer'
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
        <p className="text-[9px] text-muted-foreground/50 text-center mt-2">
          Powered by Pelican
        </p>
      </div>
    </div>
  )
}
