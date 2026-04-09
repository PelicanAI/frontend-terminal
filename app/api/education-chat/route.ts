import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const MAX_CONTENT_LENGTH = 2000

const educationLimiter = createUserRateLimiter('education-chat', 20, '1 h')

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
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await educationLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const { message, history = [], termContext }: ChatRequest = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // Validate and sanitize history
    if (Array.isArray(history) && history.length > 50) {
      return NextResponse.json({ error: 'History too long' }, { status: 400 })
    }

    const sanitizedHistory = (history || []).slice(-10).map((msg: ChatMessage) => ({
      role: msg.type === 'bot' ? 'assistant' as const : 'user' as const,
      content: typeof msg.content === 'string' ? msg.content.slice(0, 2000) : '',
    }))

    // Check for API key
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Build messages array for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add term context if provided
    if (termContext && typeof termContext === 'string') {
      messages.push({
        role: 'system',
        content: `The user is currently learning about: ${termContext.slice(0, 500)}. Tailor your responses to this context when relevant.`
      });
    }

    // Add sanitized conversation history
    for (const msg of sanitizedHistory) {
      messages.push(msg);
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
      logger.error('Education chat OpenAI API error', undefined, { response: errorData });
      return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
    }

    const data = await openaiResponse.json();
    const reply = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply }, {
      headers: { "Cache-Control": "private, no-cache" },
    });

  } catch (error) {
    logger.error('Education chat API error', error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
