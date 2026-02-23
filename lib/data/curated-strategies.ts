export interface CuratedStrategy {
  name: string
  slug: string
  description: string
  setup_type: string
  category: 'momentum' | 'mean_reversion' | 'event_driven' | 'options'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  timeframe: string
  market_conditions: string
  entry_rules: string
  exit_rules: string
  risk_rules: string
  checklist: string[]
  recommended_assets: string[]
  best_when: string
  avoid_when: string
  market_type: string
}

export const CURATED_STRATEGIES: CuratedStrategy[] = [
  // ===== MOMENTUM (5) =====
  {
    name: 'Breakout Pullback',
    slug: 'breakout-pullback',
    description:
      'Buy the first pullback after a clean breakout above a well-defined resistance level. Targets continuation of the new trend with a tight stop below the breakout zone.',
    setup_type: 'Breakout',
    category: 'momentum',
    difficulty: 'beginner',
    timeframe: '15m-1h',
    market_conditions: 'Trending market with clear horizontal resistance levels and increasing volume on breakout',
    entry_rules:
      '1. Identify a stock that has broken above a clean horizontal resistance level with at least 1.5x average volume\n2. Wait for price to pull back to the breakout level (old resistance becomes new support)\n3. Enter long when price shows a bullish reversal candle (hammer, engulfing, or inside bar breakout) at the pullback level\n4. Confirm the pullback holds above the breakout level on a closing basis — do not enter if price closes back below\n5. Volume should contract during the pullback and expand on the entry candle',
    exit_rules:
      '1. Take partial profits (50%) at 1:1 risk-reward, move stop to breakeven on remainder\n2. Trail the remaining position using the 9 EMA on your entry timeframe\n3. Exit fully if price closes back below the breakout level\n4. Time stop: exit if the trade has not moved in your favor within 3-5 bars after entry',
    risk_rules:
      '1. Risk no more than 1% of account per trade\n2. Set stop loss 1 ATR below the pullback low or the breakout level, whichever is tighter\n3. Minimum risk-reward ratio of 2:1 before entering\n4. Do not add to losers — if the pullback fails, accept the loss',
    checklist: [
      'Resistance level tested at least 2-3 times before breaking',
      'Breakout candle closed above resistance with strong volume',
      'Pullback volume is declining (healthy consolidation)',
      'Overall market trend is not against the trade (check SPY/QQQ direction)',
      'No major earnings or news catalyst within next 24 hours',
      'Risk-reward is at least 2:1 to the next resistance level',
    ],
    recommended_assets: ['Large-cap stocks', 'SPY', 'QQQ', 'Liquid mid-cap stocks'],
    best_when:
      'Market is in a confirmed uptrend with breadth expanding, and the stock is a leader breaking out of a multi-week or multi-month base.',
    avoid_when:
      'Market is choppy or in a downtrend, the breakout occurs on low volume, or the stock has already extended 5%+ above the breakout level before pulling back.',
    market_type: 'stocks',
  },
  {
    name: 'VWAP Reclaim',
    slug: 'vwap-reclaim',
    description:
      'Go long when price reclaims VWAP from below with confirming volume, signaling institutional buying. A high-probability intraday setup used by professional day traders.',
    setup_type: 'VWAP',
    category: 'momentum',
    difficulty: 'intermediate',
    timeframe: '1m-5m',
    market_conditions: 'Active intraday session with decent volume; works best in the first 2 hours and last hour of trading',
    entry_rules:
      '1. Price must be trading below VWAP and have spent at least 15-30 minutes below it (not a quick dip)\n2. Watch for price to push back above VWAP with a strong candle and volume at least 1.5x the rolling average\n3. Enter long on the first pullback to VWAP after the reclaim — VWAP now acts as support\n4. The reclaim candle should close its body above VWAP, not just wick through\n5. Confirm relative strength: the stock should be reclaiming VWAP while SPY is stable or rising',
    exit_rules:
      '1. First target: previous high of day or the nearest pre-market level\n2. Trail stop using VWAP itself — if price closes a 5-min candle below VWAP, exit\n3. Take profits into any parabolic move (3+ consecutive green candles with expanding range)\n4. Exit before any known catalyst (FOMC, major data release) if in a scalp',
    risk_rules:
      '1. Risk 0.5-1% of account per trade — intraday setups require tighter risk\n2. Stop loss goes below the low of the reclaim candle or 1 ATR below VWAP\n3. Do not take this setup after 3:00 PM ET unless trading the close specifically\n4. Max 2 VWAP reclaim attempts per day on the same stock — if it fails twice, move on',
    checklist: [
      'Price spent meaningful time below VWAP (not just a quick flush)',
      'Reclaim candle has strong volume and closes above VWAP',
      'Overall market (SPY) is not in freefall',
      'No major news or earnings imminent for this stock',
      'Spread is tight (liquid stock with penny-wide spreads)',
      'Risk-reward to HOD or prior level is at least 2:1',
    ],
    recommended_assets: ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMD', 'High-volume large caps'],
    best_when:
      'Stock opened weak but market conditions are improving, creating a mean reversion back to and above VWAP. Works especially well after an overreaction to news.',
    avoid_when:
      'Heavy distribution day with sustained selling, stocks gapping down on genuine fundamental deterioration, or very low-volume midday chop.',
    market_type: 'stocks',
  },
  {
    name: 'Moving Average Bounce',
    slug: 'moving-average-bounce',
    description:
      'Buy when price pulls back to the 20 EMA in a confirmed uptrend and bounces with a reversal candle. A bread-and-butter trend-following setup with clear risk definition.',
    setup_type: 'Trend Following',
    category: 'momentum',
    difficulty: 'beginner',
    timeframe: 'Daily',
    market_conditions: 'Established uptrend with price consistently making higher highs and higher lows above the 20 EMA',
    entry_rules:
      '1. Confirm the stock is in an uptrend: 20 EMA above 50 SMA, price above both\n2. Wait for price to pull back to touch or come within 0.5% of the 20 EMA\n3. Enter long when a bullish reversal candle forms at the 20 EMA (hammer, bullish engulfing, or morning star)\n4. Volume should decrease during the pullback and increase on the reversal candle\n5. RSI(14) should be between 40-60 at the time of the bounce — not overbought',
    exit_rules:
      '1. Initial target: the prior swing high or 2x the risk distance\n2. If target 1 is hit, trail remaining position with a close below the 10 EMA\n3. Exit immediately if price closes below the 50 SMA on daily chart\n4. Take full profit if the stock goes parabolic (3+ days of >3% gains)',
    risk_rules:
      '1. Risk 1% of account per trade\n2. Stop loss placed 1 ATR below the 20 EMA or below the pullback low, whichever is tighter\n3. Require minimum 2:1 reward-to-risk before entering\n4. Do not enter if the stock has already bounced off the 20 EMA 4+ consecutive times (exhaustion risk)',
    checklist: [
      'Stock is in a clear uptrend (20 EMA > 50 SMA, higher highs/lows)',
      'Pullback to 20 EMA is orderly with declining volume',
      'Bullish reversal candle formed at or near the 20 EMA',
      'RSI is not overbought (below 70)',
      'Sector and overall market are supportive (not in risk-off mode)',
    ],
    recommended_assets: ['Large-cap growth stocks', 'SPY', 'QQQ', 'Sector ETFs (XLK, XLF, XLE)'],
    best_when:
      'Broad market is in a healthy uptrend with good breadth, and the stock is a sector leader that institutions are accumulating.',
    avoid_when:
      'Market is in a correction or the 20 EMA is flat/declining. Also avoid if the stock has earnings within a week — the MA bounce can be negated by a gap.',
    market_type: 'stocks',
  },
  {
    name: 'Bull Flag Breakout',
    slug: 'bull-flag-breakout',
    description:
      'Trade the breakout from a bull flag consolidation pattern after a strong impulse move. The flag represents a healthy pause before continuation — a classic momentum pattern.',
    setup_type: 'Pattern Breakout',
    category: 'momentum',
    difficulty: 'intermediate',
    timeframe: '5m-1h',
    market_conditions: 'Stock has made a strong impulsive move (the "pole") and is consolidating in a tight, downward-sloping channel',
    entry_rules:
      '1. Identify a strong impulsive move of at least 3-5% (the flagpole) on heavy volume\n2. The consolidation (flag) should be 3-8 candles long, drifting lower on declining volume\n3. The flag should retrace no more than 38-50% of the pole — deeper retracements invalidate the pattern\n4. Enter on a break above the upper trendline of the flag with volume surging above the flag average\n5. For extra confirmation, wait for the breakout candle to close above the flag before entering',
    exit_rules:
      '1. Measured move target: add the length of the flagpole to the breakout point\n2. Take 50% off at the first resistance level or 1:1 risk-reward\n3. Trail the remainder with a 2-bar low trailing stop\n4. Exit if the breakout reverses and price closes back inside the flag',
    risk_rules:
      '1. Risk 1% of account per trade\n2. Stop loss below the low of the flag pattern\n3. Position size based on the distance from entry to stop\n4. Avoid flags that form after already extended moves (3rd or 4th flag in a trend is lower probability)',
    checklist: [
      'Flagpole shows strong volume expansion (at least 2x average)',
      'Flag consolidation has declining volume',
      'Flag retraces less than 50% of the pole',
      'Overall market direction supports the trade',
      'Breakout volume is increasing as price exits the flag',
      'Pattern is clean and identifiable on the chart',
    ],
    recommended_assets: ['Momentum stocks', 'High-beta large caps', 'TSLA', 'NVDA', 'AMD', 'Growth stocks in play'],
    best_when:
      'Market is trending with risk-on sentiment, the stock has a catalyst driving the initial move, and the flag consolidation is tight and orderly.',
    avoid_when:
      'Market is choppy or declining, the flag is sloppy with wide-ranging bars, or the consolidation has lasted too long (more than 10+ bars suggests the momentum has faded).',
    market_type: 'stocks',
  },
  {
    name: 'Opening Range Breakout',
    slug: 'opening-range-breakout',
    description:
      'Trade the breakout of the first 15-minute opening range. Captures the resolution of early price discovery and often sets the direction for the rest of the session.',
    setup_type: 'Intraday Breakout',
    category: 'momentum',
    difficulty: 'intermediate',
    timeframe: '5m-15m',
    market_conditions: 'Works best on days with a clear catalyst or trend day setup; the 15-minute opening range should be well-defined and not excessively wide',
    entry_rules:
      '1. Mark the high and low of the first 15 minutes of trading (9:30-9:45 AM ET)\n2. Go long on a break above the opening range high, or short on a break below the opening range low\n3. The breakout candle must close beyond the range — do not chase wicks\n4. Volume on the breakout should exceed the average volume during the opening range\n5. Prefer trades in the direction of the overnight/pre-market trend for higher probability',
    exit_rules:
      '1. First target: 1x the height of the opening range from the breakout point\n2. Second target: 2x the opening range height\n3. Trail with the VWAP after taking partial profits — exit if price reclaims VWAP against you\n4. Hard exit at 11:00 AM ET if no significant move has occurred (avoid midday chop)',
    risk_rules:
      '1. Risk 0.5-1% of account per trade\n2. Stop loss at the midpoint of the opening range or the opposite side, depending on range width\n3. If the opening range is wider than 2% of the stock price, skip the trade (risk too large)\n4. Only take one ORB setup per stock per day',
    checklist: [
      'Opening range is well-defined with clear high and low',
      'Range width is reasonable (not excessively wide)',
      'There is a catalyst or clear market direction today',
      'Breakout occurs with volume confirmation',
      'Risk-reward to the measured move target is at least 1.5:1',
      'Not a low-volume, choppy market day',
    ],
    recommended_assets: ['SPY', 'QQQ', 'IWM', 'AAPL', 'TSLA', 'High-volume stocks with catalyst'],
    best_when:
      'There is a clear macro catalyst (economic data, FOMC, earnings season), pre-market price action is one-directional, and the opening range is tight relative to the stock average true range.',
    avoid_when:
      'Pre-market is dead flat with no catalyst, the opening range is choppy and indecisive, or the VIX is extremely low (suggesting a tight, range-bound day).',
    market_type: 'stocks',
  },

  // ===== MEAN REVERSION (4) =====
  {
    name: 'Overextended Fade',
    slug: 'overextended-fade',
    description:
      'Fade extreme moves away from the mean when technical indicators reach exhaustion levels. A counter-trend strategy that profits from the inevitable snapback toward fair value.',
    setup_type: 'Mean Reversion',
    category: 'mean_reversion',
    difficulty: 'advanced',
    timeframe: '1h-4h',
    market_conditions: 'Stock has made an outsized move (3+ standard deviations from its 20-period mean) without a fundamental catalyst to justify the move',
    entry_rules:
      '1. Price must be at least 2.5 standard deviations from the 20-period moving average\n2. RSI(14) must be above 80 (for shorts) or below 20 (for longs)\n3. Wait for a reversal candle — bearish engulfing, shooting star (for shorts), or hammer, bullish engulfing (for longs)\n4. Confirm with volume: the reversal candle should show volume expansion\n5. Check for divergence: price making new extreme while RSI shows lower high (bearish) or higher low (bullish)',
    exit_rules:
      '1. Primary target: the 20-period moving average (the mean)\n2. Take 50% off at the 10-period moving average\n3. Use a 2-ATR trailing stop from the entry point\n4. Exit immediately if the extreme move continues with a new high-volume candle in the original direction',
    risk_rules:
      '1. Risk 0.5% of account — counter-trend trades deserve smaller sizing\n2. Stop loss beyond the extreme of the move plus 0.5 ATR of buffer\n3. Never fade a move driven by genuine fundamental news (earnings, FDA, M&A)\n4. Maximum 1 fade attempt per move — if it fails, the trend is stronger than you think',
    checklist: [
      'Move is statistically extreme (2.5+ standard deviations from mean)',
      'RSI confirms overbought/oversold condition',
      'Reversal candle has formed with volume',
      'No fundamental catalyst justifying the move',
      'Divergence present on RSI or MACD',
      'Position size is reduced for counter-trend trade',
    ],
    recommended_assets: ['Large-cap stocks', 'SPY', 'QQQ', 'IWM', 'Liquid ETFs'],
    best_when:
      'A stock has spiked on retail hype, algo-driven momentum, or a liquidity vacuum with no real fundamental backing. The best fades happen at the end of parabolic moves when volume starts to dry up.',
    avoid_when:
      'The move is driven by real news (earnings beat, acquisition, FDA approval), the trend is young and strong, or the broader market is in a one-directional trend day.',
    market_type: 'stocks',
  },
  {
    name: 'Support Bounce',
    slug: 'support-bounce',
    description:
      'Buy at well-established support levels when price shows rejection and bullish confirmation. A straightforward strategy that uses clear horizontal levels for defined risk.',
    setup_type: 'Support/Resistance',
    category: 'mean_reversion',
    difficulty: 'beginner',
    timeframe: 'Daily-Weekly',
    market_conditions: 'Stock is in a range or uptrend that has pulled back to a level where buyers have historically stepped in',
    entry_rules:
      '1. Identify support that has been tested at least 2-3 times previously and held each time\n2. Wait for price to touch or come within 1% of the support level\n3. Enter long when a bullish reversal candle closes at support (hammer, bullish engulfing, or pin bar)\n4. Volume should show a spike at support (buyers stepping in)\n5. Check that the overall trend is not strongly bearish — support bounces work best in uptrends or ranges',
    exit_rules:
      '1. First target: the midpoint of the recent range or the nearest resistance level\n2. Second target: the top of the range or prior swing high\n3. Exit if price closes below support on a daily basis — the level has failed\n4. Trail stop to breakeven after price moves 1:1 risk-reward in your favor',
    risk_rules:
      '1. Risk 1% of account per trade\n2. Stop loss 1-2% below the support level (enough room to avoid stop runs)\n3. Ensure reward-to-risk is at least 2:1 to the first target\n4. Do not buy support in a stock making new 52-week lows — that support is likely to break',
    checklist: [
      'Support level tested 2+ times previously and held',
      'Bullish reversal candle formed at or near support',
      'Volume increased at the support test (demand showing up)',
      'Stock is not in a strong downtrend (not making new lows)',
      'Broader market is not in panic-sell mode',
    ],
    recommended_assets: ['Large-cap stocks', 'Blue chips', 'SPY', 'QQQ', 'Sector ETFs'],
    best_when:
      'Market is range-bound or in a mild pullback within an uptrend, and the support level aligns with a round number, prior breakout level, or a major moving average.',
    avoid_when:
      'Stock is in a persistent downtrend, the support level is being tested for the 4th or 5th time (each test weakens it), or there is heavy selling volume into support.',
    market_type: 'stocks',
  },
  {
    name: 'Gap Fill',
    slug: 'gap-fill',
    description:
      'Trade the tendency for price gaps to fill by fading the gap direction. Most gaps fill within the same session, making this a reliable intraday mean reversion strategy.',
    setup_type: 'Gap Trading',
    category: 'mean_reversion',
    difficulty: 'intermediate',
    timeframe: '5m-15m',
    market_conditions: 'Stock has gapped up or down at the open without a major fundamental catalyst, and the gap is within a normal range (0.5-3%)',
    entry_rules:
      '1. Identify a gap of at least 0.5% but no more than 3% from the prior close\n2. Wait at least 15 minutes after the open — do not trade the initial chaos\n3. For gap-up fills: short when price shows weakness and breaks below the first 15-min low\n4. For gap-down fills: buy when price shows strength and breaks above the first 15-min high\n5. The gap should NOT be caused by earnings, FDA news, or other fundamental catalysts (these gaps rarely fill quickly)',
    exit_rules:
      '1. Primary target: the prior day close (full gap fill)\n2. Take 50% off at the halfway point of the gap\n3. Use a trailing stop of 0.5 ATR once in profit\n4. Time stop: if the gap has not filled by 12:00 PM ET, take what you have and exit',
    risk_rules:
      '1. Risk 0.5-1% of account\n2. Stop loss beyond the gap extreme (above gap high for short fills, below gap low for long fills)\n3. Skip gaps larger than 3% — they are more likely breakaway gaps that do not fill\n4. Maximum 1 gap fill trade per stock per day',
    checklist: [
      'Gap is between 0.5% and 3% from prior close',
      'No major fundamental catalyst causing the gap',
      'Waited at least 15 minutes after open for direction to establish',
      'Entry is in the gap-fill direction with confirming price action',
      'Risk-reward to the gap fill level is at least 1.5:1',
    ],
    recommended_assets: ['SPY', 'QQQ', 'IWM', 'Large-cap stocks', 'Liquid ETFs'],
    best_when:
      'The gap is driven by overnight futures drift or mild sentiment shift rather than hard news. Gaps in liquid names (SPY, QQQ, mega-caps) fill most reliably.',
    avoid_when:
      'Gap is caused by earnings, M&A, or major macro events. Also avoid on trend days where the gap direction continues relentlessly — if SPY gaps up and the first 15-min candle is very strong, it may be a trend day.',
    market_type: 'stocks',
  },
  {
    name: 'Bollinger Band Squeeze',
    slug: 'bollinger-band-squeeze',
    description:
      'Trade the explosive move that follows a period of low volatility when Bollinger Bands contract. Volatility is cyclical — tight squeezes lead to powerful expansions.',
    setup_type: 'Volatility Breakout',
    category: 'mean_reversion',
    difficulty: 'intermediate',
    timeframe: 'Daily',
    market_conditions: 'Bollinger Band width has contracted to its lowest level in 6+ months, indicating an imminent volatility expansion',
    entry_rules:
      '1. Bollinger Bands (20,2) must be at their narrowest width in at least 120 trading days\n2. Wait for a decisive close outside the upper or lower band after the squeeze\n3. Go long on a close above the upper band; short on a close below the lower band\n4. Volume must expand on the breakout day — at least 1.5x the 20-day average\n5. Confirm direction with the Keltner Channel: the BB must have been inside the KC during the squeeze and now expanding out',
    exit_rules:
      '1. Hold until the opposite Bollinger Band is tagged (price crosses from one band to the other)\n2. Alternatively, take profit at 2x the Bollinger Band width at the time of the squeeze\n3. Trail with the middle band (20 SMA) — exit on a close beyond it against your position\n4. Exit if price reverses back inside the bands within 2 days of the breakout (false breakout)',
    risk_rules:
      '1. Risk 1% of account per trade\n2. Stop loss at the middle band (20 SMA) or the opposite band if the squeeze is very tight\n3. This is a swing trade — be prepared to hold 5-15 days\n4. Reduce size if the squeeze has already fired once recently and you are trying a second entry',
    checklist: [
      'BB width is at 6-month or longer low',
      'Price has been consolidating in a tight range',
      'Breakout candle closes outside the Bollinger Band with volume',
      'Keltner Channel confirms the squeeze (BBs were inside KC)',
      'Trend direction of the breakout aligns with the larger timeframe trend',
    ],
    recommended_assets: ['Large-cap stocks', 'SPY', 'QQQ', 'Sector ETFs', 'Individual stocks in bases'],
    best_when:
      'The squeeze occurs after a long period of consolidation (weeks to months) within a larger trend. The best squeezes fire in the direction of the prevailing trend on the weekly chart.',
    avoid_when:
      'The squeeze is occurring in a choppy, trendless market where false breakouts are common, or if the stock has no volume or catalyst to sustain a move.',
    market_type: 'stocks',
  },

  // ===== EVENT-DRIVEN (4) =====
  {
    name: 'Earnings Momentum Run',
    slug: 'earnings-momentum-run',
    description:
      'Buy stocks that report strong earnings beats with raised guidance before the crowd. The best earnings reactions create multi-week momentum runs as analysts upgrade and funds accumulate.',
    setup_type: 'Earnings',
    category: 'event_driven',
    difficulty: 'advanced',
    timeframe: 'Daily-Weekly',
    market_conditions: 'Earnings season with the stock reporting a significant beat on both revenue and EPS plus raised forward guidance',
    entry_rules:
      '1. Earnings must beat consensus EPS by 10%+ AND revenue must beat estimates\n2. Company must raise forward guidance (this is the most important factor)\n3. Enter on the first pullback after the earnings gap — buy the first 5-10 min pullback intraday, or the first 1-3 day pullback on daily\n4. The stock should gap up at least 3% on the earnings reaction\n5. Post-earnings volume should be at least 2x the 20-day average',
    exit_rules:
      '1. Hold for 2-4 weeks to capture the post-earnings drift and analyst upgrades\n2. Trail stop using the 10 EMA on the daily chart\n3. Take partial profits at 15-20% gain from the earnings close\n4. Exit before the next earnings report unless you want to hold through',
    risk_rules:
      '1. Risk 1-1.5% of account — these are higher-conviction trades\n2. Stop loss below the low of the earnings gap day\n3. If the gap fades completely on day 1, the setup has failed — exit\n4. Do not chase if the stock has already run 15%+ from the earnings gap without pulling back',
    checklist: [
      'EPS beat by 10%+ above consensus',
      'Revenue also exceeded estimates',
      'Forward guidance was raised (critical factor)',
      'Gap is 3%+ on heavy volume',
      'The stock was in an uptrend or base before earnings (not already broken down)',
      'Sector is not in heavy distribution',
    ],
    recommended_assets: ['Growth stocks', 'Tech stocks', 'Mid-to-large cap with strong fundamentals'],
    best_when:
      'It is early in earnings season, the broader market is healthy, and the stock is a sector leader delivering accelerating revenue growth. The best setups have triple plays: EPS beat + revenue beat + raised guidance.',
    avoid_when:
      'Market is in a correction and fading all gaps, the stock is a value trap that beat lowered expectations, or the earnings beat was driven by one-time items rather than core business improvement.',
    market_type: 'stocks',
  },
  {
    name: 'Post-Earnings Gap & Go',
    slug: 'post-earnings-gap-and-go',
    description:
      'Trade the continuation of a post-earnings gap on the opening session. When a stock gaps big on earnings and continues, the intraday move can be substantial.',
    setup_type: 'Earnings Gap',
    category: 'event_driven',
    difficulty: 'intermediate',
    timeframe: '1m-5m',
    market_conditions: 'Stock has gapped significantly (5%+) on earnings and the first 5 minutes of trading show continuation in the gap direction',
    entry_rules:
      '1. Stock must gap at least 5% on earnings results\n2. Watch the first 5-minute candle after the open — it must close in the direction of the gap\n3. Enter on a break above the first 5-minute high (for gap-ups) or below the first 5-min low (for gap-downs)\n4. Pre-market volume should be at least 3x normal, confirming broad interest\n5. The earnings report should be genuinely strong/weak — not just meeting already-high expectations',
    exit_rules:
      '1. First target: the pre-market high (for gap-ups) or pre-market low (for gap-downs)\n2. Trail with the 9 EMA on the 5-minute chart\n3. Take full profits if momentum stalls (3 consecutive inside bars on 5-min)\n4. Hard exit by 11:00 AM ET for intraday trades — post-earnings momentum often fades midday',
    risk_rules:
      '1. Risk 0.5% of account — earnings gaps are volatile\n2. Stop loss below the low of the first 5-minute candle (for longs) or above the high (for shorts)\n3. Use smaller position sizes due to wider spreads in the first 30 minutes\n4. Only trade the most liquid names — avoid small caps with wide spreads on earnings day',
    checklist: [
      'Gap is at least 5% from prior close',
      'Earnings report shows genuine surprise (not priced in)',
      'First 5-minute candle confirms gap direction',
      'Pre-market volume is exceptional (3x+ normal)',
      'Spread is manageable (not wider than 0.1% of stock price)',
    ],
    recommended_assets: ['AAPL', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'Large-cap earnings reporters'],
    best_when:
      'The earnings surprise is genuine and large, pre-market momentum is strong, and the broader market sentiment supports the direction of the gap.',
    avoid_when:
      'The gap is fading in pre-market, the stock is illiquid, or the earnings were "good but not great" — these tend to fade. Also avoid if the market is gapping hard in the opposite direction.',
    market_type: 'stocks',
  },
  {
    name: 'Sector Rotation',
    slug: 'sector-rotation',
    description:
      'Identify and ride the flow of institutional money rotating between sectors. When one sector leads, capital flows are predictable — follow the smart money.',
    setup_type: 'Sector Analysis',
    category: 'event_driven',
    difficulty: 'advanced',
    timeframe: 'Daily-Weekly',
    market_conditions: 'Relative strength divergences between sectors, with clear leadership and lagging sectors on the sector heatmap',
    entry_rules:
      '1. Identify the top 2-3 sectors by relative strength over the past 1-4 weeks using sector ETFs\n2. Within the leading sector, select stocks with the strongest individual relative strength\n3. Enter on pullbacks to the 10 or 20 EMA in the leading sector stocks\n4. Confirm sector rotation with fund flow data — the leading sector should show net inflows\n5. Avoid sectors that have been leading for 6+ months without a pause — late rotation carries higher risk',
    exit_rules:
      '1. Exit when the sector relative strength begins to roll over (breaks below its 20-day RS line)\n2. Rotate proceeds into the next emerging sector leader\n3. Trail individual positions with the 20 EMA on daily\n4. Exit all positions in the sector if it drops from top 3 to bottom 3 in relative strength rankings',
    risk_rules:
      '1. Risk 1% per individual position, max 4% total sector exposure\n2. Diversify across 3-4 names within the leading sector\n3. Use sector ETF as a hedge if holding individual stocks (long stocks, hedge with sector put)\n4. Review sector rankings weekly — rotation can shift quickly during macro events',
    checklist: [
      'Sector is in the top 3 by relative strength over 1-4 weeks',
      'Fund flow data confirms institutional buying in the sector',
      'Individual stock selected is a leader within the sector',
      'Entry is on a pullback, not a chase at highs',
      'Portfolio is not over-concentrated in one sector',
      'Macro backdrop supports the sector thesis (e.g., rate cuts favor growth)',
    ],
    recommended_assets: ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLC', 'XLY', 'XLRE', 'Sector ETFs and their top holdings'],
    best_when:
      'The macro regime is shifting (e.g., Fed pivoting, economic cycle turning), causing clear and sustained rotation from one sector to another. Early identification of the rotation is key.',
    avoid_when:
      'Market is in a broad-based selloff with high correlation across all sectors, or during periods of extreme uncertainty where all sectors are whipsawing together.',
    market_type: 'stocks',
  },
  {
    name: 'FOMC Drift',
    slug: 'fomc-drift',
    description:
      'Trade the well-documented tendency for stocks to drift higher in the hours after FOMC announcements. The post-announcement drift is one of the most studied anomalies in market microstructure.',
    setup_type: 'Macro Event',
    category: 'event_driven',
    difficulty: 'advanced',
    timeframe: '5m-1h',
    market_conditions: 'FOMC announcement day, typically at 2:00 PM ET, with the press conference at 2:30 PM ET',
    entry_rules:
      '1. Wait for the initial FOMC announcement reaction to settle (at least 15 minutes after 2:00 PM ET)\n2. Observe the direction of the initial move — the post-announcement drift typically continues in that direction\n3. Enter long (if initial reaction is bullish) after 2:15-2:30 PM ET when the first pullback occurs\n4. Confirm with internals: NYSE TICK should be positive and advancing stocks should outnumber declining\n5. If the initial reaction is a whipsaw (sharp move in both directions within 15 min), stand aside — no trade',
    exit_rules:
      '1. Primary target: hold into the close for the full afternoon drift\n2. Take partial profits at 3:30 PM ET if sitting on gains\n3. Exit immediately if the drift reverses and price takes out the post-announcement low\n4. If holding overnight, exit at the open the next day — the FOMC drift effect typically fades by then',
    risk_rules:
      '1. Risk 0.5% of account — macro events create unpredictable volatility\n2. Stop loss below the post-announcement low (for longs) with buffer\n3. Reduce position size if VIX is above 25 — wider ranges mean larger potential losses\n4. Only trade the 8 scheduled FOMC meetings per year — do not force this setup',
    checklist: [
      'Today is an FOMC announcement day',
      'Waited at least 15 minutes after the announcement for initial reaction',
      'Initial reaction direction is clear (not a whipsaw)',
      'Market internals support the trade direction',
      'Position size is reduced for macro event volatility',
      'No other conflicting macro data release today',
    ],
    recommended_assets: ['SPY', 'QQQ', 'IWM', 'TLT', '/ES futures', '/NQ futures'],
    best_when:
      'The FOMC decision is in line with expectations and the market likes the forward guidance. The strongest drifts occur when the Fed is dovish relative to expectations.',
    avoid_when:
      'The FOMC delivers a surprise (unexpected rate change, hawkish shock), causing violent two-way action. Also avoid if the pre-announcement move was already large (market may have priced it in).',
    market_type: 'stocks',
  },

  // ===== OPTIONS (5) =====
  {
    name: 'Wheel Strategy',
    slug: 'wheel-strategy',
    description:
      'Generate consistent income by selling cash-secured puts to acquire stock at a discount, then selling covered calls against your shares. A systematic, repeatable income strategy.',
    setup_type: 'Income',
    category: 'options',
    difficulty: 'intermediate',
    timeframe: 'Weekly-Monthly',
    market_conditions: 'Neutral to slightly bullish market on stocks you would be happy to own long-term at the strike price',
    entry_rules:
      '1. Select a stock you genuinely want to own at a lower price — only wheel stocks you believe in fundamentally\n2. Sell a cash-secured put at a strike 5-10% below current price, 30-45 days to expiration\n3. Target premium that represents at least 1-2% of the strike price (annualized 12-24% return)\n4. If assigned, begin selling covered calls at or above your cost basis (strike minus premium received)\n5. Choose high-IV rank stocks (IV rank > 30%) to maximize premium income',
    exit_rules:
      '1. If the put reaches 50% of max profit, buy it back and sell a new one\n2. If assigned on the put, immediately sell a covered call 30-45 DTE at or above your cost basis\n3. If the covered call reaches 50% profit, buy it back and sell a new one\n4. If the stock drops significantly below your put strike, roll the put down and out for a credit',
    risk_rules:
      '1. Only sell puts on stocks you want to own — never wheel speculative garbage\n2. Keep cash reserved equal to 100% of the put obligation (fully cash-secured)\n3. Maximum 5 wheel positions at any time to avoid over-concentration\n4. Do not wheel stocks with earnings within the option expiration period\n5. Total wheel capital should not exceed 40% of your portfolio',
    checklist: [
      'Stock is fundamentally sound and you would own it at the strike price',
      'IV rank is above 30% (elevated premiums)',
      'Option expiration does not span an earnings date',
      'Cash is fully reserved for potential assignment',
      'Premium collected is at least 1% of strike price for the period',
      'Total wheel exposure is within portfolio limits',
    ],
    recommended_assets: ['AAPL', 'MSFT', 'AMD', 'AMZN', 'GOOGL', 'SPY', 'QQQ', 'Blue-chip stocks you want to own'],
    best_when:
      'Market is range-bound or slowly grinding higher, implied volatility is elevated (more premium to collect), and you have conviction in the underlying stocks.',
    avoid_when:
      'Market is in a sharp downtrend (you will keep getting assigned at falling prices), the stock has binary event risk, or implied volatility is very low (not enough premium to justify the risk).',
    market_type: 'options',
  },
  {
    name: 'Iron Condor',
    slug: 'iron-condor',
    description:
      'Sell an out-of-the-money put spread and call spread simultaneously to collect premium. Profits when the stock stays within a range — a pure volatility selling strategy.',
    setup_type: 'Premium Selling',
    category: 'options',
    difficulty: 'advanced',
    timeframe: '30-45 DTE',
    market_conditions: 'Range-bound market with elevated implied volatility that you expect to contract; IV rank above 50% is ideal',
    entry_rules:
      '1. Select an underlying with IV rank above 50% and a defined trading range\n2. Sell the put spread: sell a put at the 16-delta, buy a put 2-5 points lower for protection\n3. Sell the call spread: sell a call at the 16-delta, buy a call 2-5 points higher for protection\n4. Total credit should be at least 1/3 of the width of the widest spread\n5. Expiration should be 30-45 days out to maximize theta decay',
    exit_rules:
      '1. Buy back the entire iron condor at 50% of max profit — do not get greedy\n2. If one side is tested (short strike breached), close the tested side and leave the profitable side on\n3. Roll the tested side further out in time for a credit if possible\n4. Close at 21 DTE if not yet at 50% profit — do not hold into expiration week',
    risk_rules:
      '1. Max loss per iron condor should not exceed 2% of account\n2. Keep position size small — max risk per spread is the width minus the credit received\n3. Do not sell iron condors over earnings or other binary events\n4. Maximum 3-4 iron condors on at any time, diversified across different underlyings\n5. If the underlying moves to your short strike, take action immediately — do not hope',
    checklist: [
      'IV rank is above 50% (elevated volatility to sell)',
      'Stock has been range-bound for the recent period',
      'No earnings or major events within the expiration period',
      'Total credit is at least 1/3 of the spread width',
      'Short strikes are at 16-delta or further OTM',
      'Max loss is within 2% of account',
    ],
    recommended_assets: ['SPY', 'IWM', 'QQQ', 'Large-cap stocks with high IV rank', 'Index ETFs'],
    best_when:
      'IV rank is high (above 50%), the underlying has a clear range, and you expect volatility to decrease. Works best on broad indices which are less likely to make extreme moves.',
    avoid_when:
      'Trending market (either direction), low IV environment (not enough premium), earnings or binary events ahead, or during periods of geopolitical uncertainty that could cause outlier moves.',
    market_type: 'options',
  },
  {
    name: 'LEAPS Diagonal',
    slug: 'leaps-diagonal',
    description:
      'Buy a long-dated LEAPS call as a stock substitute, then sell short-term calls against it for income. Combines the upside of ownership with consistent income generation.',
    setup_type: 'Spread',
    category: 'options',
    difficulty: 'advanced',
    timeframe: 'Weekly-Monthly (short calls) on 12-24 month LEAPS',
    market_conditions: 'Moderately bullish on the underlying with expectation for gradual appreciation over 6-12+ months',
    entry_rules:
      '1. Buy a deep ITM LEAPS call (70-80 delta) with at least 12 months to expiration\n2. The LEAPS should have at least 0.70 delta to behave like a stock substitute\n3. Sell a short-term call (30-45 DTE) against the LEAPS at a strike above the current price\n4. The short call should be 20-30 delta (out of the money)\n5. Net debit for the LEAPS should be recoverable within 6-8 months of short call income',
    exit_rules:
      '1. If the short call reaches 50-75% of max profit, buy it back and sell a new one\n2. If the stock rallies past the short call strike, roll it up and out for a credit\n3. Close the entire position if the LEAPS has less than 90 DTE remaining — roll to a new LEAPS\n4. Take full profit if the LEAPS has doubled in value — re-evaluate the trade thesis',
    risk_rules:
      '1. The cost of the LEAPS is your maximum risk — treat it like a stock position for sizing\n2. Never sell a short call with more delta than your LEAPS (always have positive delta)\n3. Maximum 3-4 diagonal positions to manage complexity\n4. Do not sell short calls through earnings — the gap risk can cause assignment issues\n5. Keep 20% of the LEAPS value in cash as a buffer for rolling',
    checklist: [
      'LEAPS has at least 12 months to expiration',
      'LEAPS delta is 0.70 or higher (deep ITM)',
      'Short call is 20-30 delta (OTM, 30-45 DTE)',
      'Fundamental thesis on the stock supports 6-12 month holding period',
      'No earnings within the short call expiration period',
      'Position size treats LEAPS cost as the max risk',
    ],
    recommended_assets: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'SPY', 'QQQ', 'Blue-chip stocks with uptrend'],
    best_when:
      'You are bullish long-term on a quality stock but want to reduce cost basis through income. Works especially well in a slowly grinding bull market where short calls expire worthless regularly.',
    avoid_when:
      'You expect large, fast moves in the stock (short calls cap your upside), the stock is highly volatile and unpredictable, or you cannot monitor the position regularly to roll short calls.',
    market_type: 'options',
  },
  {
    name: '0DTE Scalp',
    slug: '0dte-scalp',
    description:
      'Scalp same-day expiration options for rapid gains using extreme time decay and gamma. High-risk, high-reward intraday strategy for experienced traders with strict discipline.',
    setup_type: 'Scalp',
    category: 'options',
    difficulty: 'advanced',
    timeframe: '1m-5m',
    market_conditions: 'Active trading session with clear directional momentum or at key technical levels; SPY 0DTE options have the best liquidity',
    entry_rules:
      '1. Trade only SPY, QQQ, or /ES 0DTE options — liquidity is critical for exits\n2. Buy ATM or slightly OTM calls/puts when you identify a clear directional setup (breakout, VWAP reclaim, support/resistance level)\n3. Enter only when the bid-ask spread is no wider than $0.05 on SPY options\n4. Use technical levels (VWAP, prior day high/low, opening range) as entry triggers\n5. Only take setups with at least 2 hours remaining until close — theta crush accelerates in the last hour',
    exit_rules:
      '1. Take profit at 20-30% gain — do NOT get greedy with 0DTE\n2. Cut losses at 30-40% loss — 0DTE options can go to zero quickly\n3. Never hold past 3:30 PM ET unless in a significant profit and trailing\n4. If the trade does not work within 10-15 minutes, exit — time is not on your side',
    risk_rules:
      '1. Risk only what you can lose to zero — max 0.5% of account per trade\n2. Maximum 3 0DTE trades per day — overtrading is the #1 killer\n3. Never average down on 0DTE positions\n4. Use hard stop losses, not mental stops — you will not react fast enough\n5. Only use discretionary capital — never 0DTE with rent money',
    checklist: [
      'Trading SPY, QQQ, or /ES (liquid 0DTE market)',
      'Bid-ask spread is $0.05 or less',
      'Clear directional setup with defined entry trigger',
      'At least 2 hours until market close',
      'Risk is 0.5% of account maximum',
      'Not already at daily trade limit (3 trades)',
    ],
    recommended_assets: ['SPY 0DTE options', 'QQQ 0DTE options', '/ES 0DTE options'],
    best_when:
      'Market is trending with clear direction and you can identify a high-probability entry at a key level. Best on days with a catalyst (economic data, FOMC) that creates directional moves.',
    avoid_when:
      'Market is choppy and range-bound (theta destroys options in ranges), before major news events where direction is uncertain, or when you are emotionally tilted from previous losses.',
    market_type: 'options',
  },
  {
    name: 'Straddle on Volatility',
    slug: 'straddle-on-volatility',
    description:
      'Buy an ATM straddle before high-volatility events to profit from a large move in either direction. You do not need to predict direction — just magnitude.',
    setup_type: 'Volatility',
    category: 'options',
    difficulty: 'intermediate',
    timeframe: '1-7 days before event',
    market_conditions: 'Pending high-impact event (earnings, FDA decision, product launch) where the expected move is underpriced by the options market',
    entry_rules:
      '1. Identify a stock with a pending binary event (earnings, FDA, major product announcement)\n2. Buy an ATM straddle (call + put at the same strike, same expiration) 3-7 days before the event\n3. Choose the expiration closest to but after the event date\n4. Compare the straddle cost to the expected move: the straddle should cost less than the average historical move for this event\n5. IV percentile should ideally be below 70% for the stock — buying straddles at extremely high IV reduces edge',
    exit_rules:
      '1. Close the straddle immediately after the event — within the first 30 minutes of trading\n2. If the move exceeds the straddle cost, take profit on both legs\n3. If one side is profitable and the other is nearly worthless, sell the profitable side immediately\n4. Do NOT hold through IV crush — the entire premium can evaporate even with a directional move\n5. If you bought early (7 days out) and the stock moves before the event, take profit on the winning side',
    risk_rules:
      '1. The total straddle cost is your maximum risk — size accordingly (1-2% of account)\n2. Do not buy straddles when IV is at historical extremes (the move is already priced in)\n3. Only trade straddles on events with historically large moves (8%+ average)\n4. Maximum 2 straddle positions at any time\n5. Accept that some straddles will lose 50-80% of premium — the winners must be large enough to compensate',
    checklist: [
      'Binary event is confirmed and dated',
      'Straddle cost is less than the average historical move for this event',
      'IV is not at historical extremes (some room for expansion)',
      'Expiration is just after the event date',
      'Risk is 1-2% of account maximum',
      'Plan to close within 30 minutes after the event',
    ],
    recommended_assets: ['Biotech stocks (FDA events)', 'Mega-cap earnings (AAPL, NVDA, TSLA)', 'High-volatility stocks with catalyst'],
    best_when:
      'The market is underpricing the potential move — either because the event is unusual, or because the stock has historically moved more than implied by options pricing. Best for FDA decisions and controversial earnings.',
    avoid_when:
      'IV is at extreme highs (market is already pricing in a huge move), the event outcome is largely consensus (small expected surprise), or you cannot exit quickly after the event.',
    market_type: 'options',
  },
]
