"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStoredReferralCode, type ReferralCodeInfo } from "@/lib/referral";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon as CheckCircle,
  CancelCircleIcon as XCircle,
  Loading03Icon as CircleNotch,
} from "@hugeicons/core-free-icons";

interface ReferralCodeInputProps {
  onReferralReady: (recordFn: (userId: string) => Promise<void>) => void;
}

export function ReferralCodeInput({ onReferralReady }: ReferralCodeInputProps) {
  const [code, setCode] = useState("");
  const [validationState, setValidationState] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [validatedInfo, setValidatedInfo] = useState<ReferralCodeInfo | null>(null);

  // Load stored referral code on mount
  useEffect(() => {
    const stored = getStoredReferralCode();
    if (stored) {
      setCode(stored);
      validateCode(stored);
    }
  }, []);

  // Provide record function to parent
  useEffect(() => {
    onReferralReady(async (userId: string) => {
      if (!validatedInfo?.valid || !code.trim()) return;

      const supabase = createClient();
      const { error } = await supabase.rpc("record_referral", {
        p_code: code.toUpperCase().trim(),
        p_user_id: userId,
      });

      if (error) {
        console.error("Failed to record referral:", error);
      }
    });
  }, [validatedInfo, code, onReferralReady]);

  // Debounced validation when code changes
  useEffect(() => {
    if (!code.trim()) {
      setValidationState("idle");
      setValidatedInfo(null);
      return;
    }

    const timer = setTimeout(() => {
      validateCode(code);
    }, 500);

    return () => clearTimeout(timer);
  }, [code]);

  const validateCode = async (inputCode: string) => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      setValidationState("idle");
      setValidatedInfo(null);
      return;
    }

    setValidationState("loading");

    const supabase = createClient();
    const { data, error } = await supabase.rpc("validate_referral_code", {
      input_code: trimmed,
    });

    if (error || !data) {
      setValidationState("invalid");
      setValidatedInfo({ valid: false, error: "Invalid code" });
      return;
    }

    const info = data as ReferralCodeInfo;
    if (info.valid) {
      setValidationState("valid");
      setValidatedInfo(info);
    } else {
      setValidationState("invalid");
      setValidatedInfo(info);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="referral-code" className="text-sm font-medium text-muted-foreground ml-1">
        Referral Code (Optional)
      </label>
      <div className="relative">
        <input
          id="referral-code"
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="MAZER"
          className="w-full bg-background border border-border rounded-xl py-3 px-4 pr-11 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all uppercase"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {validationState === "loading" && (
            <HugeiconsIcon icon={CircleNotch} size={16} className="animate-spin text-muted-foreground" strokeWidth={1.5} color="currentColor" />
          )}
          {validationState === "valid" && (
            <HugeiconsIcon icon={CheckCircle} size={16} className="text-green-500" strokeWidth={1.5} color="currentColor" />
          )}
          {validationState === "invalid" && (
            <HugeiconsIcon icon={XCircle} size={16} className="text-red-500" strokeWidth={1.5} color="currentColor" />
          )}
        </div>
      </div>
      {validationState === "valid" && validatedInfo && (
        <p className="text-xs text-green-600 ml-1">
          {validatedInfo.type === "affiliate" && validatedInfo.affiliate_name
            ? `Code from ${validatedInfo.affiliate_name}`
            : "Valid referral code"}
          {validatedInfo.discount_percent && validatedInfo.discount_months
            ? ` • ${validatedInfo.discount_percent}% off for ${validatedInfo.discount_months} months`
            : ""}
        </p>
      )}
      {validationState === "invalid" && validatedInfo?.error && (
        <p className="text-xs text-destructive ml-1">{validatedInfo.error}</p>
      )}
    </div>
  );
}
