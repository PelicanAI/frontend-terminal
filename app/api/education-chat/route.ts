import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10
const MAX_CONTENT_LENGTH = 2000

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000)

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  entry.count++
  return true
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are Pelican's trading education assistant. You explain trading concepts, indicators, chart patterns, and market terminology in clear, simple language for retail traders.

Rules:
- Only discuss trading and financial market concepts
- Use concrete examples with real scenarios (e.g., "If AAPL's RSI hits 75, that means...")
- Keep explanations concise — 2-3 paragraphs max unless user asks for more detail
- When explaining indicators, always mention: what it measures, how to read it, common strategies, and limitations
- Never give specific trading advice or recommendations
- Never say "buy" or "sell" a specific stock
- If asked about non-trading topics, redirect: "I'm focused on trading education. Want to learn about any trading concepts?"
- Use analogies to make complex concepts accessible
- Mention when a concept relates to others (e.g., "RSI is often used alongside MACD to confirm signals")`;

interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  termContext?: string;
}

export async function POST(request: NextRequest) {
  // Rate limit check
  const clientIp = getClientIp(request)
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    )
  }

  try {
    const { message, history = [], termContext }: ChatRequest = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // Check for API key
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Build messages array for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add term context if provided
    if (termContext) {
      messages.push({
        role: 'system',
        content: `The user is currently learning about: ${termContext}. Tailor your responses to this context when relevant.`
      });
    }

    // Add conversation history (last 10 messages)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.type === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.type === 'bot') {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('Education chat OpenAI API error:', errorData);
      return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
    }

    const data = await openaiResponse.json();
    const reply = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply }, {
      headers: { "Cache-Control": "private, no-cache" },
    });

  } catch (error) {
    console.error('Education chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
