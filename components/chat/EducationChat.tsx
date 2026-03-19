'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { GraduationCap, PaperPlaneRight, Trash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { formatLine } from '@/components/chat/message/format-utils'

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
    const scrollContainer = messagesEndRef.current?.parentElement
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
    }
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

      if (!response.ok) {
        const errorMsg = response.status === 401
          ? 'Please sign in to use education chat.'
          : response.status === 429
            ? 'Too many requests. Please wait a moment and try again.'
            : 'Education chat is temporarily unavailable. Try asking your question in the main chat instead.'
        setMessages(prev => [
          ...prev,
          { type: 'bot', content: errorMsg },
        ])
        return
      }

      const data = await response.json()

      if (data.error) {
        setMessages(prev => [
          ...prev,
          { type: 'bot', content: 'Education chat is temporarily unavailable. Try asking your question in the main chat instead.' },
        ])
      } else {
        setMessages(prev => [...prev, { type: 'bot', content: data.reply }])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { type: 'bot', content: "Couldn't connect to education chat. Check your internet connection or try asking in the main chat instead." },
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
    return content
      .split('\n')
      .map((line) => formatLine(line))
      .join('<br />')
  }

  // Placeholder state when no term is selected
  if (!selectedTerm && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <GraduationCap size={40} weight="regular" className="text-blue-500/40 mb-3" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click any highlighted term in the chat to learn about it. Toggle Learning Mode in the chat header.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} weight="regular" className="text-blue-500" />
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
            <Trash size={12} weight="regular" />
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
              {msg.type === 'bot' ? (
                <div
                  className={cn(
                    'max-w-[90%] px-3 py-2 text-xs leading-relaxed rounded-lg',
                    'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-foreground rounded-bl-sm'
                  )}
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(msg.content),
                  }}
                />
              ) : (
                <div
                  className={cn(
                    'max-w-[90%] px-3 py-2 text-xs leading-relaxed rounded-lg',
                    'bg-blue-600 text-white rounded-br-sm'
                  )}
                >
                  {msg.content}
                </div>
              )}
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
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
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
      <div className="border-t border-[var(--border-subtle)] p-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedTerm ? `Ask about ${selectedTerm.term}...` : 'Ask a question...'}
            disabled={isLoading}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              'p-2 rounded-md transition-colors',
              isLoading || !input.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
            )}
          >
            <PaperPlaneRight size={14} weight="regular" />
          </button>
        </form>
        <p className="text-[9px] text-muted-foreground/50 text-center mt-2">
          Powered by Pelican
        </p>
      </div>
    </div>
  )
}
