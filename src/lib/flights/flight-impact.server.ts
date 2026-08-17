import { addMinutes, minutesOf } from "../format";
import { buildRecovery, type EngineItem } from "../recovery.server";

export interface AffectedItemAnalysis {
  item: EngineItem;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
  priority: "LOCKED" | "CONFIRMED" | "FLEXIBLE";
  recommendation: "PROTECTED" | "MOVE" | "REPLACE" | "PRESERVE";
  reason: string;
  suggestedNewStart?: string;
}

export interface FlightImpactPlan {
  tripId: string;
  flightNumber: string;
  delayMinutes: number;
  flightStatus: string;
  scheduledArrival: string | null;
  estimatedArrival: string | null;
  travelerAvailableTime: string;
  postFlightBufferMinutes: number;
  affectedAnalyses: AffectedItemAnalysis[];
  highImpactCount: number;
  mediumImpactCount: number;
  protectedCount: number;
  recoveryPayload: ReturnType<typeof buildRecovery>["payload"];
}

/**
 * Server-side Flight Disruption Impact Analyzer.
 * Calculates traveler availability time after flight delay and post-flight buffer (60 min).
 * Evaluates active itinerary items against arrival time window and categorizes impact.
 */
export function analyzeFlightImpact({
  tripId,
  flightNumber,
  delayMinutes,
  flightStatus,
  scheduledArrival,
  estimatedArrival,
  items,
  interests,
  currency,
  maxExtraSpend,
  recoveryMode,
  anchorLat,
  anchorLon,
}: {
  tripId: string;
  flightNumber: string;
  delayMinutes: number;
  flightStatus: string;
  scheduledArrival: string | null;
  estimatedArrival: string | null;
  items: EngineItem[];
  interests: string[];
  currency: string;
  maxExtraSpend: number;
  recoveryMode: "manual" | "assisted" | "autonomous";
  anchorLat: number | null;
  anchorLon: number | null;
}): FlightImpactPlan | null {
  // If flight is on time (delay < 30m) and not cancelled, no disruption analysis needed
  if (delayMinutes < 30 && flightStatus !== "cancelled") {
    return null;
  }

  // Calculate base arrival time
  const arrivalTimeStr = estimatedArrival || scheduledArrival;
  let arrivalTimeIso = arrivalTimeStr ? new Date(arrivalTimeStr) : new Date();
  if (Number.isNaN(arrivalTimeIso.getTime())) {
    arrivalTimeIso = new Date();
  }

  // Add flight delay if estimatedArrival was not provided explicitly
  if (!estimatedArrival && delayMinutes > 0) {
    arrivalTimeIso = new Date(arrivalTimeIso.getTime() + delayMinutes * 60_000);
  }

  // 60-minute post-flight buffer for baggage, customs, transfer, and hotel check-in
  const bufferMinutes = 60;
  const availableTimeIso = new Date(arrivalTimeIso.getTime() + bufferMinutes * 60_000);

  // Format times as HH:MM strings for comparison
  const arrivalHHMM = arrivalTimeIso.toISOString().slice(11, 16);
  const availableHHMM = availableTimeIso.toISOString().slice(11, 16);
  const availableMinutes = minutesOf(availableHHMM);

  // Filter active items for the arrival day/date
  const activeItems = items.filter((i) => i.status !== "replaced" && i.status !== "completed");
  const affectedAnalyses: AffectedItemAnalysis[] = [];

  let highImpactCount = 0;
  let mediumImpactCount = 0;
  let protectedCount = 0;

  for (const item of activeItems) {
    const itemStartMin = minutesOf(item.start_time);
    const itemEndMin = minutesOf(item.end_time);

    const priority: "LOCKED" | "CONFIRMED" | "FLEXIBLE" = item.is_locked
      ? "LOCKED"
      : item.status === "confirmed"
        ? "CONFIRMED"
        : "FLEXIBLE";

    // Item starts before traveler is available
    if (itemStartMin < availableMinutes && itemEndMin > minutesOf(arrivalHHMM) - 30) {
      if (item.is_locked) {
        protectedCount++;
        affectedAnalyses.push({
          item,
          impactLevel: "HIGH",
          priority: "LOCKED",
          recommendation: "PROTECTED",
          reason: `Locked activity "${item.title}" starts at ${item.start_time}, but traveler availability is ${availableHHMM}. Preserved per user lock lock.`,
        });
      } else if (priority === "CONFIRMED") {
        highImpactCount++;
        affectedAnalyses.push({
          item,
          impactLevel: "HIGH",
          priority: "CONFIRMED",
          recommendation: "MOVE",
          reason: `Confirmed activity "${item.title}" (${item.start_time}) overlaps flight delay window. Recommend shifting to ${addMinutes(availableHHMM, 15)}.`,
          suggestedNewStart: addMinutes(availableHHMM, 15),
        });
      } else {
        highImpactCount++;
        affectedAnalyses.push({
          item,
          impactLevel: "HIGH",
          priority: "FLEXIBLE",
          recommendation: "REPLACE",
          reason: `Flexible activity "${item.title}" (${item.start_time}) is unreachable due to flight delay. Recommend replacing or shifting.`,
          suggestedNewStart: addMinutes(availableHHMM, 15),
        });
      }
    }
    // Item starts within 30-minute buffer after availability (compressed travel window)
    else if (itemStartMin >= availableMinutes && itemStartMin < availableMinutes + 30) {
      if (item.is_locked) {
        protectedCount++;
        affectedAnalyses.push({
          item,
          impactLevel: "MEDIUM",
          priority: "LOCKED",
          recommendation: "PROTECTED",
          reason: `Locked activity "${item.title}" starts at ${item.start_time} (tight 30m buffer). Preserved per user lock.`,
        });
      } else {
        mediumImpactCount++;
        affectedAnalyses.push({
          item,
          impactLevel: "MEDIUM",
          priority,
          recommendation: "MOVE",
          reason: `Compressed transfer buffer before "${item.title}" (${item.start_time}). Recommend shifting 20m later.`,
          suggestedNewStart: addMinutes(item.start_time, 20),
        });
      }
    }
  }

  // Generate recovery recommendation payload using existing buildRecovery engine
  const { payload: recoveryPayload } = buildRecovery(activeItems, {
    type: "flight_delay",
    minutesLost: delayMinutes || 120,
    fromTime: arrivalHHMM,
    interests,
    currency,
    maxExtraSpend,
    recoveryMode,
    anchorLat,
    anchorLon,
  });

  return {
    tripId,
    flightNumber,
    delayMinutes,
    flightStatus,
    scheduledArrival,
    estimatedArrival: arrivalTimeIso.toISOString(),
    travelerAvailableTime: availableHHMM,
    postFlightBufferMinutes: bufferMinutes,
    affectedAnalyses,
    highImpactCount,
    mediumImpactCount,
    protectedCount,
    recoveryPayload,
  };
}
