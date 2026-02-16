/**
 * Pelican AI - Referral Code Utilities
 * Pure utility functions. No Supabase dependency.
 */

// ============================================
// TYPES
// ============================================

export interface ReferralCodeInfo {
  valid: boolean;
  code?: string;
  code_id?: string;
  type?: 'affiliate' | 'user_referral';
  discount_percent?: number;
  discount_months?: number;
  affiliate_name?: string;
  affiliate_company?: string;
  error?: string;
}

export interface RecordReferralResult {
  success: boolean;
  referral_id?: string;
  discount_percent?: number;
  discount_months?: number;
  error?: string;
}

// ============================================
// COOKIE HELPERS
// ============================================

const REFERRAL_COOKIE = 'pelican_ref';
const UTM_COOKIE = 'pelican_utm';
const REFERRAL_EXPIRY_DAYS = 30;

export function storeReferralCode(code: string): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setDate(expires.getDate() + REFERRAL_EXPIRY_DAYS);
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code.toUpperCase().trim())};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export function getStoredReferralCode(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export function clearStoredReferralCode(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REFERRAL_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// ============================================
// UTM HELPERS
// ============================================

export function storeUTMParams(utm: { source?: string; medium?: string; campaign?: string }): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setDate(expires.getDate() + REFERRAL_EXPIRY_DAYS);
  document.cookie = `${UTM_COOKIE}=${encodeURIComponent(JSON.stringify(utm))};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export function getStoredUTMParams(): { source?: string; medium?: string; campaign?: string } | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${UTM_COOKIE}=([^;]*)`));
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function clearStoredUTMParams(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${UTM_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// ============================================
// URL CAPTURE
// ============================================

export function captureReferralFromURL(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref') || params.get('referral') || params.get('promo');

  if (code && code.trim()) {
    const normalized = code.toUpperCase().trim();
    storeReferralCode(normalized);

    const source = params.get('utm_source');
    const medium = params.get('utm_medium');
    const campaign = params.get('utm_campaign');
    if (source || medium || campaign) {
      storeUTMParams({
        source: source || undefined,
        medium: medium || undefined,
        campaign: campaign || undefined,
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    url.searchParams.delete('referral');
    url.searchParams.delete('promo');
    window.history.replaceState({}, '', url.toString());

    return normalized;
  }

  return getStoredReferralCode();
}
