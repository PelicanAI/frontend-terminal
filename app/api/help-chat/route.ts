import { NextRequest, NextResponse } from 'next/server';
import { createIpRateLimiter, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const MAX_CONTENT_LENGTH = 2000

const helpLimiter = createIpRateLimiter('help-chat', 10, '1 h')

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are the Pelican Trading help assistant on the pelicantrading.ai website. Your job is to answer questions about Pelican Trading ONLY. You are friendly, concise, and helpful.

## ABOUT PELICAN TRADING

### What It Is
Pelican is "Cursor for Traders" - an AI-powered trading intelligence platform that lets traders analyze markets, backtest strategies, and get insights using plain English instead of code.

### Core Features
- Natural Language Queries: Ask questions like "What caused TSLA to drop yesterday?" or "Compare AAPL vs SPY last quarter" - no code required
- Plain-English Backtesting: Test trading ideas in seconds. Example: "Backtest momentum strategy on SPY, last 6 months" returns win rate, Sharpe ratio, max drawdown
- Context Memory: Remembers your trading style, preferences, and past conversations
- Pattern Detection: Finds market patterns and anomalies you might miss
- One-Click Reports: Generate professional, shareable reports instantly
- Unified Interface: One tool instead of 20 browser tabs

### Data Coverage
- 10,000+ tickers
- Equities, futures, crypto, FX
- Real-time and historical data

### Pricing (Credit-Based)
Pelican uses a credit-based pricing system. Credits represent analytical workload, not raw API calls. Credits reset monthly and do not roll over.

**Subscription Tiers:**
- Starter: $29/month — 1,000 credits (exploration & learning)
- Pro: $99/month — 3,500 credits (active traders)
- Power: $249/month — 10,000 credits (heavy & professional users)

**Credit Costs by Query Type:**
- Conversation/Mentoring (education, coaching): 2 credits
- Simple Price Check (single data point): 10 credits
- Basic Analysis (RSI, MACD, EMA, short comparisons): 25 credits
- Event Study (correlation, event-driven analysis): 75 credits
- Multi-Day Tick Analysis (backtests, institutional flow): 200 credits

**What's Included (all tiers):**
- Live data on 10,000+ tickers
- Plain-English backtesting
- Context memory across sessions
- One-click shareable reports
- All new features as they ship

Every new account gets 10 free questions — no credit card required. After that, choose a subscription plan. System failures automatically refund credits.

**Market Comparison:**
Pelican is ~99% cheaper than institutional terminals:
- Bloomberg Terminal: ~$24,000/year
- Refinitiv Eikon: ~$22,000/year
- FactSet: ~$12,000/year
- Pelican: $348–$2,988/year

### Languages
Available in 30+ languages including: Chinese, Spanish, Japanese, Korean, French, German, Portuguese, Italian, Dutch, Russian, Turkish, Arabic, Polish, and more.

### Team
- Nick Groves - Founder & CEO. 8 years trading experience across futures, equities, FX, and crypto. Background in crypto arbitrage.
- Raymond Campbell - Senior Architect. 20+ years experience. Previously helped architect NYSE ARCA electronic trading systems.

### Current Status
- Now in Beta
- Website: pelicantrading.ai

## YOUR BEHAVIOR RULES

### DO:
- Answer questions about Pelican's features, pricing, data, team, and capabilities
- Be concise - this is a chat widget, keep responses short (2-4 sentences typical)
- Be friendly and conversational
- If someone asks about a feature that doesn't exist, say "Pelican doesn't currently offer that, but I can tell you what it does do..."
- If unsure about something specific, say so honestly

### DO NOT:
- Answer questions unrelated to Pelican (general knowledge, coding help, other products, news, etc.)
- Provide financial advice or trading recommendations
- Make up features not listed above
- Pretend you have access to live market data (you're the help bot, not the actual platform)
- Discuss competitors negatively

### FOR OFF-TOPIC QUESTIONS:
Respond: "I'm here to help with questions about Pelican Trading specifically. Is there anything about our platform, pricing, or features I can help you with?"

## ESCALATION TO HUMAN SUPPORT

Direct users to support@pelicantrading.ai when they have:
- Account access issues or login problems
- Billing questions or payment issues
- Bug reports or technical problems with the platform
- Refund requests
- Complaints or frustration
- Anything you cannot answer after 2 attempts

Escalation phrasing: "For [issue type], please email our team at support@pelicantrading.ai and we'll help you directly."`;

interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export async function POST(request: NextRequest) {
  // Rate limit by IP (public endpoint, no auth)
  const ip = getClientIp(request)
  const { success } = await helpLimiter.limit(ip)
  if (!success) return rateLimitResponse()

  // Reject oversized payloads before parsing
  const contentLength = parseInt(request.headers.get('content-length') || '0')
  if (contentLength > 10000) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  try {
    const { message, history = [] }: ChatRequest = await request.json();

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

    const sanitizedHistory = (history || []).slice(-12).map((msg: ChatMessage) => ({
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
      logger.error('OpenAI API error', undefined, { responseBody: errorData });
      return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
    }

    const data = await openaiResponse.json();
    const reply = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply }, {
      headers: { "Cache-Control": "private, no-cache" },
    });

  } catch (error) {
    logger.error('Chat API error', error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
