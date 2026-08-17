export function formatMoney(amount: number, currency = "INR") {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return `${currency} 0`;
  }
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export type PriceStatus = "free" | "estimated" | "live" | "unavailable";

export interface ActivityPriceDisplay {
  label: string;
  status: PriceStatus;
  numericAmount: number | null;
}

/**
 * Checks whether an activity is explicitly known to be free based on its title or category.
 * (e.g. public viewpoints, promenade walks, free beaches, public parks, self-guided walking, photo spots).
 */
export function isExplicitlyFreeActivity(title?: string | null, category?: string | null): boolean {
  if (!title && !category) return false;
  const str = `${title ?? ""} ${category ?? ""}`.toLowerCase();
  return (
    str.includes("free") ||
    str.includes("viewpoint") ||
    str.includes("promenade") ||
    str.includes("sunset view") ||
    str.includes("public beach") ||
    str.includes("public park") ||
    str.includes("self-guided") ||
    str.includes("orientation walk") ||
    str.includes("photo spot") ||
    str.includes("check-in") ||
    str.includes("rest hour")
  );
}

/**
 * Formats an activity price strictly adhering to RoamPulse pricing semantics:
 * - Free -> "Free"
 * - Estimated -> "~₹500 estimated"
 * - Live -> "₹800 live"
 * - Unavailable -> "Price unavailable"
 *
 * NEVER displays "₹0" or "$0" for an activity.
 */
export function formatActivityPrice(
  cost: number | null | undefined,
  currency = "INR",
  isLive = false,
  isExplicitFree?: boolean,
  title?: string,
  category?: string,
  costMin?: number | null,
  costMax?: number | null,
  costType?: string | null,
): ActivityPriceDisplay {
  const isFree =
    costType === "free" ||
    isExplicitFree ||
    (cost === 0 && isExplicitlyFreeActivity(title, category));

  if (isFree) {
    return {
      label: "Free",
      status: "free",
      numericAmount: 0,
    };
  }

  if (cost === null || cost === undefined || Number.isNaN(cost) || (cost === 0 && !isFree)) {
    return {
      label: "Price unavailable",
      status: "unavailable",
      numericAmount: null,
    };
  }

  if (costMin && costMax && costMax > costMin) {
    const minFormatted = formatMoney(costMin, currency);
    const maxFormatted = formatMoney(costMax, currency);
    const typeLabel = costType === "listed" ? "listed" : "estimated";
    return {
      label: `~${minFormatted} – ${maxFormatted} ${typeLabel}`,
      status: costType === "listed" ? "live" : "estimated",
      numericAmount: Math.round((costMin + costMax) / 2),
    };
  }

  const formattedMoney = formatMoney(cost, currency);

  if (isLive || costType === "listed") {
    return {
      label: `${formattedMoney} listed`,
      status: "live",
      numericAmount: cost,
    };
  }

  return {
    label: `~${formattedMoney} estimated`,
    status: "estimated",
    numericAmount: cost,
  };
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "--:--";
  const [h, m] = value.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function parseDateParts(
  dateStr: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.slice(0, 10);
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function formatDateStr(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(
  value: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
) {
  if (!value) return "";
  if (typeof value === "string") {
    const parts = parseDateParts(value);
    if (parts) {
      const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "UTC",
        month: opts?.month ?? "short",
        day: opts?.day ?? "numeric",
        ...opts,
      }).format(utcDate);
    }
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", opts ?? { month: "short", day: "numeric" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function daysBetween(start: string, end: string) {
  const pStart = parseDateParts(start);
  const pEnd = parseDateParts(end);
  if (!pStart || !pEnd) return 1;
  const a = Date.UTC(pStart.year, pStart.month - 1, pStart.day);
  const b = Date.UTC(pEnd.year, pEnd.month - 1, pEnd.day);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

export function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.max(0, Math.min(23 * 60 + 59, (h ?? 0) * 60 + (m ?? 0) + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
