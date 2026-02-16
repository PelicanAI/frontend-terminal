"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStoredReferralCode, type ReferralCodeInfo } from "@/lib/referral";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ReferralCodeInputProps {
  onReferralReady: (recordFn: (userId: string) => Promise<void>) => void;
}

export function ReferralCodeInput({ onReferralReady }: ReferralCodeInputProps) {
  const [code, setCode] = useState("");
  const [validationState, setValidationState] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [validatedInfo, setValidatedInfo] = useState<ReferralCodeInfo | null>(null);

  useEffect(() => {
    const stored = getStoredReferralCode();
    if (stored) {
      setCode(stored);
      validateCode(stored);
    }
  }, []);

  useEffect(() => {
    onReferralReady(async (userId: string) => {
      if (!validatedInfo?.valid || !validatedInfo.code_id) return;

      const supabase = createClient();
      const { error } = await supabase.rpc("record_referral", {
        p_user_id: userId,
        p_code_id: validatedInfo.code_id,
      });

      if (error) {
        console.error("Failed to record referral:", error);
      }
    });
  }, [validatedInfo, onReferralReady]);

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
      p_code: trimmed,
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
    const value = e.target.value;
    setCode(value);

    if (!value.trim()) {
      setValidationState("idle");
      setValidatedInfo(null);
      return;
    }

    // Debounce validation
    const timer = setTimeout(() => validateCode(value), 500);
    return () => clearTimeout(timer);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="referral-code" className="text-sm font-medium text-gray-300 ml-1">
        Referral Code (Optional)
      </label>
      <div className="relative">
        <input
          id="referral-code"
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="MAZER"
          className="w-full bg-[#1b1f2b] border border-[#2d3240] rounded-xl py-3 px-4 pr-11 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all uppercase"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {validationState === "loading" && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          )}
          {validationState === "valid" && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {validationState === "invalid" && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
      {validationState === "valid" && validatedInfo && (
        <p className="text-xs text-green-500 ml-1">
          {validatedInfo.type === "affiliate" && validatedInfo.affiliate_name
            ? `Code from ${validatedInfo.affiliate_name}`
            : "Valid referral code"}
          {validatedInfo.discount_percent && validatedInfo.discount_months
            ? ` • ${validatedInfo.discount_percent}% off for ${validatedInfo.discount_months} months`
            : ""}
        </p>
      )}
      {validationState === "invalid" && validatedInfo?.error && (
        <p className="text-xs text-red-500 ml-1">{validatedInfo.error}</p>
      )}
    </div>
  );
}
