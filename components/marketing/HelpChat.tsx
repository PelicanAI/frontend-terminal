'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify';
import { formatLine } from '@/components/chat/message/format-utils';

interface Message {
  type: 'user' | 'bot';
  content: string;
}

interface HelpChatProps {
  logoUrl?: string;
}

export default function HelpChat({ logoUrl = '/pelican-logo-transparent.webp' }: HelpChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    const scrollContainer = messagesEndRef.current?.parentElement;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages
        })
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: 'Sorry, something went wrong. Please try again or email support@pelicantrading.ai for help.' 
        }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: 'Sorry, I couldn\'t connect. Please try again or email support@pelicantrading.ai for help.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@pelicantrading.ai';
  };

  const formatMessage = (content: string) => {
    // Use shared formatLine for markdown (headers, bold, lists, etc.)
    let html = content
      .split('\n')
      .map((line) => formatLine(line))
      .join('<br />');
    // Convert email addresses to clickable links
    html = html.replace(
      /support@pelicantrading\.ai/g,
      '<a href="mailto:support@pelicantrading.ai" style="color: var(--primary); text-decoration: underline;">support@pelicantrading.ai</a>'
    );
    return html;
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#7c3aed',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
          transition: 'all 0.2s ease',
          zIndex: 1055,
          pointerEvents: 'auto',
          visibility: 'visible',
          opacity: 1,
        }}
        className="help-chat-btn"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            height: '500px',
            maxHeight: 'calc(100vh - 140px)',
            background: 'var(--card)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 1054,
            fontFamily: "'Geist Sans', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--popover)',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Image
              src={logoUrl}
              alt="Pelican"
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
            />
            <div>
              <div style={{ 
                fontFamily: "'Geist Sans', system-ui, sans-serif",
                fontSize: '18px',
                letterSpacing: '0.05em',
                color: 'var(--foreground)'
              }}>
                Pelican Help
              </div>
              <div style={{ 
                fontFamily: "'Geist Mono', monospace",
                fontSize: '11px',
                color: 'var(--data-positive)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div
                style={{
                  background: 'var(--popover)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                }}
              >
                <div style={{ 
                  fontSize: '14px', 
                  color: 'var(--foreground)',
                  marginBottom: '8px'
                }}>
                  👋 Hi! I&apos;m the Pelican assistant.
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: 'var(--muted-foreground)',
                  lineHeight: '1.5'
                }}>
                  Ask me anything about Pelican Trading—features, pricing, data coverage, or how it works.
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: msg.type === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.type === 'user' ? 'var(--primary)' : 'var(--popover)',
                    color: msg.type === 'user' ? 'var(--primary-foreground)' : 'var(--foreground)',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    border: msg.type === 'user' ? 'none' : '1px solid rgba(148, 163, 184, 0.1)',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: msg.type === 'bot'
                      ? DOMPurify.sanitize(formatMessage(msg.content))
                      : DOMPurify.sanitize(msg.content, { ALLOWED_TAGS: [], KEEP_CONTENT: true })
                  }}
                />
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '12px 16px',
                  borderRadius: '12px 12px 12px 4px',
                  background: 'var(--popover)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        animation: 'bounce 1.4s infinite ease-in-out both',
                        animationDelay: `${i * 0.16}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              background: 'var(--popover)',
            }}
          >
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!isLoading && input.trim()) {
                  sendMessage(e);
                }
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Pelican..."
                disabled={isLoading}
                onContextMenu={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading && input.trim()) {
                      sendMessage(e as unknown as FormEvent);
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'var(--card)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  fontFamily: "'Geist Sans', system-ui, sans-serif",
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '12px 16px',
                  background: isLoading || !input.trim() ? 'var(--muted-foreground)' : '#7c3aed',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>

            {/* Contact support link */}
            <button
              onClick={handleContactSupport}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: 'var(--muted-foreground)',
                fontSize: '12px',
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
              className="help-chat-support-btn"
            >
              Contact Support →
            </button>
          </div>
        </div>
      )}

      {/* Animation + hover styles */}
      <style jsx global>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .help-chat-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 30px rgba(139, 92, 246, 0.5);
        }
        .help-chat-support-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: var(--primary);
          color: var(--foreground);
        }
      `}</style>
    </>
  );
}

