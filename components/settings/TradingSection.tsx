"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { PressScale } from "@/components/motion/press-scale"
import type { UserSettings } from "./types"
import { POPULAR_TICKERS } from "./types"

interface TradingSectionProps {
  settings: UserSettings
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void
}

export function TradingSection({ settings, updateSetting }: TradingSectionProps) {
  const [tickerInput, setTickerInput] = useState("")

  const addTicker = () => {
    if (!tickerInput.trim()) return

    const ticker = tickerInput.trim().toUpperCase()
    if (!settings.favorite_tickers.includes(ticker)) {
      updateSetting("favorite_tickers", [...settings.favorite_tickers, ticker])
      setTickerInput("")
    }
  }

  const removeTicker = (ticker: string) => {
    updateSetting(
      "favorite_tickers",
      settings.favorite_tickers.filter((t) => t !== ticker)
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Timeframes</CardTitle>
          <CardDescription>Select your preferred trading timeframes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"].map((tf) => (
              <div key={tf} className="flex items-center space-x-2">
                <Checkbox
                  id={`tf-${tf}`}
                  checked={settings.default_timeframes.includes(tf)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateSetting("default_timeframes", [...settings.default_timeframes, tf])
                    } else {
                      updateSetting(
                        "default_timeframes",
                        settings.default_timeframes.filter((t) => t !== tf)
                      )
                    }
                  }}
                />
                <Label htmlFor={`tf-${tf}`} className="cursor-pointer">
                  {tf}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Markets</CardTitle>
          <CardDescription>Choose the markets you trade most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {["stocks", "options", "futures", "crypto"].map((market) => (
              <div key={market} className="flex items-center space-x-2">
                <Checkbox
                  id={`market-${market}`}
                  checked={settings.preferred_markets.includes(market)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateSetting("preferred_markets", [...settings.preferred_markets, market])
                    } else {
                      updateSetting(
                        "preferred_markets",
                        settings.preferred_markets.filter((m) => m !== market)
                      )
                    }
                  }}
                />
                <Label htmlFor={`market-${market}`} className="cursor-pointer capitalize">
                  {market}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Tolerance</CardTitle>
          <CardDescription>Define your trading risk profile</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.risk_tolerance}
            onValueChange={(value) =>
              updateSetting("risk_tolerance", value as "conservative" | "moderate" | "aggressive")
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="conservative" id="conservative" />
              <Label htmlFor="conservative" className="cursor-pointer">
                Conservative - Lower risk, steady returns
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="moderate" id="moderate" />
              <Label htmlFor="moderate" className="cursor-pointer">
                Moderate - Balanced risk and reward
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="aggressive" id="aggressive" />
              <Label htmlFor="aggressive" className="cursor-pointer">
                Aggressive - Higher risk, higher potential returns
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favorite Tickers</CardTitle>
          <CardDescription>Add tickers you frequently trade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === "Enter" && addTicker()}
              placeholder="Enter ticker symbol (e.g., AAPL)"
              maxLength={10}
            />
            <PressScale>
              <Button onClick={addTicker} variant="outline">
                Add
              </Button>
            </PressScale>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.favorite_tickers.map((ticker) => (
              <div
                key={ticker}
                className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full"
              >
                <span className="font-medium">{ticker}</span>
                <button
                  onClick={() => removeTicker(ticker)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Popular tickers:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TICKERS.filter((t) => !settings.favorite_tickers.includes(t))
                .slice(0, 8)
                .map((ticker) => (
                  <PressScale key={ticker}>
                    <button
                      onClick={() => {
                        updateSetting("favorite_tickers", [...settings.favorite_tickers, ticker])
                      }}
                      className="px-2 py-1 text-sm border border-border rounded hover:bg-muted"
                    >
                      + {ticker}
                    </button>
                  </PressScale>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
