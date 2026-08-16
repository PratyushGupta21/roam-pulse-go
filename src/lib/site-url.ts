const DEFAULT_PRODUCTION_SITE_URL = "https://roam-pulse-go.vercel.app";

export function getSiteUrl(): string {
  const configuredSiteUrl = import.meta.env["VITE_SITE_URL"] as string | undefined;

  if (configuredSiteUrl && configuredSiteUrl.trim()) {
    return configuredSiteUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }

  return DEFAULT_PRODUCTION_SITE_URL;
}

export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}
