"use client";

import { useEffect } from "react";
import { captureReferralFromURL } from "@/lib/referral";

export function ReferralCapture() {
  useEffect(() => {
    captureReferralFromURL();
  }, []);

  return null;
}
